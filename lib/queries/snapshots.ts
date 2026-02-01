import { db } from "@/lib/db";
import { snapshots, holdings, type Snapshot } from "@/lib/db/schema";
import { eq, isNull, and, desc, sql } from "drizzle-orm";

/**
 * Snapshot with holding information
 */
export interface SnapshotWithHolding extends Snapshot {
  holdingName: string;
  holdingType: string;
}

/**
 * Get the latest snapshot for each holding that has snapshots.
 * Returns a Map keyed by holding ID for O(1) lookup.
 *
 * @param userId - The user ID to filter holdings by
 * @returns Map of holding ID to their most recent non-deleted snapshot
 */
export async function getLatestSnapshots(
  userId: string
): Promise<Map<string, SnapshotWithHolding>> {
  // Use a subquery to find the max date for each holding, then join to get full snapshot data
  // This is more efficient than fetching all snapshots and filtering in JS
  const latestDates = db
    .select({
      holdingId: snapshots.holdingId,
      maxDate: sql<string>`MAX(${snapshots.date})`.as("max_date"),
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    )
    .groupBy(snapshots.holdingId)
    .as("latest_dates");

  const result = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      balance: snapshots.balance,
      currency: snapshots.currency,
      notes: snapshots.notes,
      createdAt: snapshots.createdAt,
      updatedAt: snapshots.updatedAt,
      deletedAt: snapshots.deletedAt,
      holdingName: holdings.name,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .innerJoin(
      latestDates,
      and(
        eq(snapshots.holdingId, latestDates.holdingId),
        eq(snapshots.date, latestDates.maxDate)
      )
    )
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  const snapshotMap = new Map<string, SnapshotWithHolding>();
  for (const row of result) {
    snapshotMap.set(row.holdingId, row as SnapshotWithHolding);
  }

  return snapshotMap;
}

/**
 * Get the latest snapshot for a specific holding.
 *
 * @param holdingId - The holding ID to get the latest snapshot for
 * @param userId - The user ID to validate ownership
 * @returns The most recent non-deleted snapshot, or null if none exists
 */
export async function getLatestSnapshotForHolding(
  holdingId: string,
  userId: string
): Promise<SnapshotWithHolding | null> {
  const result = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      balance: snapshots.balance,
      currency: snapshots.currency,
      notes: snapshots.notes,
      createdAt: snapshots.createdAt,
      updatedAt: snapshots.updatedAt,
      deletedAt: snapshots.deletedAt,
      holdingName: holdings.name,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(snapshots.holdingId, holdingId),
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    )
    .orderBy(desc(snapshots.date))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as SnapshotWithHolding;
}
