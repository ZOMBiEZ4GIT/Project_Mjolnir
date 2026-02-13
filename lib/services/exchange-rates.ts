/**
 * Exchange rate service for fetching currency conversion rates.
 *
 * Uses exchangerate-api.com for fetching live exchange rates.
 * Supports optional EXCHANGE_RATE_API_KEY env var for authenticated requests.
 * Free tier: 1500 requests/month
 *
 * Includes caching with 1-hour TTL.
 */

import { db } from "@/lib/db";
import { exchangeRates, ExchangeRate, NewExchangeRate } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type SupportedCurrency = "USD" | "AUD" | "NZD";

// Default cache TTL in minutes for exchange rates (1 hour)
export const DEFAULT_EXCHANGE_RATE_TTL_MINUTES = 60;

/**
 * Custom error for exchange rate operations
 */
export class ExchangeRateError extends Error {
  constructor(
    message: string,
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

/**
 * exchangerate-api.com response structure
 */
interface ExchangeRateApiResponse {
  result: "success" | "error";
  base_code?: string;
  /** Authenticated endpoint uses conversion_rates */
  conversion_rates?: Record<string, number>;
  /** Free endpoint (open.er-api.com) uses rates */
  rates?: Record<string, number>;
  error?: string;
  "error-type"?: string;
}

/**
 * Supported currency pairs for exchange rate fetching.
 * We support conversion between AUD, NZD, and USD.
 */
const SUPPORTED_PAIRS: Array<[SupportedCurrency, SupportedCurrency]> = [
  ["USD", "AUD"],
  ["NZD", "AUD"],
  ["USD", "NZD"],
  ["AUD", "USD"],
  ["AUD", "NZD"],
  ["NZD", "USD"],
];

/**
 * Validates that a currency pair is supported.
 */
function isSupportedPair(from: string, to: string): boolean {
  const normalizedFrom = from.toUpperCase().trim();
  const normalizedTo = to.toUpperCase().trim();

  return SUPPORTED_PAIRS.some(
    ([f, t]) => f === normalizedFrom && t === normalizedTo
  );
}

/**
 * Builds the exchangerate-api.com URL.
 *
 * Uses the free API endpoint if no key is provided, otherwise uses the authenticated endpoint.
 */
function buildApiUrl(baseCurrency: string): string {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const normalizedBase = baseCurrency.toUpperCase().trim();

  if (apiKey) {
    // Authenticated endpoint (higher rate limits)
    return `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${normalizedBase}`;
  }

  // Free endpoint (limited to 1500 requests/month)
  return `https://open.er-api.com/v6/latest/${normalizedBase}`;
}

/**
 * Fetches the exchange rate between two currencies.
 *
 * @param from - Source currency code (e.g., "USD", "NZD")
 * @param to - Target currency code (e.g., "AUD")
 * @returns Promise<number> - The exchange rate (e.g., 1.53 for USD to AUD)
 * @throws ExchangeRateError on network failure, invalid currency, or API error
 *
 * @example
 * // Get USD to AUD rate
 * const rate = await fetchExchangeRate("USD", "AUD");
 * // rate = 1.53 (meaning 1 USD = 1.53 AUD)
 *
 * @example
 * // Convert 100 USD to AUD
 * const rate = await fetchExchangeRate("USD", "AUD");
 * const audAmount = 100 * rate; // 153 AUD
 */
export async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number> {
  const normalizedFrom = from.toUpperCase().trim() as SupportedCurrency;
  const normalizedTo = to.toUpperCase().trim() as SupportedCurrency;

  // Validate currency pair
  if (!isSupportedPair(normalizedFrom, normalizedTo)) {
    throw new ExchangeRateError(
      `Unsupported currency pair: ${normalizedFrom}/${normalizedTo}. Supported pairs: USD/AUD, NZD/AUD, USD/NZD and their inverses.`,
      normalizedFrom,
      normalizedTo
    );
  }

  // Same currency = rate of 1
  if (normalizedFrom === normalizedTo) {
    return 1;
  }

  const url = buildApiUrl(normalizedFrom);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      throw new ExchangeRateError(
        `Exchange rate API returned status ${response.status}: ${response.statusText}`,
        normalizedFrom,
        normalizedTo,
        response.status
      );
    }

    const data: ExchangeRateApiResponse = await response.json();

    // Handle API-level errors
    if (data.result === "error") {
      const errorMessage = data["error-type"] || data.error || "Unknown error";
      throw new ExchangeRateError(
        `Exchange rate API error: ${errorMessage}`,
        normalizedFrom,
        normalizedTo
      );
    }

    // Validate response has conversion rates
    // Free endpoint returns "rates", authenticated endpoint returns "conversion_rates"
    const ratesMap = data.conversion_rates ?? data.rates;
    if (!ratesMap) {
      throw new ExchangeRateError(
        `No conversion rates returned for ${normalizedFrom}`,
        normalizedFrom,
        normalizedTo
      );
    }

    // Get the rate for target currency
    const rate = ratesMap[normalizedTo];

    if (rate === undefined || rate === null) {
      throw new ExchangeRateError(
        `No rate found for ${normalizedFrom} to ${normalizedTo}`,
        normalizedFrom,
        normalizedTo
      );
    }

    return rate;
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof ExchangeRateError) {
      throw error;
    }

    // Handle fetch/network errors
    if (error instanceof Error) {
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        throw new ExchangeRateError(
          `Network error fetching exchange rate for ${normalizedFrom}/${normalizedTo}. Please check your internet connection.`,
          normalizedFrom,
          normalizedTo,
          undefined,
          error
        );
      }

      throw new ExchangeRateError(
        `Failed to fetch exchange rate for ${normalizedFrom}/${normalizedTo}: ${error.message}`,
        normalizedFrom,
        normalizedTo,
        undefined,
        error
      );
    }

    // Unknown error type
    throw new ExchangeRateError(
      `Unknown error fetching exchange rate for ${normalizedFrom}/${normalizedTo}`,
      normalizedFrom,
      normalizedTo,
      undefined,
      error
    );
  }
}

// =============================================================================
// CACHING FUNCTIONS
// =============================================================================

/**
 * Cached exchange rate data returned from the cache.
 */
export interface CachedExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: Date;
}

/**
 * Converts a database ExchangeRate row to our CachedExchangeRate interface.
 * Handles decimal string to number conversions.
 */
function toCachedExchangeRate(row: ExchangeRate): CachedExchangeRate {
  return {
    id: row.id,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: Number(row.rate),
    fetchedAt: row.fetchedAt,
  };
}

/**
 * Checks if a cached exchange rate is still valid based on TTL.
 *
 * @param cachedRate - The cached rate to check
 * @param ttlMinutes - Time-to-live in minutes (default: 60)
 * @returns true if the cache is still valid, false if expired
 */
export function isExchangeRateCacheValid(
  cachedRate: CachedExchangeRate,
  ttlMinutes: number = DEFAULT_EXCHANGE_RATE_TTL_MINUTES
): boolean {
  const now = new Date();
  const fetchedAt = cachedRate.fetchedAt;
  const ageMs = now.getTime() - fetchedAt.getTime();
  const ttlMs = ttlMinutes * 60 * 1000;

  return ageMs < ttlMs;
}

/**
 * Gets a cached exchange rate for a given currency pair.
 *
 * @param from - Source currency code (e.g., "USD")
 * @param to - Target currency code (e.g., "AUD")
 * @returns The cached rate if found and not expired, null otherwise
 *
 * @example
 * const rate = await getCachedRate("USD", "AUD");
 * if (rate !== null) {
 *   console.log(`Cached rate: 1 USD = ${rate} AUD`);
 * }
 */
export async function getCachedRate(
  from: string,
  to: string
): Promise<number | null> {
  const normalizedFrom = from.toUpperCase().trim();
  const normalizedTo = to.toUpperCase().trim();

  // Same currency = rate of 1
  if (normalizedFrom === normalizedTo) {
    return 1;
  }

  const rows = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, normalizedFrom),
        eq(exchangeRates.toCurrency, normalizedTo)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const cached = toCachedExchangeRate(rows[0]);

  // Return null if cache is expired
  if (!isExchangeRateCacheValid(cached)) {
    return null;
  }

  return cached.rate;
}

/**
 * Sets (upserts) a cached exchange rate for a given currency pair.
 * If a cache entry exists for the pair, it will be updated.
 * If no entry exists, a new one will be created.
 *
 * @param from - Source currency code (e.g., "USD")
 * @param to - Target currency code (e.g., "AUD")
 * @param rate - The exchange rate to cache
 */
async function setCachedRate(
  from: string,
  to: string,
  rate: number
): Promise<void> {
  const normalizedFrom = from.toUpperCase().trim();
  const normalizedTo = to.toUpperCase().trim();
  const now = new Date();

  const newCacheEntry: NewExchangeRate = {
    fromCurrency: normalizedFrom,
    toCurrency: normalizedTo,
    rate: rate.toString(),
    fetchedAt: now,
  };

  // Check if entry exists for this currency pair
  const existing = await db
    .select({ id: exchangeRates.id })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, normalizedFrom),
        eq(exchangeRates.toCurrency, normalizedTo)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing entry
    await db
      .update(exchangeRates)
      .set({
        rate: newCacheEntry.rate,
        fetchedAt: newCacheEntry.fetchedAt,
      })
      .where(
        and(
          eq(exchangeRates.fromCurrency, normalizedFrom),
          eq(exchangeRates.toCurrency, normalizedTo)
        )
      );
  } else {
    // Insert new entry
    await db.insert(exchangeRates).values(newCacheEntry);
  }
}

/**
 * Gets an exchange rate, using cache if available and not expired.
 * If the cache is expired or missing, fetches fresh rate and updates cache.
 *
 * This is the main function to use for getting exchange rates - it handles
 * caching automatically.
 *
 * @param from - Source currency code (e.g., "USD")
 * @param to - Target currency code (e.g., "AUD")
 * @returns Promise<number> - The exchange rate (e.g., 1.53 for USD to AUD)
 * @throws ExchangeRateError on network failure, invalid currency, or API error
 *
 * @example
 * // Get USD to AUD rate (uses cache if available)
 * const rate = await getExchangeRate("USD", "AUD");
 * console.log(`1 USD = ${rate} AUD`);
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const normalizedFrom = from.toUpperCase().trim();
  const normalizedTo = to.toUpperCase().trim();

  // Same currency = rate of 1
  if (normalizedFrom === normalizedTo) {
    return 1;
  }

  // Check cache first
  const cachedRate = await getCachedRate(normalizedFrom, normalizedTo);
  if (cachedRate !== null) {
    return cachedRate;
  }

  // Fetch fresh rate
  const freshRate = await fetchExchangeRate(normalizedFrom, normalizedTo);

  // Update cache
  await setCachedRate(normalizedFrom, normalizedTo, freshRate);

  return freshRate;
}

/**
 * Gets all cached exchange rates from the database.
 *
 * @returns Array of all cached exchange rates
 */
export async function getAllCachedRates(): Promise<CachedExchangeRate[]> {
  const rows = await db.select().from(exchangeRates);
  return rows.map(toCachedExchangeRate);
}
