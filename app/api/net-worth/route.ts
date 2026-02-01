import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { calculateNetWorth } from "@/lib/calculations/net-worth";

/**
 * GET /api/net-worth
 *
 * Returns the current net worth calculation for the authenticated user.
 *
 * Query parameters:
 *   - refresh: If "true", forces a fresh calculation (default behavior is to calculate fresh)
 *
 * Response:
 *   - netWorth: Total net worth (assets - debt) in AUD
 *   - totalAssets: Total assets (not including debt) in AUD
 *   - totalDebt: Total debt in AUD
 *   - breakdown: Array of asset type breakdowns with holdings
 *   - staleHoldings: Holdings with stale data affecting accuracy
 *   - calculatedAt: Timestamp when calculation was performed
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Note: refresh parameter is documented for future use but currently all calculations
  // are fresh. In the future, this could be used to return a cached result vs fresh calculation.
  // The parameter is read but currently has no effect on behavior.
  const searchParams = request.nextUrl.searchParams;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const refresh = searchParams.get("refresh") === "true";

  try {
    const result = await calculateNetWorth(userId);

    return NextResponse.json({
      netWorth: result.netWorth,
      totalAssets: result.totalAssets,
      totalDebt: result.totalDebt,
      breakdown: result.breakdown,
      staleHoldings: result.staleHoldings,
      hasStaleData: result.hasStaleData,
      calculatedAt: result.calculatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error calculating net worth:", error);
    return NextResponse.json(
      { error: "Failed to calculate net worth" },
      { status: 500 }
    );
  }
}
