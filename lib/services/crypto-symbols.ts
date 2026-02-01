/**
 * Cryptocurrency symbol to CoinGecko ID mapping.
 *
 * CoinGecko uses lowercase slug-style IDs (e.g., "bitcoin", "ethereum")
 * rather than ticker symbols (e.g., "BTC", "ETH").
 *
 * This module provides a mapping from common crypto symbols to their
 * corresponding CoinGecko IDs, covering the top 50 cryptocurrencies
 * by market cap.
 */

/**
 * Maps common crypto symbols to CoinGecko IDs.
 * Covers the top 50 cryptocurrencies by market cap.
 */
export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Top 10 by market cap
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

  // 11-20
  DOT: "polkadot",
  TRX: "tron",
  LINK: "chainlink",
  MATIC: "matic-network",
  POL: "matic-network", // Polygon renamed from MATIC to POL
  TON: "the-open-network",
  SHIB: "shiba-inu",
  DAI: "dai",
  LTC: "litecoin",
  BCH: "bitcoin-cash",

  // 21-30
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

  // 31-40
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

  // 41-50
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

  // Additional popular tokens
  IMX: "immutable-x",
  LDO: "lido-dao",
  INJ: "injective-protocol",
  SUI: "sui",
  SEI: "sei-network",
  STX: "blockstack",
  RENDER: "render-token",
  FET: "fetch-ai",
  PEPE: "pepe",
  WIF: "dogwifcoin",
};

/**
 * Gets the CoinGecko ID for a given crypto symbol.
 *
 * @param symbol - The crypto symbol (e.g., "BTC", "ETH", "SOL")
 * @returns The CoinGecko ID (e.g., "bitcoin") or null if the symbol is not found
 *
 * @example
 * getCoinGeckoId("BTC")  // Returns "bitcoin"
 * getCoinGeckoId("ETH")  // Returns "ethereum"
 * getCoinGeckoId("XYZ")  // Returns null (unknown symbol)
 */
export function getCoinGeckoId(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  return SYMBOL_TO_COINGECKO_ID[upperSymbol] ?? null;
}

/**
 * Gets the crypto symbol for a given CoinGecko ID.
 * This is the reverse lookup from ID to symbol.
 *
 * @param coinGeckoId - The CoinGecko ID (e.g., "bitcoin", "ethereum")
 * @returns The crypto symbol (e.g., "BTC") or null if not found
 *
 * @example
 * getSymbolFromCoinGeckoId("bitcoin")   // Returns "BTC"
 * getSymbolFromCoinGeckoId("ethereum")  // Returns "ETH"
 * getSymbolFromCoinGeckoId("unknown")   // Returns null
 */
export function getSymbolFromCoinGeckoId(coinGeckoId: string): string | null {
  const lowerCoinGeckoId = coinGeckoId.toLowerCase().trim();

  for (const [symbol, id] of Object.entries(SYMBOL_TO_COINGECKO_ID)) {
    if (id === lowerCoinGeckoId) {
      return symbol;
    }
  }

  return null;
}

/**
 * Checks if a symbol is a known cryptocurrency.
 *
 * @param symbol - The crypto symbol to check
 * @returns true if the symbol is known, false otherwise
 */
export function isKnownCryptoSymbol(symbol: string): boolean {
  return getCoinGeckoId(symbol) !== null;
}

/**
 * Gets all known crypto symbols.
 *
 * @returns Array of all known crypto symbols
 */
export function getAllKnownSymbols(): string[] {
  return Object.keys(SYMBOL_TO_COINGECKO_ID);
}
