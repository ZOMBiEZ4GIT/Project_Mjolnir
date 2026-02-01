import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import {
  fetchPrice,
  PriceResult,
} from "@/lib/services/price-fetcher";

// Types that can have live prices
const tradeableTypes = ["stock", "etf", "crypto"] as const;

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
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
