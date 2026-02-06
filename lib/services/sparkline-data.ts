/**
 * Sparkline data service for fetching historical prices.
 *
 * Provides functions to fetch 30-day price history for tradeable assets
 * using Yahoo Finance chart API (stocks/ETFs) and CoinGecko market chart (crypto).
 */

import YahooFinance from "yahoo-finance2";
import { normalizeSymbol } from "./yahoo-finance";
import { getCoinGeckoId } from "./crypto-symbols";

const yahooFinance = new YahooFinance();

/**
 * Sparkline result for a single symbol: array of daily closing prices.
 */
export interface SparklineResult {
  symbol: string;
  prices: number[];
  error?: string;
}

/**
 * Fetches 30-day historical daily close prices for a stock/ETF from Yahoo Finance.
 */
async function fetchYahooSparkline(
  symbol: string,
  exchange: string | null
): Promise<number[]> {
  const normalizedSymbol = normalizeSymbol(symbol, exchange);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const result = await yahooFinance.chart(normalizedSymbol, {
    period1: startDate,
    period2: endDate,
    interval: "1d",
  });

  if (!result?.quotes || result.quotes.length === 0) {
    return [];
  }

  // Extract close prices, filtering out null/undefined
  return result.quotes
    .map((q: { close?: number | null }) => q.close)
    .filter((p: number | null | undefined): p is number => p != null);
}

/**
 * Fetches 30-day historical daily prices for a cryptocurrency from CoinGecko.
 */
async function fetchCoinGeckoSparkline(symbol: string): Promise<number[]> {
  const coinId = getCoinGeckoId(symbol.toUpperCase());
  if (!coinId) return [];

  const apiKey = process.env.COINGECKO_API_KEY;
  const baseUrl = apiKey
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";

  const url = new URL(`${baseUrl}/coins/${coinId}/market_chart`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", "30");
  url.searchParams.set("interval", "daily");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) return [];

  const data: { prices?: [number, number][] } = await response.json();
  if (!data.prices || data.prices.length === 0) return [];

  return data.prices.map(([, price]) => price);
}

/**
 * Fetches sparkline data for a single holding.
 */
export async function fetchSparklineData(
  holdingType: string,
  symbol: string,
  exchange: string | null
): Promise<SparklineResult> {
  try {
    let prices: number[];

    if (holdingType === "crypto") {
      prices = await fetchCoinGeckoSparkline(symbol);
    } else {
      prices = await fetchYahooSparkline(symbol, exchange);
    }

    return { symbol, prices };
  } catch (error) {
    return {
      symbol,
      prices: [],
      error: error instanceof Error ? error.message : "Failed to fetch sparkline",
    };
  }
}
