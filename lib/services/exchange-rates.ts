/**
 * Exchange rate service for fetching currency conversion rates.
 *
 * Uses exchangerate-api.com for fetching live exchange rates.
 * Supports optional EXCHANGE_RATE_API_KEY env var for authenticated requests.
 * Free tier: 1500 requests/month
 */

export type SupportedCurrency = "USD" | "AUD" | "NZD";

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
  conversion_rates?: Record<string, number>;
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
    if (!data.conversion_rates) {
      throw new ExchangeRateError(
        `No conversion rates returned for ${normalizedFrom}`,
        normalizedFrom,
        normalizedTo
      );
    }

    // Get the rate for target currency
    const rate = data.conversion_rates[normalizedTo];

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
