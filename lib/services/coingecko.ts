/**
 * CoinGecko price service for fetching cryptocurrency prices.
 *
 * Supports optional API key for higher rate limits via COINGECKO_API_KEY env var.
 * Free tier: 10-30 calls/minute
 * Pro tier (with API key): Higher limits
 */

// Re-export PriceData type for consistency with yahoo-finance.ts
export interface PriceData {
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
}

/**
 * Custom error for CoinGecko operations
 */
export class CoinGeckoError extends Error {
  constructor(
    message: string,
    public readonly symbol: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

/**
 * Maps common crypto symbols to CoinGecko IDs.
 * CoinGecko uses lowercase slug-style IDs (e.g., "bitcoin", "ethereum").
 */
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Top cryptocurrencies by market cap
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  USDC: "usd-coin",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  TRX: "tron",
  LINK: "chainlink",
  MATIC: "matic-network",
  TON: "the-open-network",
  SHIB: "shiba-inu",
  DAI: "dai",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  UNI: "uniswap",
  XLM: "stellar",
  XMR: "monero",
  ETC: "ethereum-classic",
  FIL: "filecoin",
  HBAR: "hedera-hashgraph",
  APT: "aptos",
  CRO: "crypto-com-chain",
  ARB: "arbitrum",
  VET: "vechain",
  MKR: "maker",
  OP: "optimism",
  NEAR: "near",
  AAVE: "aave",
  GRT: "the-graph",
  ALGO: "algorand",
  QNT: "quant-network",
  FTM: "fantom",
  EGLD: "elrond-erd-2",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  THETA: "theta-token",
  XTZ: "tezos",
  EOS: "eos",
  FLOW: "flow",
  CHZ: "chiliz",
  RUNE: "thorchain",
  KCS: "kucoin-shares",
};

/**
 * Gets the CoinGecko ID for a given crypto symbol.
 *
 * @param symbol - The crypto symbol (e.g., "BTC", "ETH")
 * @returns The CoinGecko ID or null if not found
 */
export function getCoinGeckoId(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  return SYMBOL_TO_COINGECKO_ID[upperSymbol] ?? null;
}

/**
 * CoinGecko API response for simple/price endpoint
 */
interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

/**
 * Builds the CoinGecko API URL with optional API key.
 */
function buildApiUrl(coinId: string): string {
  const apiKey = process.env.COINGECKO_API_KEY;

  // Pro API uses different base URL
  const baseUrl = apiKey
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";

  const url = new URL(`${baseUrl}/simple/price`);
  url.searchParams.set("ids", coinId);
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");

  return url.toString();
}

/**
 * Builds request headers with optional API key.
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  return headers;
}

/**
 * Fetches the current cryptocurrency price from CoinGecko.
 *
 * Returns price in USD with 24-hour change data.
 *
 * @param symbol - The crypto symbol (e.g., "BTC", "ETH", "SOL")
 * @returns Promise<PriceData> with price in USD and 24h change info
 * @throws CoinGeckoError on network failure, invalid symbol, or rate limiting
 *
 * @example
 * // Fetch Bitcoin price
 * const btc = await fetchCryptoPrice("BTC");
 * // { price: 65000, currency: "USD", changePercent: 2.5, changeAbsolute: 1625 }
 *
 * @example
 * // Fetch Ethereum price
 * const eth = await fetchCryptoPrice("ETH");
 */
export async function fetchCryptoPrice(symbol: string): Promise<PriceData> {
  const upperSymbol = symbol.toUpperCase().trim();
  const coinId = getCoinGeckoId(upperSymbol);

  if (!coinId) {
    throw new CoinGeckoError(
      `Unknown cryptocurrency symbol: ${upperSymbol}. Add it to the symbol mapping or use the CoinGecko ID directly.`,
      upperSymbol
    );
  }

  const url = buildApiUrl(coinId);
  const headers = buildHeaders();

  try {
    const response = await fetch(url, { headers });

    // Handle rate limiting
    if (response.status === 429) {
      throw new CoinGeckoError(
        `Rate limit exceeded. ${process.env.COINGECKO_API_KEY ? "Consider upgrading your API plan." : "Consider adding a COINGECKO_API_KEY for higher limits."}`,
        upperSymbol,
        429
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      throw new CoinGeckoError(
        `CoinGecko API returned status ${response.status}: ${response.statusText}`,
        upperSymbol,
        response.status
      );
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();

    // Validate response has data for our coin
    if (!data[coinId]) {
      throw new CoinGeckoError(
        `No price data returned for ${upperSymbol} (${coinId})`,
        upperSymbol
      );
    }

    const coinData = data[coinId];
    const price = coinData.usd;
    const changePercent = coinData.usd_24h_change ?? null;

    // Calculate absolute change from percentage if available
    let changeAbsolute: number | null = null;
    if (changePercent !== null) {
      // price = previousPrice * (1 + changePercent/100)
      // previousPrice = price / (1 + changePercent/100)
      // changeAbsolute = price - previousPrice
      const previousPrice = price / (1 + changePercent / 100);
      changeAbsolute = price - previousPrice;
    }

    return {
      price,
      currency: "USD",
      changePercent,
      changeAbsolute,
    };
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof CoinGeckoError) {
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
        throw new CoinGeckoError(
          `Network error fetching ${upperSymbol}. Please check your internet connection.`,
          upperSymbol,
          undefined,
          error
        );
      }

      throw new CoinGeckoError(
        `Failed to fetch price for ${upperSymbol}: ${error.message}`,
        upperSymbol,
        undefined,
        error
      );
    }

    // Unknown error type
    throw new CoinGeckoError(
      `Unknown error fetching price for ${upperSymbol}`,
      upperSymbol,
      undefined,
      error
    );
  }
}
