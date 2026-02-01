/**
 * Top performers calculation service.
 *
 * Identifies top gainers and losers based on unrealized gain/loss
 * for tradeable holdings (stocks, ETFs, crypto).
 *
 * Gain/Loss = Current Value - Cost Basis
 * Gain/Loss % = (Gain/Loss / Cost Basis) x 100
 */

import { db } from "@/lib/db";
import { holdings, type Holding } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { calculateQuantityHeld } from "./quantity";
import { calculateCostBasis } from "./cost-basis";
import { getCachedPrice, type CachedPrice } from "@/lib/services/price-cache";
import { getExchangeRate } from "@/lib/services/exchange-rates";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a holding's performance (gain or loss).
 */
export interface Performer {
  /** Holding ID */
  holdingId: string;
  /** Holding name */
  name: string;
  /** Trading symbol */
  symbol: string;
  /** Unrealized gain/loss in AUD (positive = gain, negative = loss) */
  gainLoss: number;
  /** Unrealized gain/loss as percentage of cost basis */
  gainLossPercent: number;
  /** Holding type (stock, etf, crypto) */
  type: "stock" | "etf" | "crypto";
  /** Current market value in AUD */
  currentValue: number;
  /** Cost basis in AUD */
  costBasis: number;
}

/**
 * Result of top performers calculation.
 */
export interface TopPerformersResult {
  /** Top gaining holdings (sorted by gain amount descending) */
  gainers: Performer[];
  /** Top losing holdings (sorted by loss amount ascending, i.e., most negative first) */
  losers: Performer[];
  /** Timestamp when calculation was performed */
  calculatedAt: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
 * Gets all active tradeable holdings for a user.
 */
async function getTradeableHoldings(userId: string): Promise<Holding[]> {
  const tradeableTypes = ["stock", "etf", "crypto"] as const;
  return db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt),
        eq(holdings.isActive, true),
        inArray(holdings.type, tradeableTypes)
      )
    );
}

/**
 * Calculates performance for a single tradeable holding.
 * Returns null if the holding has no position or no price.
 */
async function calculateHoldingPerformance(
  holding: Holding
): Promise<Performer | null> {
  // Get current quantity
  const quantity = await calculateQuantityHeld(holding.id);

  // No position = no performance to calculate
  if (quantity === 0) {
    return null;
  }

  // Get symbol (required for price lookup)
  const symbol = holding.symbol;
  if (!symbol) {
    return null;
  }

  // Get cached price
  const cachedPrice: CachedPrice | null = await getCachedPrice(symbol);
  if (!cachedPrice || cachedPrice.price === 0) {
    return null;
  }

  // Calculate current value in native currency
  const currentValueNative = quantity * cachedPrice.price;

  // Convert current value to AUD
  const currentValueAud = await convertToAud(
    currentValueNative,
    cachedPrice.currency
  );

  // Calculate cost basis using FIFO
  const costBasisResult = await calculateCostBasis(holding.id);

  // Convert cost basis to AUD (cost basis is stored in holding's currency)
  const costBasisAud = await convertToAud(
    costBasisResult.costBasis,
    holding.currency
  );

  // No cost basis = can't calculate performance
  if (costBasisAud === 0) {
    return null;
  }

  // Calculate gain/loss
  const gainLoss = currentValueAud - costBasisAud;
  const gainLossPercent = (gainLoss / costBasisAud) * 100;

  return {
    holdingId: holding.id,
    name: holding.name,
    symbol: symbol,
    gainLoss,
    gainLossPercent,
    type: holding.type as "stock" | "etf" | "crypto",
    currentValue: currentValueAud,
    costBasis: costBasisAud,
  };
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Gets top performing (gainers) and worst performing (losers) holdings.
 *
 * Processing:
 * 1. Fetches all active tradeable holdings (stocks, ETFs, crypto)
 * 2. For each holding with a position:
 *    - Calculates current market value (quantity x cached price)
 *    - Calculates cost basis using FIFO methodology
 *    - Computes unrealized gain/loss = current value - cost basis
 * 3. Converts all values to AUD for comparison
 * 4. Sorts by gain/loss amount and returns top N gainers and losers
 *
 * Note: Holdings without a position, price, or cost basis are excluded.
 *
 * @param userId - The user ID to get performers for
 * @param limit - Maximum number of gainers and losers to return (default: 5)
 * @returns TopPerformersResult with arrays of gainers and losers
 *
 * @example
 * const performers = await getTopPerformers("user_123", 5);
 * console.log("Top Gainer:", performers.gainers[0]?.name);
 * console.log("Top Loser:", performers.losers[0]?.name);
 */
export async function getTopPerformers(
  userId: string,
  limit: number = 5
): Promise<TopPerformersResult> {
  const calculatedAt = new Date();

  // Get all tradeable holdings
  const tradeableHoldings = await getTradeableHoldings(userId);

  // Calculate performance for each holding
  const performanceResults = await Promise.all(
    tradeableHoldings.map((h) => calculateHoldingPerformance(h))
  );

  // Filter out nulls (holdings without position, price, or cost basis)
  const performers = performanceResults.filter(
    (p): p is Performer => p !== null
  );

  // Separate gainers (positive gain/loss) and losers (negative gain/loss)
  const allGainers = performers
    .filter((p) => p.gainLoss > 0)
    .sort((a, b) => b.gainLoss - a.gainLoss);

  const allLosers = performers
    .filter((p) => p.gainLoss < 0)
    .sort((a, b) => a.gainLoss - b.gainLoss); // Most negative first

  // Return top N of each
  return {
    gainers: allGainers.slice(0, limit),
    losers: allLosers.slice(0, limit),
    calculatedAt,
  };
}
