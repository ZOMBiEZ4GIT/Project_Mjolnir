/**
 * Historical net worth calculation service.
 *
 * Calculates net worth at past points in time for charting.
 * Uses carry-forward logic for months with missing data.
 */

import { db } from "@/lib/db";
import { holdings, transactions, snapshots, type Holding, type Snapshot } from "@/lib/db/schema";
import { eq, isNull, and, lte, asc, desc } from "drizzle-orm";
import { getCachedPrice, type CachedPrice } from "@/lib/services/price-cache";
import { getExchangeRate } from "@/lib/services/exchange-rates";

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single point in time for historical net worth.
 */
export interface HistoryPoint {
  /** Date for this data point (end of month) */
  date: Date;
  /** Net worth at this point (assets - debt) in AUD */
  netWorth: number;
  /** Total assets at this point in AUD */
  totalAssets: number;
  /** Total debt at this point in AUD */
  totalDebt: number;
}

/**
 * Result of historical net worth calculation.
 */
export interface HistoricalNetWorthResult {
  /** Array of monthly data points, ordered chronologically */
  history: HistoryPoint[];
  /** Timestamp when calculation was performed */
  generatedAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the last day of a month.
 */
function getMonthEnd(year: number, month: number): Date {
  // month is 0-indexed (0 = January)
  // Setting day to 0 of the next month gives us the last day of the current month
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/**
 * Gets the month end date formatted as YYYY-MM-DD for SQL comparison.
 */
function formatDateForSql(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a value from its native currency to AUD.
 */
async function convertToAud(value: number, currency: string): Promise<number> {
  if (currency === "AUD") {
    return value;
  }
  const rate = await getExchangeRate(currency, "AUD");
  return value * rate;
}

/**
 * Calculates quantity held for a holding as of a specific date.
 * Similar to calculateQuantityHeld but filters transactions up to the given date.
 */
async function calculateQuantityHeldAsOf(
  holdingId: string,
  asOfDate: Date
): Promise<number> {
  const dateStr = formatDateForSql(asOfDate);

  const txns = await db
    .select({
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.holdingId, holdingId),
        isNull(transactions.deletedAt),
        lte(transactions.date, dateStr)
      )
    )
    .orderBy(asc(transactions.date));

  let quantity = 0;

  for (const txn of txns) {
    const txnQuantity = Number(txn.quantity);

    switch (txn.action) {
      case "BUY":
        quantity += txnQuantity;
        break;
      case "SELL":
        quantity -= txnQuantity;
        break;
      case "SPLIT":
        quantity *= txnQuantity;
        break;
      case "DIVIDEND":
        break;
    }
  }

  return quantity;
}

/**
 * Gets the most recent snapshot for a holding as of a specific date.
 * Implements carry-forward: returns the latest snapshot on or before the date.
 */
async function getSnapshotAsOf(
  holdingId: string,
  asOfDate: Date
): Promise<Snapshot | null> {
  const dateStr = formatDateForSql(asOfDate);

  const result = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.holdingId, holdingId),
        isNull(snapshots.deletedAt),
        lte(snapshots.date, dateStr)
      )
    )
    .orderBy(desc(snapshots.date))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Calculates value for a tradeable holding at a specific date.
 * Uses quantity at that date x current price (historical prices not stored).
 */
async function calculateTradeableValueAsOf(
  holding: Holding,
  asOfDate: Date,
  priceCache: Map<string, CachedPrice | null>
): Promise<number> {
  const quantity = await calculateQuantityHeldAsOf(holding.id, asOfDate);

  if (quantity === 0) {
    return 0;
  }

  const symbol = holding.symbol;
  if (!symbol) {
    return 0;
  }

  // Get price from cache (already fetched for efficiency)
  const cachedPrice = priceCache.get(symbol);
  if (!cachedPrice) {
    return 0;
  }

  const valueNative = quantity * cachedPrice.price;
  return convertToAud(valueNative, cachedPrice.currency);
}

/**
 * Calculates value for a snapshot-based holding at a specific date.
 * Uses carry-forward: most recent snapshot on or before the date.
 */
async function calculateSnapshotValueAsOf(
  holding: Holding,
  asOfDate: Date
): Promise<number> {
  const snapshot = await getSnapshotAsOf(holding.id, asOfDate);

  if (!snapshot) {
    return 0;
  }

  const valueNative = Number(snapshot.balance);
  return convertToAud(valueNative, snapshot.currency);
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculates historical net worth for the last N months.
 *
 * Processing:
 * 1. Generates month-end dates for the requested period
 * 2. For each month:
 *    - Tradeable assets: quantity at month-end x current price
 *    - Snapshot assets: carry-forward most recent snapshot
 *    - Debt: carry-forward most recent snapshot
 * 3. Returns array of data points for charting
 *
 * Note: For tradeable assets, we use current price since historical prices
 * are not stored. This means historical values are estimates based on
 * current prices, not actual values at those dates.
 *
 * @param userId - The user ID to calculate history for
 * @param months - Number of months of history to return (default 12)
 * @returns HistoricalNetWorthResult with array of monthly data points
 *
 * @example
 * const history = await calculateHistoricalNetWorth("user_123", 12);
 * // Returns last 12 months of data points for charting
 */
export async function calculateHistoricalNetWorth(
  userId: string,
  months: number = 12
): Promise<HistoricalNetWorthResult> {
  const generatedAt = new Date();

  // Generate month-end dates for the last N months
  const monthEnds: Date[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = getMonthEnd(targetMonth.getFullYear(), targetMonth.getMonth());
    monthEnds.push(monthEnd);
  }

  // Get all current holdings
  const userHoldings = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt),
        eq(holdings.isActive, true)
      )
    );

  // Categorize holdings
  const tradeableTypes = ["stock", "etf", "crypto"] as const;
  const snapshotAssetTypes = ["super", "cash"] as const;
  const debtTypes = ["debt"] as const;

  const tradeableHoldings = userHoldings.filter((h) =>
    tradeableTypes.includes(h.type as (typeof tradeableTypes)[number])
  );
  const snapshotAssetHoldings = userHoldings.filter((h) =>
    snapshotAssetTypes.includes(h.type as (typeof snapshotAssetTypes)[number])
  );
  const debtHoldings = userHoldings.filter((h) =>
    debtTypes.includes(h.type as (typeof debtTypes)[number])
  );

  // Pre-fetch current prices for all tradeable holdings (for efficiency)
  const priceCache = new Map<string, CachedPrice | null>();
  for (const holding of tradeableHoldings) {
    if (holding.symbol) {
      const price = await getCachedPrice(holding.symbol);
      priceCache.set(holding.symbol, price);
    }
  }

  // Calculate net worth for each month
  const history: HistoryPoint[] = [];

  for (const monthEnd of monthEnds) {
    // Calculate tradeable assets value
    const tradeableValues = await Promise.all(
      tradeableHoldings.map((h) => calculateTradeableValueAsOf(h, monthEnd, priceCache))
    );

    // Calculate snapshot assets value
    const snapshotAssetValues = await Promise.all(
      snapshotAssetHoldings.map((h) => calculateSnapshotValueAsOf(h, monthEnd))
    );

    // Calculate debt value
    const debtValues = await Promise.all(
      debtHoldings.map((h) => calculateSnapshotValueAsOf(h, monthEnd))
    );

    const totalAssets =
      tradeableValues.reduce((sum, v) => sum + v, 0) +
      snapshotAssetValues.reduce((sum, v) => sum + v, 0);

    const totalDebt = debtValues.reduce((sum, v) => sum + v, 0);

    const netWorth = totalAssets - totalDebt;

    history.push({
      date: monthEnd,
      netWorth,
      totalAssets,
      totalDebt,
    });
  }

  return {
    history,
    generatedAt,
  };
}
