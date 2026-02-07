import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { fetchSparklineData } from "@/lib/services/sparkline-data";
import { withAuth } from "@/lib/utils/with-auth";

const tradeableTypes = ["stock", "etf", "crypto"] as const;

/**
 * Sparkline result per holding returned to the client.
 */
interface SparklineResponse {
  holdingId: string;
  symbol: string;
  prices: number[];
}

/**
 * GET /api/prices/sparkline
 *
 * Batch-fetches 30-day historical prices for all tradeable holdings.
 * Returns an array of { holdingId, symbol, prices: number[] }.
 */
export const GET = withAuth(async (_request, _context, userId) => {
  // Fetch all active tradeable holdings
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

  const tradeableHoldings = userHoldings.filter(
    (h) =>
      tradeableTypes.includes(h.type as (typeof tradeableTypes)[number]) &&
      h.symbol
  );

  // Fetch sparkline data in parallel
  const results: SparklineResponse[] = await Promise.all(
    tradeableHoldings.map(async (holding) => {
      if (!holding.symbol) {
        return { holdingId: holding.id, symbol: "", prices: [] };
      }

      const result = await fetchSparklineData(
        holding.type,
        holding.symbol,
        holding.exchange
      );

      return {
        holdingId: holding.id,
        symbol: holding.symbol,
        prices: result.prices,
      };
    })
  );

  return NextResponse.json(results);
}, "fetching sparkline data");
