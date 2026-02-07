import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { fetchPrice, PriceResult } from "@/lib/services/price-fetcher";
import {
  getCachedPrice,
  isCacheValid,
  DEFAULT_PRICE_CACHE_TTL_MINUTES,
} from "@/lib/services/price-cache";
import { normalizeSymbol } from "@/lib/services/yahoo-finance";
import { withAuth } from "@/lib/utils/with-auth";

// Types that can have live prices
const tradeableTypes = ["stock", "etf", "crypto"] as const;

/**
 * Result for a single holding's cached price.
 */
interface CachedPriceResult {
  holdingId: string;
  symbol: string;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  changeAbsolute: number | null;
  fetchedAt: Date | null;
  isStale: boolean;
}

/**
 * Result for a single holding's price refresh.
 */
interface PriceRefreshResult {
  holdingId: string;
  symbol: string;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  isStale: boolean;
  error?: string;
}

/**
 * POST /api/prices/refresh
 *
 * Refreshes prices for tradeable holdings.
 * Accepts optional `holding_ids` array in request body.
 * If omitted, refreshes all tradeable holdings.
 *
 * @returns Array of price refresh results
 */
export const POST = withAuth(async (request, _context, userId) => {
  // Parse request body for optional holding IDs
  let holdingIds: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    holdingIds = body.holding_ids;
  } catch {
    // Empty body is fine
  }

  // Build query conditions
  const conditions = [
    eq(holdings.userId, userId),
    isNull(holdings.deletedAt),
    eq(holdings.isActive, true),
  ];

  // Fetch holdings to refresh
  let holdingsToRefresh;
  if (holdingIds && holdingIds.length > 0) {
    // Filter to only requested holdings
    conditions.push(inArray(holdings.id, holdingIds));
    holdingsToRefresh = await db
      .select()
      .from(holdings)
      .where(and(...conditions));
  } else {
    // Get all tradeable holdings
    holdingsToRefresh = await db
      .select()
      .from(holdings)
      .where(and(...conditions));
  }

  // Filter to only tradeable holdings with symbols
  const tradeableHoldings = holdingsToRefresh.filter(
    (h) =>
      tradeableTypes.includes(h.type as (typeof tradeableTypes)[number]) &&
      h.symbol
  );

  // Fetch prices in parallel
  const results: PriceRefreshResult[] = await Promise.all(
    tradeableHoldings.map(async (holding) => {
      if (!holding.symbol) {
        return {
          holdingId: holding.id,
          symbol: "",
          price: null,
          currency: null,
          changePercent: null,
          isStale: true,
          error: "Holding has no symbol",
        };
      }

      try {
        const priceResult: PriceResult = await fetchPrice(
          {
            type: holding.type,
            symbol: holding.symbol,
            exchange: holding.exchange,
            currency: holding.currency,
          },
          { forceRefresh: true }
        );

        return {
          holdingId: holding.id,
          symbol: holding.symbol,
          price: priceResult.price,
          currency: priceResult.currency,
          changePercent: priceResult.changePercent,
          isStale: priceResult.isStale,
          error: priceResult.error,
        };
      } catch (error) {
        return {
          holdingId: holding.id,
          symbol: holding.symbol,
          price: null,
          currency: null,
          changePercent: null,
          isStale: true,
          error: error instanceof Error ? error.message : "Failed to fetch price",
        };
      }
    })
  );

  return NextResponse.json(results);
}, "refreshing prices");

/**
 * GET /api/prices
 *
 * Returns cached prices for all tradeable holdings.
 * Includes staleness indicator based on TTL (15 minutes).
 *
 * @returns Array of cached price results with staleness indicators
 */
export const GET = withAuth(async (_request, _context, userId) => {
  // Fetch all active tradeable holdings for the user
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

  // Filter to only tradeable holdings with symbols
  const tradeableHoldings = userHoldings.filter(
    (h) =>
      tradeableTypes.includes(h.type as (typeof tradeableTypes)[number]) &&
      h.symbol
  );

  // Get cached prices for each holding
  const results: CachedPriceResult[] = await Promise.all(
    tradeableHoldings.map(async (holding) => {
      if (!holding.symbol) {
        return {
          holdingId: holding.id,
          symbol: "",
          price: null,
          currency: null,
          changePercent: null,
          changeAbsolute: null,
          fetchedAt: null,
          isStale: true,
        };
      }

      // Normalize symbol for cache lookup (same as in price-fetcher)
      const cacheSymbol =
        holding.type === "crypto"
          ? holding.symbol.toUpperCase()
          : normalizeSymbol(holding.symbol, holding.exchange);

      const cached = await getCachedPrice(cacheSymbol);

      if (!cached) {
        // No cached price available
        return {
          holdingId: holding.id,
          symbol: holding.symbol,
          price: null,
          currency: null,
          changePercent: null,
          changeAbsolute: null,
          fetchedAt: null,
          isStale: true,
        };
      }

      // Check if cache is stale
      const isStale = !isCacheValid(cached, DEFAULT_PRICE_CACHE_TTL_MINUTES);

      return {
        holdingId: holding.id,
        symbol: holding.symbol,
        price: cached.price,
        currency: cached.currency,
        changePercent: cached.changePercent,
        changeAbsolute: cached.changeAbsolute,
        fetchedAt: cached.fetchedAt,
        isStale,
      };
    })
  );

  return NextResponse.json(results);
}, "fetching cached prices");
