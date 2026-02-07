import { NextResponse } from "next/server";
import { calculateCurrencyExposure } from "@/lib/calculations/net-worth";
import type { Currency } from "@/lib/utils/currency";
import { withAuth } from "@/lib/utils/with-auth";

const VALID_CURRENCIES = ["AUD", "NZD", "USD"] as const;

/**
 * GET /api/currency-exposure
 *
 * Returns the currency exposure breakdown for the authenticated user.
 * Shows how assets are distributed across different currencies (AUD, NZD, USD).
 *
 * Query parameters:
 *   - displayCurrency: Currency for display values (AUD, NZD, USD). Defaults to AUD.
 *
 * Response:
 *   - exposure: Array of currency exposure items with value, valueNative, percentage, count
 *   - totalAssets: Total assets value in display currency
 *   - displayCurrency: Currency used for values
 *   - ratesUsed: Exchange rates used for conversion
 *   - calculatedAt: Timestamp when calculation was performed
 */
export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;

  // Parse display currency parameter
  const displayCurrencyParam = searchParams.get("displayCurrency");
  let displayCurrency: Currency = "AUD";
  if (displayCurrencyParam) {
    if (VALID_CURRENCIES.includes(displayCurrencyParam as Currency)) {
      displayCurrency = displayCurrencyParam as Currency;
    }
    // Invalid currency silently falls back to AUD
  }

  const result = await calculateCurrencyExposure(userId, { displayCurrency });

  return NextResponse.json({
    exposure: result.exposure,
    totalAssets: result.totalAssets,
    displayCurrency: result.displayCurrency,
    ratesUsed: result.ratesUsed,
    calculatedAt: result.calculatedAt.toISOString(),
  });
}, "calculating currency exposure");
