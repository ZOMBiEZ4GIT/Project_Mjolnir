/**
 * Transaction Import Service
 * Imports validated transaction rows into the database.
 * - Auto-creates holdings if they don't exist
 * - Checks for duplicate transactions
 * - Returns import summary
 */

import { db } from '@/lib/db';
import { holdings, transactions, type NewHolding, type NewTransaction } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { type TransactionRow } from './validators/transaction-validator';

export interface ImportError {
  row: number;
  message: string;
  data?: TransactionRow;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// Map of action to holding type for auto-creation
type HoldingType = 'stock' | 'etf' | 'crypto';

// Exchanges that indicate stock/etf type
const STOCK_EXCHANGES = ['ASX', 'NZX', 'NYSE', 'NASDAQ'];

/**
 * Determines the holding type based on symbol and exchange.
 * - If exchange is provided and is a stock exchange, assume stock
 * - If symbol ends with .AX (ASX) or .NZ (NZX), assume stock
 * - Otherwise assume crypto
 */
function determineHoldingType(symbol: string, exchange: string | null): HoldingType {
  // Check explicit exchange
  if (exchange && STOCK_EXCHANGES.includes(exchange.toUpperCase())) {
    return 'stock';
  }

  // Check symbol suffix for common patterns
  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.endsWith('.AX') || upperSymbol.endsWith('.NZ')) {
    return 'stock';
  }

  // Default to crypto for unknown symbols without exchange
  return 'crypto';
}

/**
 * Determines exchange from symbol suffix if not explicitly provided.
 */
function determineExchange(symbol: string, explicitExchange: string | null): string | null {
  if (explicitExchange) {
    return explicitExchange.toUpperCase();
  }

  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.endsWith('.AX')) {
    return 'ASX';
  }
  if (upperSymbol.endsWith('.NZ')) {
    return 'NZX';
  }

  return null;
}

/**
 * Finds an existing holding by symbol for a user, or creates a new one.
 * Returns the holding ID.
 */
async function findOrCreateHolding(
  userId: string,
  symbol: string,
  currency: string | null,
  exchange: string | null
): Promise<string> {
  // Normalize symbol to uppercase
  const normalizedSymbol = symbol.toUpperCase();

  // Try to find existing holding by symbol
  const [existingHolding] = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        eq(holdings.symbol, normalizedSymbol),
        isNull(holdings.deletedAt)
      )
    )
    .limit(1);

  if (existingHolding) {
    return existingHolding.id;
  }

  // Determine type and exchange for new holding
  const holdingType = determineHoldingType(normalizedSymbol, exchange);
  const holdingExchange = determineExchange(normalizedSymbol, exchange);

  // Create new holding
  const newHolding: NewHolding = {
    userId,
    type: holdingType,
    symbol: normalizedSymbol,
    name: normalizedSymbol, // Use symbol as name; user can update later
    currency: (currency?.toUpperCase() as 'AUD' | 'NZD' | 'USD') || 'AUD',
    exchange: holdingExchange,
    isDormant: false,
    isActive: true,
  };

  const [created] = await db.insert(holdings).values(newHolding).returning();
  return created.id;
}

/**
 * Checks if a transaction is a duplicate.
 * A duplicate is defined as having the same date, symbol, action, and quantity.
 */
async function isDuplicateTransaction(
  holdingId: string,
  date: string,
  action: string,
  quantity: number
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.holdingId, holdingId),
        eq(transactions.date, date),
        eq(transactions.action, action as 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT'),
        eq(transactions.quantity, String(quantity)),
        isNull(transactions.deletedAt)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Imports validated transaction rows into the database.
 *
 * @param userId - The user ID to import transactions for
 * @param rows - Array of validated transaction rows
 * @returns Import result with counts and errors
 */
export async function importTransactions(
  userId: string,
  rows: TransactionRow[]
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  // Cache holding IDs to avoid repeated lookups
  const holdingCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

    try {
      // Get or create holding
      const cacheKey = row.symbol.toUpperCase();
      let holdingId = holdingCache.get(cacheKey);

      if (!holdingId) {
        holdingId = await findOrCreateHolding(
          userId,
          row.symbol,
          row.currency,
          row.exchange
        );
        holdingCache.set(cacheKey, holdingId);
      }

      // Check for duplicate
      const isDuplicate = await isDuplicateTransaction(
        holdingId,
        row.date,
        row.action,
        row.quantity
      );

      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Create the transaction
      const newTransaction: NewTransaction = {
        holdingId,
        date: row.date,
        action: row.action,
        quantity: String(row.quantity),
        unitPrice: String(row.unitPrice),
        fees: row.fees !== null ? String(row.fees) : '0',
        currency: (row.currency?.toUpperCase() as 'AUD' | 'NZD' | 'USD') || 'AUD',
        notes: row.notes,
      };

      await db.insert(transactions).values(newTransaction);
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
