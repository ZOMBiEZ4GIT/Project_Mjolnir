import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { calculateCurrencyExposure } from "@/lib/calculations/net-worth";
import type { Currency } from "@/lib/utils/currency";

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
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const result = await calculateCurrencyExposure(userId, { displayCurrency });

    return NextResponse.json({
      exposure: result.exposure,
      totalAssets: result.totalAssets,
      displayCurrency: result.displayCurrency,
      ratesUsed: result.ratesUsed,
      calculatedAt: result.calculatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error calculating currency exposure:", error);
    return NextResponse.json(
      { error: "Failed to calculate currency exposure" },
      { status: 500 }
    );
  }
}
