import yahooFinance from "yahoo-finance2";

/**
 * Price data returned from Yahoo Finance
 */
export interface PriceData {
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
}

/**
 * Custom error for Yahoo Finance operations
 */
export class YahooFinanceError extends Error {
  constructor(
    message: string,
    public readonly symbol: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "YahooFinanceError";
  }
}

/**
 * Normalizes a stock symbol by adding exchange suffix if not present.
 *
 * - ASX stocks: appends .AX (e.g., VAS -> VAS.AX)
 * - NZX stocks: appends .NZ (e.g., AIR -> AIR.NZ)
 * - US stocks: no suffix needed (e.g., AAPL, MSFT)
 *
 * @param symbol - The stock symbol to normalize
 * @param exchange - Optional exchange hint (ASX, NZX, NYSE, NASDAQ)
 * @returns The normalized symbol with appropriate suffix
 */
export function normalizeSymbol(
  symbol: string,
  exchange?: string | null
): string {
  const upperSymbol = symbol.toUpperCase().trim();

  // If symbol already has a suffix, return as-is
  if (upperSymbol.includes(".")) {
    return upperSymbol;
  }

  // Add suffix based on exchange
  if (exchange) {
    const upperExchange = exchange.toUpperCase();
    if (upperExchange === "ASX") {
      return `${upperSymbol}.AX`;
    }
    if (upperExchange === "NZX") {
      return `${upperSymbol}.NZ`;
    }
  }

  // Default: no suffix for US markets
  return upperSymbol;
}

/**
 * Fetches the current stock/ETF price from Yahoo Finance.
 *
 * @param symbol - The stock ticker symbol (e.g., "AAPL", "VAS.AX", "AIR.NZ")
 * @param exchange - Optional exchange hint for symbol normalization
 * @returns Promise<PriceData> with price, currency, and daily change info
 * @throws YahooFinanceError on network failure or invalid symbol
 *
 * @example
 * // US stock
 * const apple = await fetchStockPrice("AAPL");
 *
 * @example
 * // ASX stock with suffix
 * const vas = await fetchStockPrice("VAS.AX");
 *
 * @example
 * // ASX stock with exchange hint
 * const bhp = await fetchStockPrice("BHP", "ASX");
 */
export async function fetchStockPrice(
  symbol: string,
  exchange?: string | null
): Promise<PriceData> {
  const normalizedSymbol = normalizeSymbol(symbol, exchange);

  try {
    const quote = await yahooFinance.quote(normalizedSymbol);

    if (!quote) {
      throw new YahooFinanceError(
        `No quote data returned for symbol: ${normalizedSymbol}`,
        normalizedSymbol
      );
    }

    const { regularMarketPrice, currency, regularMarketChange, regularMarketChangePercent } =
      quote;

    if (regularMarketPrice === undefined || regularMarketPrice === null) {
      throw new YahooFinanceError(
        `No price available for symbol: ${normalizedSymbol}`,
        normalizedSymbol
      );
    }

    if (!currency) {
      throw new YahooFinanceError(
        `No currency information for symbol: ${normalizedSymbol}`,
        normalizedSymbol
      );
    }

    return {
      price: regularMarketPrice,
      currency,
      changePercent: regularMarketChangePercent ?? null,
      changeAbsolute: regularMarketChange ?? null,
    };
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof YahooFinanceError) {
      throw error;
    }

    // Handle specific Yahoo Finance errors
    if (error instanceof Error) {
      // Invalid symbol errors
      if (
        error.message.includes("Not Found") ||
        error.message.includes("Quote not found") ||
        error.message.includes("no results")
      ) {
        throw new YahooFinanceError(
          `Invalid symbol: ${normalizedSymbol}. Please verify the ticker is correct.`,
          normalizedSymbol,
          error
        );
      }

      // Network errors
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("network")
      ) {
        throw new YahooFinanceError(
          `Network error fetching ${normalizedSymbol}. Please check your internet connection.`,
          normalizedSymbol,
          error
        );
      }

      // Generic error wrapping
      throw new YahooFinanceError(
        `Failed to fetch price for ${normalizedSymbol}: ${error.message}`,
        normalizedSymbol,
        error
      );
    }

    // Unknown error type
    throw new YahooFinanceError(
      `Unknown error fetching price for ${normalizedSymbol}`,
      normalizedSymbol,
      error
    );
  }
}
