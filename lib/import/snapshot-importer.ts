/**
 * Snapshot Import Service
 * Imports validated snapshot rows into the database.
 * - Auto-creates holdings if they don't exist
 * - Checks for duplicate snapshots (same holding + date)
 * - Creates contributions record if employer/employee contrib provided
 * - Returns import summary
 */

import { db } from '@/lib/db';
import {
  holdings,
  snapshots,
  contributions,
  type NewHolding,
  type NewSnapshot,
  type NewContribution,
} from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { type SnapshotRow } from './validators/snapshot-validator';

export interface ImportError {
  row: number;
  message: string;
  data?: SnapshotRow;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// Snapshot holding types (super, cash, debt)
type SnapshotHoldingType = 'super' | 'cash' | 'debt';

/**
 * Determines the holding type based on fund name.
 * - Names containing "super", "retirement", or "pension" are treated as super
 * - Names containing "debt", "loan", "credit", "mortgage" are treated as debt
 * - Otherwise treated as cash
 */
function determineHoldingType(fundName: string): SnapshotHoldingType {
  const lowerName = fundName.toLowerCase();

  // Check for super-related keywords
  if (
    lowerName.includes('super') ||
    lowerName.includes('retirement') ||
    lowerName.includes('pension') ||
    lowerName.includes('kiwisaver')
  ) {
    return 'super';
  }

  // Check for debt-related keywords
  if (
    lowerName.includes('debt') ||
    lowerName.includes('loan') ||
    lowerName.includes('credit') ||
    lowerName.includes('mortgage') ||
    lowerName.includes('hecs') ||
    lowerName.includes('help')
  ) {
    return 'debt';
  }

  // Default to cash
  return 'cash';
}

/**
 * Finds an existing holding by name for a user, or creates a new one.
 * Returns the holding ID.
 */
async function findOrCreateHolding(
  userId: string,
  fundName: string,
  currency: string | null,
  type: SnapshotHoldingType
): Promise<string> {
  // Try to find existing holding by name (case-insensitive match)
  const existingHoldings = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, userId), isNull(holdings.deletedAt)));

  // Find a matching holding by name (case-insensitive)
  const existingHolding = existingHoldings.find(
    (h) => h.name.toLowerCase() === fundName.toLowerCase()
  );

  if (existingHolding) {
    return existingHolding.id;
  }

  // Create new holding
  const newHolding: NewHolding = {
    userId,
    type,
    symbol: null, // Snapshots don't have symbols
    name: fundName,
    currency: (currency?.toUpperCase() as 'AUD' | 'NZD' | 'USD') || 'AUD',
    exchange: null,
    isDormant: false,
    isActive: true,
  };

  const [created] = await db.insert(holdings).values(newHolding).returning();
  return created.id;
}

/**
 * Checks if a snapshot is a duplicate.
 * A duplicate is defined as having the same holding and date.
 */
async function isDuplicateSnapshot(
  holdingId: string,
  date: string
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.holdingId, holdingId),
        eq(snapshots.date, date),
        isNull(snapshots.deletedAt)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Creates a contribution record for super holdings.
 */
async function createContribution(
  holdingId: string,
  date: string,
  employerContrib: number,
  employeeContrib: number
): Promise<void> {
  const newContribution: NewContribution = {
    holdingId,
    date,
    employerContrib: String(employerContrib),
    employeeContrib: String(employeeContrib),
    notes: null,
  };

  // Use upsert pattern - insert or update if exists
  // Check if contribution already exists for this holding and date
  const [existing] = await db
    .select()
    .from(contributions)
    .where(
      and(
        eq(contributions.holdingId, holdingId),
        eq(contributions.date, date),
        isNull(contributions.deletedAt)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing contribution
    await db
      .update(contributions)
      .set({
        employerContrib: String(employerContrib),
        employeeContrib: String(employeeContrib),
        updatedAt: new Date(),
      })
      .where(eq(contributions.id, existing.id));
  } else {
    // Insert new contribution
    await db.insert(contributions).values(newContribution);
  }
}

/**
 * Imports validated snapshot rows into the database.
 *
 * @param userId - The user ID to import snapshots for
 * @param rows - Array of validated snapshot rows
 * @returns Import result with counts and errors
 */
export async function importSnapshots(
  userId: string,
  rows: SnapshotRow[]
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  // Cache holding IDs to avoid repeated lookups
  const holdingCache = new Map<string, { id: string; type: SnapshotHoldingType }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

    try {
      // Get or create holding
      const cacheKey = row.fundName.toLowerCase();
      let holdingInfo = holdingCache.get(cacheKey);

      if (!holdingInfo) {
        const holdingType = determineHoldingType(row.fundName);
        const holdingId = await findOrCreateHolding(
          userId,
          row.fundName,
          row.currency,
          holdingType
        );
        holdingInfo = { id: holdingId, type: holdingType };
        holdingCache.set(cacheKey, holdingInfo);
      }

      // Check for duplicate snapshot (same holding + date)
      const isDuplicate = await isDuplicateSnapshot(holdingInfo.id, row.date);

      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Create the snapshot
      const newSnapshot: NewSnapshot = {
        holdingId: holdingInfo.id,
        date: row.date,
        balance: String(row.balance),
        currency: (row.currency?.toUpperCase() as 'AUD' | 'NZD' | 'USD') || 'AUD',
        notes: null,
      };

      await db.insert(snapshots).values(newSnapshot);

      // Create contribution record if this is a super holding with contribution data
      if (
        holdingInfo.type === 'super' &&
        (row.employerContrib !== null || row.employeeContrib !== null)
      ) {
        await createContribution(
          holdingInfo.id,
          row.date,
          row.employerContrib ?? 0,
          row.employeeContrib ?? 0
        );
      }

      result.imported++;
    } catch (error) {
      result.errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: row,
      });
    }
  }

  return result;
}
