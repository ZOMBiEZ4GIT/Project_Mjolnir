/**
 * Net worth calculation service.
 *
 * Calculates total net worth from all holdings:
 * - Tradeable assets (stocks, ETFs, crypto): quantity x current price
 * - Snapshot assets (super, cash): latest snapshot balance
 * - Debt: latest snapshot balance (subtracted from net worth)
 *
 * Net Worth = Total Assets - Total Debt
 */

import { db } from "@/lib/db";
import { holdings, type Holding } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { calculateQuantityHeld } from "./quantity";
import { getCachedPrice, type CachedPrice } from "@/lib/services/price-cache";
import { getLatestSnapshots, type SnapshotWithHolding } from "@/lib/queries/snapshots";
import { getExchangeRate } from "@/lib/services/exchange-rates";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Breakdown of assets by type with individual holding details.
 */
export interface AssetTypeBreakdown {
  /** Type of holding (stock, etf, crypto, super, cash) */
  type: "stock" | "etf" | "crypto" | "super" | "cash";
  /** Total value in AUD */
  totalValue: number;
  /** Number of holdings in this type */
  count: number;
  /** Individual holdings in this type */
  holdings: HoldingValue[];
}

/**
 * Individual holding value.
 */
export interface HoldingValue {
  /** Holding ID */
  id: string;
  /** Holding name */
  name: string;
  /** Symbol (nullable for cash/super) */
  symbol: string | null;
  /** Value in AUD */
  value: number;
  /** Original currency */
  currency: string;
  /** Value in original currency */
  valueNative: number;
  /** Quantity (for tradeable assets) */
  quantity?: number;
  /** Price (for tradeable assets) */
  price?: number;
}

/**
 * Result of net worth calculation.
 */
export interface NetWorthResult {
  /** Total net worth (assets - debt) in AUD */
  netWorth: number;
  /** Total assets (not including debt) in AUD */
  totalAssets: number;
  /** Total debt in AUD */
  totalDebt: number;
  /** Breakdown by asset type */
  breakdown: AssetTypeBreakdown[];
  /** Debt breakdown (separate from assets) */
  debtBreakdown: HoldingValue[];
  /** Timestamp when calculation was performed */
  calculatedAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Converts a value from its native currency to AUD.
 *
 * @param value - The value in native currency
 * @param currency - The native currency code
 * @returns The value in AUD
 */
async function convertToAud(value: number, currency: string): Promise<number> {
  if (currency === "AUD") {
    return value;
  }
  const rate = await getExchangeRate(currency, "AUD");
  return value * rate;
}

/**
 * Gets all non-deleted holdings for a user.
 */
async function getUserHoldings(userId: string): Promise<Holding[]> {
  return db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt),
        eq(holdings.isActive, true)
      )
    );
}

/**
 * Calculates value for tradeable holdings (stocks, ETFs, crypto).
 * Uses quantity x cached price.
 */
async function calculateTradeableValue(
  holding: Holding
): Promise<HoldingValue | null> {
  // Get current quantity
  const quantity = await calculateQuantityHeld(holding.id);

  // No holdings = no value
  if (quantity === 0) {
    return null;
  }

  // Get cached price
  const symbol = holding.symbol;
  if (!symbol) {
    // No symbol means we can't get a price
    return null;
  }

  const cachedPrice: CachedPrice | null = await getCachedPrice(symbol);
  if (!cachedPrice) {
    // No cached price - holding has value but we don't know it
    // Return 0 value but include in breakdown for visibility
    return {
      id: holding.id,
      name: holding.name,
      symbol: symbol,
      value: 0,
      currency: holding.currency,
      valueNative: 0,
      quantity,
      price: 0,
    };
  }

  // Calculate value in native currency
  const valueNative = quantity * cachedPrice.price;

  // Convert to AUD
  const valueAud = await convertToAud(valueNative, cachedPrice.currency);

  return {
    id: holding.id,
    name: holding.name,
    symbol: symbol,
    value: valueAud,
    currency: cachedPrice.currency,
    valueNative,
    quantity,
    price: cachedPrice.price,
  };
}

/**
 * Calculates value for snapshot holdings (super, cash, debt).
 * Uses latest snapshot balance.
 */
async function calculateSnapshotValue(
  holding: Holding,
  snapshotsMap: Map<string, SnapshotWithHolding>
): Promise<HoldingValue | null> {
  const snapshot = snapshotsMap.get(holding.id);

  if (!snapshot) {
    // No snapshot = no known value
    return null;
  }

  const valueNative = Number(snapshot.balance);

  // Convert to AUD
  const valueAud = await convertToAud(valueNative, snapshot.currency);

  return {
    id: holding.id,
    name: holding.name,
    symbol: holding.symbol,
    value: valueAud,
    currency: snapshot.currency,
    valueNative,
  };
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculates total net worth for a user.
 *
 * Processing:
 * 1. Fetches all active holdings for user
 * 2. For tradeable (stocks, ETFs, crypto): quantity x current cached price
 * 3. For snapshot-based (super, cash, debt): latest snapshot balance
 * 4. Converts all values to AUD
 * 5. Sums assets and debt separately
 *
 * @param userId - The user ID to calculate net worth for
 * @returns NetWorthResult with breakdown by type
 *
 * @example
 * const result = await calculateNetWorth("user_123");
 * console.log(`Net Worth: $${result.netWorth.toLocaleString()}`);
 */
export async function calculateNetWorth(userId: string): Promise<NetWorthResult> {
  const calculatedAt = new Date();

  // Get all active holdings
  const userHoldings = await getUserHoldings(userId);

  // Get latest snapshots for all holdings (single query)
  const snapshotsMap = await getLatestSnapshots(userId);

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

  // Calculate values for each category
  const tradeableValues = await Promise.all(
    tradeableHoldings.map((h) => calculateTradeableValue(h))
  );

  const snapshotAssetValues = await Promise.all(
    snapshotAssetHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  const debtValues = await Promise.all(
    debtHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  // Filter out nulls
  const validTradeableValues = tradeableValues.filter(
    (v): v is HoldingValue => v !== null
  );
  const validSnapshotAssetValues = snapshotAssetValues.filter(
    (v): v is HoldingValue => v !== null
  );
  const validDebtValues = debtValues.filter(
    (v): v is HoldingValue => v !== null
  );

  // Group tradeable by type
  const stockValues = validTradeableValues.filter((v) => {
    const holding = tradeableHoldings.find((h) => h.id === v.id);
    return holding?.type === "stock";
  });
  const etfValues = validTradeableValues.filter((v) => {
    const holding = tradeableHoldings.find((h) => h.id === v.id);
    return holding?.type === "etf";
  });
  const cryptoValues = validTradeableValues.filter((v) => {
    const holding = tradeableHoldings.find((h) => h.id === v.id);
    return holding?.type === "crypto";
  });

  // Group snapshot assets by type
  const superValues = validSnapshotAssetValues.filter((v) => {
    const holding = snapshotAssetHoldings.find((h) => h.id === v.id);
    return holding?.type === "super";
  });
  const cashValues = validSnapshotAssetValues.filter((v) => {
    const holding = snapshotAssetHoldings.find((h) => h.id === v.id);
    return holding?.type === "cash";
  });

  // Build breakdown
  const breakdown: AssetTypeBreakdown[] = [];

  if (stockValues.length > 0) {
    breakdown.push({
      type: "stock",
      totalValue: stockValues.reduce((sum, v) => sum + v.value, 0),
      count: stockValues.length,
      holdings: stockValues,
    });
  }

  if (etfValues.length > 0) {
    breakdown.push({
      type: "etf",
      totalValue: etfValues.reduce((sum, v) => sum + v.value, 0),
      count: etfValues.length,
      holdings: etfValues,
    });
  }

  if (cryptoValues.length > 0) {
    breakdown.push({
      type: "crypto",
      totalValue: cryptoValues.reduce((sum, v) => sum + v.value, 0),
      count: cryptoValues.length,
      holdings: cryptoValues,
    });
  }

  if (superValues.length > 0) {
    breakdown.push({
      type: "super",
      totalValue: superValues.reduce((sum, v) => sum + v.value, 0),
      count: superValues.length,
      holdings: superValues,
    });
  }

  if (cashValues.length > 0) {
    breakdown.push({
      type: "cash",
      totalValue: cashValues.reduce((sum, v) => sum + v.value, 0),
      count: cashValues.length,
      holdings: cashValues,
    });
  }

  // Calculate totals
  const totalAssets = breakdown.reduce((sum, b) => sum + b.totalValue, 0);
  const totalDebt = validDebtValues.reduce((sum, v) => sum + v.value, 0);
  const netWorth = totalAssets - totalDebt;

  return {
    netWorth,
    totalAssets,
    totalDebt,
    breakdown,
    debtBreakdown: validDebtValues,
    calculatedAt,
  };
}
