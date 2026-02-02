/**
 * Unified price fetcher service.
 *
 * Provides a single interface to fetch prices for any holding type,
 * routing to the appropriate provider (Yahoo Finance for stocks/ETFs,
 * CoinGecko for crypto).
 *
 * Handles caching, fallback to stale prices on fetch failure, and
 * returns consistent PriceResult objects.
 */

import { Holding } from "@/lib/db/schema";
import { fetchStockPrice, normalizeSymbol, YahooFinanceError } from "./yahoo-finance";
import { fetchCryptoPrice, CoinGeckoError } from "./coingecko";
import {
  getCachedPrice,
  setCachedPrice,
  isCacheValid,
  DEFAULT_PRICE_CACHE_TTL_MINUTES,
  CachedPrice,
  PriceDataToCache,
} from "./price-cache";
import { withRetry, isTransientError } from "@/lib/utils/retry";

/**
 * Result of a price fetch operation.
 */
export interface PriceResult {
  /** Current price in the holding's native currency */
  price: number;
  /** Currency code (AUD, NZD, USD) */
  currency: string;
  /** 24-hour change percentage (null if unavailable) */
  changePercent: number | null;
  /** 24-hour absolute change (null if unavailable) */
  changeAbsolute: number | null;
  /** When the price was fetched */
  fetchedAt: Date;
  /** Whether this is a stale cached price due to fetch failure */
  isStale: boolean;
  /** Error message if fetch failed (stale price returned) */
  error?: string;
}

/**
 * Minimal holding interface for price fetching.
 * Only requires the fields needed to determine how to fetch the price.
 */
export interface HoldingForPriceFetch {
  type: Holding["type"];
  symbol: string | null;
  exchange: string | null;
  currency: Holding["currency"];
}

/**
 * Determines if a holding is a tradeable type that can have live prices.
 */
export function isTradeableHolding(
  holding: HoldingForPriceFetch
): boolean {
  return (
    holding.type === "stock" ||
    holding.type === "etf" ||
    holding.type === "crypto"
  );
}

/**
 * Converts a CachedPrice to a PriceResult.
 */
function cachedPriceToPriceResult(
  cached: CachedPrice,
  isStale: boolean,
  error?: string
): PriceResult {
  return {
    price: cached.price,
    currency: cached.currency,
    changePercent: cached.changePercent,
    changeAbsolute: cached.changeAbsolute,
    fetchedAt: cached.fetchedAt,
    isStale,
    error,
  };
}

/**
 * Fetches the current price for a holding.
 *
 * Routes to the appropriate provider based on holding type:
 * - stock/etf: Yahoo Finance
 * - crypto: CoinGecko
 *
 * Caching behavior:
 * - Checks cache first
 * - If cache is valid (< 15 minutes old), returns cached price
 * - If cache is expired or missing, fetches fresh price
 * - Updates cache on successful fetch
 * - Returns stale cached price with isStale=true if fetch fails
 *
 * @param holding - The holding to fetch price for
 * @param options - Optional configuration
 * @returns PriceResult with current or cached price
 * @throws Error if holding is not tradeable (stock/etf/crypto)
 * @throws Error if holding has no symbol
 *
 * @example
 * // Fetch price for a stock
 * const result = await fetchPrice({
 *   type: "stock",
 *   symbol: "VAS.AX",
 *   exchange: "ASX",
 *   currency: "AUD"
 * });
 *
 * if (result.isStale) {
 *   console.warn("Using stale price:", result.error);
 * }
 */
export async function fetchPrice(
  holding: HoldingForPriceFetch,
  options: { forceRefresh?: boolean } = {}
): Promise<PriceResult> {
  // Validate holding type
  if (!isTradeableHolding(holding)) {
    throw new Error(
      `Cannot fetch price for non-tradeable holding type: ${holding.type}. ` +
        `Only stock, etf, and crypto holdings have live prices.`
    );
  }

  // Validate symbol
  if (!holding.symbol) {
    throw new Error(
      `Cannot fetch price for holding without symbol. ` +
        `Holding type "${holding.type}" requires a symbol.`
    );
  }

  // Normalize symbol for cache lookup
  const cacheSymbol =
    holding.type === "crypto"
      ? holding.symbol.toUpperCase()
      : normalizeSymbol(holding.symbol, holding.exchange);

  // Check cache first (unless force refresh)
  if (!options.forceRefresh) {
    const cached = await getCachedPrice(cacheSymbol);
    if (cached && isCacheValid(cached, DEFAULT_PRICE_CACHE_TTL_MINUTES)) {
      return cachedPriceToPriceResult(cached, false);
    }
  }

  // Attempt to fetch fresh price with retry logic
  try {
    const priceData = await withRetry(
      () => fetchPriceFromProvider(holding),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        isRetryable: isTransientError,
        onRetry: (attempt, error, delayMs) => {
          console.log(
            `[PriceFetcher] Retry ${attempt} for ${cacheSymbol} after ${delayMs}ms:`,
            error instanceof Error ? error.message : "Unknown error"
          );
        },
      }
    );

    // Update cache
    const cacheData: PriceDataToCache = {
      price: priceData.price,
      currency: priceData.currency as "AUD" | "NZD" | "USD",
      changePercent: priceData.changePercent,
      changeAbsolute: priceData.changeAbsolute,
      source: holding.type === "crypto" ? "coingecko" : "yahoo",
    };
    await setCachedPrice(cacheSymbol, cacheData);

    // Return fresh result
    return {
      price: priceData.price,
      currency: priceData.currency,
      changePercent: priceData.changePercent,
      changeAbsolute: priceData.changeAbsolute,
      fetchedAt: new Date(),
      isStale: false,
    };
  } catch (error) {
    // All retries failed - log and try to return stale cached price
    console.log(
      `[PriceFetcher] All retries exhausted for ${cacheSymbol}:`,
      error instanceof Error ? error.message : "Unknown error"
    );

    const cached = await getCachedPrice(cacheSymbol);
    if (cached) {
      const errorMessage = getErrorMessage(error);
      return cachedPriceToPriceResult(cached, true, errorMessage);
    }

    // No cache available - re-throw the error
    throw error;
  }
}

/**
 * Fetches price from the appropriate provider based on holding type.
 */
async function fetchPriceFromProvider(
  holding: HoldingForPriceFetch
): Promise<{
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
}> {
  if (!holding.symbol) {
    throw new Error("Holding must have a symbol to fetch price");
  }

  if (holding.type === "crypto") {
    return fetchCryptoPrice(holding.symbol);
  }

  // stock or etf
  return fetchStockPrice(holding.symbol, holding.exchange);
}

/**
 * Extracts a user-friendly error message from various error types.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof YahooFinanceError) {
    return error.message;
  }
  if (error instanceof CoinGeckoError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error occurred while fetching price";
}

/**
 * Fetches prices for multiple holdings in parallel.
 *
 * Returns a map of holding IDs to their price results.
 * Failed fetches will either return stale cached prices or be omitted.
 *
 * @param holdings - Array of holdings with IDs to fetch prices for
 * @param options - Optional configuration
 * @returns Map of holding ID to PriceResult
 *
 * @example
 * const results = await fetchPricesForHoldings(holdings);
 * for (const [holdingId, result] of results) {
 *   console.log(`${holdingId}: $${result.price} (stale: ${result.isStale})`);
 * }
 */
export async function fetchPricesForHoldings(
  holdings: (HoldingForPriceFetch & { id: string })[],
  options: { forceRefresh?: boolean } = {}
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Filter to only tradeable holdings with symbols
  const tradeableHoldings = holdings.filter(
    (h) => isTradeableHolding(h) && h.symbol
  );

  // Fetch all prices in parallel
  const fetchPromises = tradeableHoldings.map(async (holding) => {
    try {
      const result = await fetchPrice(holding, options);
      return { holdingId: holding.id, result };
    } catch (error) {
      // If we can't get even a cached price, return an error result
      return {
        holdingId: holding.id,
        result: null,
        error: getErrorMessage(error),
      };
    }
  });

  const fetchResults = await Promise.all(fetchPromises);

  for (const fetchResult of fetchResults) {
    if (fetchResult.result) {
      results.set(fetchResult.holdingId, fetchResult.result);
    }
    // Holdings that failed completely are omitted from results
  }

  return results;
}
