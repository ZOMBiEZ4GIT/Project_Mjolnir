import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { fetchSparklineData } from "@/lib/services/sparkline-data";

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
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
