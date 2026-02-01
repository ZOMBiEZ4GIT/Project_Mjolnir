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
import {
  getCachedPrice,
  isCacheValid,
  DEFAULT_PRICE_CACHE_TTL_MINUTES,
  type CachedPrice,
} from "@/lib/services/price-cache";
import { getLatestSnapshots, type SnapshotWithHolding } from "@/lib/queries/snapshots";
import { getExchangeRate } from "@/lib/services/exchange-rates";

// Snapshot staleness threshold: 2 months in milliseconds
const SNAPSHOT_STALE_THRESHOLD_MS = 2 * 30 * 24 * 60 * 60 * 1000;

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
 * Reason why a holding's data is considered stale.
 */
export type StaleReason =
  | "price_expired" // Tradeable: cached price is older than TTL
  | "no_price" // Tradeable: no cached price available
  | "snapshot_old" // Snapshot: snapshot is older than 2 months
  | "no_snapshot"; // Snapshot: no snapshot available

/**
 * Represents a holding with stale data that may affect net worth accuracy.
 */
export interface StaleHolding {
  /** Holding ID */
  holdingId: string;
  /** Holding name */
  name: string;
  /** Holding type (stock, etf, crypto, super, cash, debt) */
  type: string;
  /** When the data was last updated */
  lastUpdated: Date | null;
  /** Reason for staleness */
  reason: StaleReason;
}

/**
 * Holding with percentage of group.
 */
export interface HoldingWithPercentage extends HoldingValue {
  /** Percentage of group total */
  percentageOfGroup: number;
}

/**
 * Asset breakdown by type with percentage.
 */
export interface AssetBreakdownItem {
  /** Type of holding */
  type: "stock" | "etf" | "crypto" | "super" | "cash" | "debt";
  /** Total value in AUD */
  totalValue: number;
  /** Number of holdings in this type */
  count: number;
  /** Percentage of total assets (or total debt for debt type) */
  percentage: number;
  /** Individual holdings with percentage */
  holdings: HoldingWithPercentage[];
}

/**
 * Complete asset breakdown result.
 */
export interface AssetBreakdown {
  /** Breakdown by asset type (excluding debt) */
  assets: AssetBreakdownItem[];
  /** Debt breakdown */
  debt: AssetBreakdownItem | null;
  /** Total assets value in AUD */
  totalAssets: number;
  /** Total debt value in AUD */
  totalDebt: number;
  /** Timestamp when calculation was performed */
  calculatedAt: Date;
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
  /** Holdings with stale data affecting accuracy */
  staleHoldings: StaleHolding[];
  /** True if any holdings have stale data */
  hasStaleData: boolean;
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
 * Result from calculating tradeable value, including staleness info.
 */
interface TradeableValueResult {
  holdingValue: HoldingValue | null;
  staleHolding: StaleHolding | null;
}

/**
 * Calculates value for tradeable holdings (stocks, ETFs, crypto).
 * Uses quantity x cached price, flagging stale/missing prices.
 */
async function calculateTradeableValue(
  holding: Holding
): Promise<TradeableValueResult> {
  // Get current quantity
  const quantity = await calculateQuantityHeld(holding.id);

  // No holdings = no value (not stale, just no position)
  if (quantity === 0) {
    return { holdingValue: null, staleHolding: null };
  }

  // Get cached price
  const symbol = holding.symbol;
  if (!symbol) {
    // No symbol means we can't get a price
    return { holdingValue: null, staleHolding: null };
  }

  const cachedPrice: CachedPrice | null = await getCachedPrice(symbol);

  // No cached price - flag as stale with "no_price" reason
  if (!cachedPrice) {
    return {
      holdingValue: {
        id: holding.id,
        name: holding.name,
        symbol: symbol,
        value: 0,
        currency: holding.currency,
        valueNative: 0,
        quantity,
        price: 0,
      },
      staleHolding: {
        holdingId: holding.id,
        name: holding.name,
        type: holding.type,
        lastUpdated: null,
        reason: "no_price",
      },
    };
  }

  // Check if cached price is stale (older than TTL)
  const isStale = !isCacheValid(cachedPrice, DEFAULT_PRICE_CACHE_TTL_MINUTES);

  // Calculate value in native currency (even if stale, we use the cached price)
  const valueNative = quantity * cachedPrice.price;

  // Convert to AUD
  const valueAud = await convertToAud(valueNative, cachedPrice.currency);

  return {
    holdingValue: {
      id: holding.id,
      name: holding.name,
      symbol: symbol,
      value: valueAud,
      currency: cachedPrice.currency,
      valueNative,
      quantity,
      price: cachedPrice.price,
    },
    staleHolding: isStale
      ? {
          holdingId: holding.id,
          name: holding.name,
          type: holding.type,
          lastUpdated: cachedPrice.fetchedAt,
          reason: "price_expired",
        }
      : null,
  };
}

/**
 * Result from calculating snapshot value, including staleness info.
 */
interface SnapshotValueResult {
  holdingValue: HoldingValue | null;
  staleHolding: StaleHolding | null;
}

/**
 * Calculates value for snapshot holdings (super, cash, debt).
 * Uses latest snapshot balance, flagging old/missing snapshots.
 */
async function calculateSnapshotValue(
  holding: Holding,
  snapshotsMap: Map<string, SnapshotWithHolding>
): Promise<SnapshotValueResult> {
  const snapshot = snapshotsMap.get(holding.id);

  // No snapshot - flag as stale with "no_snapshot" reason
  if (!snapshot) {
    return {
      holdingValue: null,
      staleHolding: {
        holdingId: holding.id,
        name: holding.name,
        type: holding.type,
        lastUpdated: null,
        reason: "no_snapshot",
      },
    };
  }

  const valueNative = Number(snapshot.balance);

  // Convert to AUD
  const valueAud = await convertToAud(valueNative, snapshot.currency);

  // Check if snapshot is stale (older than 2 months)
  const snapshotDate = new Date(snapshot.date);
  const now = new Date();
  const ageMs = now.getTime() - snapshotDate.getTime();
  const isStale = ageMs > SNAPSHOT_STALE_THRESHOLD_MS;

  return {
    holdingValue: {
      id: holding.id,
      name: holding.name,
      symbol: holding.symbol,
      value: valueAud,
      currency: snapshot.currency,
      valueNative,
    },
    staleHolding: isStale
      ? {
          holdingId: holding.id,
          name: holding.name,
          type: holding.type,
          lastUpdated: snapshotDate,
          reason: "snapshot_old",
        }
      : null,
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
 * 6. Tracks stale data (expired prices, old snapshots)
 *
 * Carry-forward logic:
 * - Tradeable: Uses cached price even if stale (past TTL), flags as stale
 * - Snapshots: Uses most recent snapshot even if old, flags if older than 2 months
 *
 * @param userId - The user ID to calculate net worth for
 * @returns NetWorthResult with breakdown by type and stale data info
 *
 * @example
 * const result = await calculateNetWorth("user_123");
 * console.log(`Net Worth: $${result.netWorth.toLocaleString()}`);
 * if (result.hasStaleData) {
 *   console.log(`Warning: ${result.staleHoldings.length} holdings have stale data`);
 * }
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
  const tradeableResults = await Promise.all(
    tradeableHoldings.map((h) => calculateTradeableValue(h))
  );

  const snapshotAssetResults = await Promise.all(
    snapshotAssetHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  const debtResults = await Promise.all(
    debtHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  // Extract holding values (filter out nulls)
  const validTradeableValues = tradeableResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);
  const validSnapshotAssetValues = snapshotAssetResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);
  const validDebtValues = debtResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);

  // Collect stale holdings from all categories
  const staleHoldings: StaleHolding[] = [
    ...tradeableResults.map((r) => r.staleHolding).filter((s): s is StaleHolding => s !== null),
    ...snapshotAssetResults.map((r) => r.staleHolding).filter((s): s is StaleHolding => s !== null),
    ...debtResults.map((r) => r.staleHolding).filter((s): s is StaleHolding => s !== null),
  ];

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
    staleHoldings,
    hasStaleData: staleHoldings.length > 0,
    calculatedAt,
  };
}

// =============================================================================
// ASSET BREAKDOWN CALCULATION
// =============================================================================

/**
 * Adds percentage to holdings based on group total.
 */
function addHoldingPercentages(
  holdings: HoldingValue[],
  groupTotal: number
): HoldingWithPercentage[] {
  return holdings.map((h) => ({
    ...h,
    percentageOfGroup: groupTotal > 0 ? (h.value / groupTotal) * 100 : 0,
  }));
}

/**
 * Calculates asset breakdown by type with percentages.
 *
 * Groups assets by type (stocks, ETFs, crypto, super, cash) and debt,
 * calculating the percentage each group represents of total assets
 * and the percentage each holding represents within its group.
 *
 * @param userId - The user ID to calculate breakdown for
 * @returns AssetBreakdown with grouped assets and percentages
 *
 * @example
 * const breakdown = await calculateAssetBreakdown("user_123");
 * breakdown.assets.forEach(group => {
 *   console.log(`${group.type}: ${group.percentage.toFixed(1)}% of portfolio`);
 * });
 */
export async function calculateAssetBreakdown(
  userId: string
): Promise<AssetBreakdown> {
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
  const tradeableResults = await Promise.all(
    tradeableHoldings.map((h) => calculateTradeableValue(h))
  );

  const snapshotAssetResults = await Promise.all(
    snapshotAssetHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  const debtResults = await Promise.all(
    debtHoldings.map((h) => calculateSnapshotValue(h, snapshotsMap))
  );

  // Extract holding values (filter out nulls)
  const validTradeableValues = tradeableResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);
  const validSnapshotAssetValues = snapshotAssetResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);
  const validDebtValues = debtResults
    .map((r) => r.holdingValue)
    .filter((v): v is HoldingValue => v !== null);

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

  // Calculate group totals
  const stockTotal = stockValues.reduce((sum, v) => sum + v.value, 0);
  const etfTotal = etfValues.reduce((sum, v) => sum + v.value, 0);
  const cryptoTotal = cryptoValues.reduce((sum, v) => sum + v.value, 0);
  const superTotal = superValues.reduce((sum, v) => sum + v.value, 0);
  const cashTotal = cashValues.reduce((sum, v) => sum + v.value, 0);
  const debtTotal = validDebtValues.reduce((sum, v) => sum + v.value, 0);

  const totalAssets = stockTotal + etfTotal + cryptoTotal + superTotal + cashTotal;

  // Build breakdown with percentages
  const assets: AssetBreakdownItem[] = [];

  if (stockValues.length > 0) {
    assets.push({
      type: "stock",
      totalValue: stockTotal,
      count: stockValues.length,
      percentage: totalAssets > 0 ? (stockTotal / totalAssets) * 100 : 0,
      holdings: addHoldingPercentages(stockValues, stockTotal),
    });
  }

  if (etfValues.length > 0) {
    assets.push({
      type: "etf",
      totalValue: etfTotal,
      count: etfValues.length,
      percentage: totalAssets > 0 ? (etfTotal / totalAssets) * 100 : 0,
      holdings: addHoldingPercentages(etfValues, etfTotal),
    });
  }

  if (cryptoValues.length > 0) {
    assets.push({
      type: "crypto",
      totalValue: cryptoTotal,
      count: cryptoValues.length,
      percentage: totalAssets > 0 ? (cryptoTotal / totalAssets) * 100 : 0,
      holdings: addHoldingPercentages(cryptoValues, cryptoTotal),
    });
  }

  if (superValues.length > 0) {
    assets.push({
      type: "super",
      totalValue: superTotal,
      count: superValues.length,
      percentage: totalAssets > 0 ? (superTotal / totalAssets) * 100 : 0,
      holdings: addHoldingPercentages(superValues, superTotal),
    });
  }

  if (cashValues.length > 0) {
    assets.push({
      type: "cash",
      totalValue: cashTotal,
      count: cashValues.length,
      percentage: totalAssets > 0 ? (cashTotal / totalAssets) * 100 : 0,
      holdings: addHoldingPercentages(cashValues, cashTotal),
    });
  }

  // Sort by value descending
  assets.sort((a, b) => b.totalValue - a.totalValue);

  // Build debt breakdown (percentage is 100% since debt is separate)
  const debt: AssetBreakdownItem | null =
    validDebtValues.length > 0
      ? {
          type: "debt",
          totalValue: debtTotal,
          count: validDebtValues.length,
          percentage: 100, // Debt is its own category, so 100%
          holdings: addHoldingPercentages(validDebtValues, debtTotal),
        }
      : null;

  return {
    assets,
    debt,
    totalAssets,
    totalDebt: debtTotal,
    calculatedAt,
  };
}
