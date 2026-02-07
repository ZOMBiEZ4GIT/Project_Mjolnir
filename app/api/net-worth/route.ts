import { NextResponse } from "next/server";
import { calculateNetWorth } from "@/lib/calculations/net-worth";
import type { Currency } from "@/lib/utils/currency";
import { withAuth } from "@/lib/utils/with-auth";

const VALID_CURRENCIES = ["AUD", "NZD", "USD"] as const;

/**
 * GET /api/net-worth
 *
 * Returns the current net worth calculation for the authenticated user.
 *
 * Query parameters:
 *   - refresh: If "true", forces a fresh calculation (default behavior is to calculate fresh)
 *   - displayCurrency: Currency for display values (AUD, NZD, USD). Defaults to AUD.
 *
 * Response:
 *   - netWorth: Total net worth (assets - debt) in display currency
 *   - totalAssets: Total assets (not including debt) in display currency
 *   - totalDebt: Total debt in display currency
 *   - breakdown: Array of asset type breakdowns with holdings (in display currency)
 *   - staleHoldings: Holdings with stale data affecting accuracy
 *   - displayCurrency: Currency used for values
 *   - ratesUsed: Exchange rates used for conversion
 *   - calculatedAt: Timestamp when calculation was performed
 */
export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;

  // Note: refresh parameter is documented for future use but currently all calculations
  // are fresh. In the future, this could be used to return a cached result vs fresh calculation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const refresh = searchParams.get("refresh") === "true";

  // Parse display currency parameter
  const displayCurrencyParam = searchParams.get("displayCurrency");
  let displayCurrency: Currency = "AUD";
  if (displayCurrencyParam) {
    if (VALID_CURRENCIES.includes(displayCurrencyParam as Currency)) {
      displayCurrency = displayCurrencyParam as Currency;
    }
    // Invalid currency silently falls back to AUD
  }

  const result = await calculateNetWorth(userId, { displayCurrency });

  return NextResponse.json({
    netWorth: result.netWorth,
    totalAssets: result.totalAssets,
    totalDebt: result.totalDebt,
    breakdown: result.breakdown,
    staleHoldings: result.staleHoldings,
    hasStaleData: result.hasStaleData,
    displayCurrency: result.displayCurrency,
    ratesUsed: result.ratesUsed,
    calculatedAt: result.calculatedAt.toISOString(),
  });
}, "calculating net worth");
