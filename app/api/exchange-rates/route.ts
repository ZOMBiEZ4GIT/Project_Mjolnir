import { NextResponse } from "next/server";
import {
  getAllCachedRates,
  getExchangeRate,
  isExchangeRateCacheValid,
  DEFAULT_EXCHANGE_RATE_TTL_MINUTES,
} from "@/lib/services/exchange-rates";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * Currency pairs to refresh when `?refresh=true` is requested.
 * These are the primary pairs we need for display in AUD.
 */
const PAIRS_TO_REFRESH: Array<[string, string]> = [
  ["USD", "AUD"],
  ["NZD", "AUD"],
];

/**
 * Response structure for exchange rates endpoint.
 */
interface ExchangeRatesResponse {
  rates: Record<string, number>;
  fetchedAt: Date | null;
  isStale: boolean;
}

/**
 * GET /api/exchange-rates
 *
 * Returns all cached exchange rates.
 * Supports `?refresh=true` query parameter to force refresh.
 *
 * @returns { rates: { 'USD/AUD': 1.53, 'NZD/AUD': 0.92 }, fetchedAt, isStale }
 */
export const GET = withAuth(async (request, _context, _userId) => {
  // Check for refresh flag
  const searchParams = request.nextUrl.searchParams;
  const shouldRefresh = searchParams.get("refresh") === "true";

  if (shouldRefresh) {
    // Force refresh all pairs
    try {
      await Promise.all(
        PAIRS_TO_REFRESH.map(([from, to]) => getExchangeRate(from, to))
      );
    } catch (error) {
      // Log error but continue - will return stale data if available
      console.error("Error refreshing exchange rates:", error);
    }
  }

  // Get all cached rates
  const cachedRates = await getAllCachedRates();

  // Convert to response format: { 'USD/AUD': 1.53, ... }
  const rates: Record<string, number> = {};
  let oldestFetchedAt: Date | null = null;
  let hasStaleData = false;

  for (const cached of cachedRates) {
    const key = `${cached.fromCurrency}/${cached.toCurrency}`;
    rates[key] = cached.rate;

    // Track oldest fetchedAt for the response
    if (oldestFetchedAt === null || cached.fetchedAt < oldestFetchedAt) {
      oldestFetchedAt = cached.fetchedAt;
    }

    // Check if any rate is stale
    if (!isExchangeRateCacheValid(cached, DEFAULT_EXCHANGE_RATE_TTL_MINUTES)) {
      hasStaleData = true;
    }
  }

  const response: ExchangeRatesResponse = {
    rates,
    fetchedAt: oldestFetchedAt,
    isStale: hasStaleData || cachedRates.length === 0,
  };

  return NextResponse.json(response);
}, "fetching exchange rates");
