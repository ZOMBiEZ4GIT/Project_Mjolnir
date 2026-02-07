import { NextResponse } from "next/server";
import { calculateHistoricalNetWorth } from "@/lib/calculations/net-worth-history";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/net-worth/history
 *
 * Returns historical net worth data for the authenticated user.
 *
 * Query parameters:
 *   - months: Number of months of history to return (default 12, max 60)
 *
 * Response:
 *   - history: Array of monthly data points with date, netWorth, totalAssets, totalDebt
 *   - generatedAt: Timestamp when calculation was performed
 *
 * Note: For tradeable assets, historical values use current prices since
 * historical prices are not stored. This means values are estimates based
 * on current prices multiplied by quantity held at that time.
 */
export const GET = withAuth(async (request, _context, userId) => {
  // Parse months parameter with validation
  const searchParams = request.nextUrl.searchParams;
  const monthsParam = searchParams.get("months");
  let months = 12; // default

  if (monthsParam) {
    const parsed = parseInt(monthsParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "Invalid months parameter. Must be a positive integer." },
        { status: 400 }
      );
    }
    // Cap at 60 months (5 years) to prevent excessive computation
    months = Math.min(parsed, 60);
  }

  const result = await calculateHistoricalNetWorth(userId, months);

  return NextResponse.json({
    history: result.history.map((point) => ({
      date: point.date.toISOString(),
      netWorth: point.netWorth,
      totalAssets: point.totalAssets,
      totalDebt: point.totalDebt,
    })),
    generatedAt: result.generatedAt.toISOString(),
  });
}, "calculating historical net worth");
