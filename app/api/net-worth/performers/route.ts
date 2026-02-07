import { NextResponse } from "next/server";
import { getTopPerformers } from "@/lib/calculations/performers";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/net-worth/performers
 *
 * Returns top gaining and losing holdings for the authenticated user.
 *
 * Query parameters:
 *   - limit: Maximum number of gainers and losers to return (default 5, max 20)
 *
 * Response:
 *   - gainers: Array of top gaining holdings with gain/loss details
 *   - losers: Array of top losing holdings with gain/loss details
 *   - calculatedAt: Timestamp when calculation was performed
 *
 * Note: Only tradeable holdings (stocks, ETFs, crypto) with a position,
 * price, and cost basis are included in the results.
 */
export const GET = withAuth(async (request, _context, userId) => {
  // Parse limit parameter with validation
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  let limit = 5; // default

  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be a positive integer." },
        { status: 400 }
      );
    }
    // Cap at 20 to prevent excessive data
    limit = Math.min(parsed, 20);
  }

  const result = await getTopPerformers(userId, limit);

  return NextResponse.json({
    gainers: result.gainers,
    losers: result.losers,
    calculatedAt: result.calculatedAt.toISOString(),
  });
}, "calculating top performers");
