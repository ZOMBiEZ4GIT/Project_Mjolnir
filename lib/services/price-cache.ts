/**
 * Price cache service for managing cached prices with TTL.
 *
 * Provides functions to get, set, and validate cached prices for tradeable assets.
 * Default TTL: 15 minutes for prices.
 */

import { db } from "@/lib/db";
import { priceCache, PriceCache, NewPriceCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Default cache TTL in minutes
export const DEFAULT_PRICE_CACHE_TTL_MINUTES = 15;

/**
 * Cached price data returned from the cache.
 */
export interface CachedPrice {
  id: string;
  symbol: string;
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
  fetchedAt: Date;
  source: "yahoo" | "coingecko";
}

/**
 * Price data to be cached (input type).
 */
export interface PriceDataToCache {
  price: number;
  currency: "AUD" | "NZD" | "USD";
  changePercent: number | null;
  changeAbsolute: number | null;
  source: "yahoo" | "coingecko";
}

/**
 * Converts a database PriceCache row to our CachedPrice interface.
 * Handles decimal string to number conversions.
 */
function toCachedPrice(row: PriceCache): CachedPrice {
  return {
    id: row.id,
    symbol: row.symbol,
    price: Number(row.price),
    currency: row.currency,
    changePercent: row.changePercent ? Number(row.changePercent) : null,
    changeAbsolute: row.changeAbsolute ? Number(row.changeAbsolute) : null,
    fetchedAt: row.fetchedAt,
    source: row.source,
  };
}

/**
 * Checks if a cached price is still valid based on TTL.
 *
 * @param cachedPrice - The cached price to check
 * @param ttlMinutes - Time-to-live in minutes (default: 15)
 * @returns true if the cache is still valid, false if expired
 */
export function isCacheValid(
  cachedPrice: CachedPrice,
  ttlMinutes: number = DEFAULT_PRICE_CACHE_TTL_MINUTES
): boolean {
  const now = new Date();
  const fetchedAt = cachedPrice.fetchedAt;
  const ageMs = now.getTime() - fetchedAt.getTime();
  const ttlMs = ttlMinutes * 60 * 1000;

  return ageMs < ttlMs;
}

/**
 * Gets a cached price for a given symbol.
 *
 * @param symbol - The asset symbol (e.g., "VAS.AX", "BTC")
 * @returns The cached price if found, null otherwise
 *
 * @example
 * const cached = await getCachedPrice("VAS.AX");
 * if (cached && isCacheValid(cached)) {
 *   return cached;
 * }
 */
export async function getCachedPrice(
  symbol: string
): Promise<CachedPrice | null> {
  const rows = await db
    .select()
    .from(priceCache)
    .where(eq(priceCache.symbol, symbol))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return toCachedPrice(rows[0]);
}

/**
 * Sets (upserts) a cached price for a given symbol.
 * If a cache entry exists for the symbol, it will be updated.
 * If no entry exists, a new one will be created.
 *
 * @param symbol - The asset symbol (e.g., "VAS.AX", "BTC")
 * @param priceData - The price data to cache
 *
 * @example
 * await setCachedPrice("VAS.AX", {
 *   price: 95.50,
 *   currency: "AUD",
 *   changePercent: 1.5,
 *   changeAbsolute: 1.42,
 *   source: "yahoo"
 * });
 */
export async function setCachedPrice(
  symbol: string,
  priceData: PriceDataToCache
): Promise<void> {
  const now = new Date();

  const newCacheEntry: NewPriceCache = {
    symbol,
    price: priceData.price.toString(),
    currency: priceData.currency,
    changePercent: priceData.changePercent?.toString() ?? null,
    changeAbsolute: priceData.changeAbsolute?.toString() ?? null,
    fetchedAt: now,
    source: priceData.source,
  };

  // Check if entry exists for this symbol
  const existing = await db
    .select({ id: priceCache.id })
    .from(priceCache)
    .where(eq(priceCache.symbol, symbol))
    .limit(1);

  if (existing.length > 0) {
    // Update existing entry
    await db
      .update(priceCache)
      .set({
        price: newCacheEntry.price,
        currency: newCacheEntry.currency,
        changePercent: newCacheEntry.changePercent,
        changeAbsolute: newCacheEntry.changeAbsolute,
        fetchedAt: newCacheEntry.fetchedAt,
        source: newCacheEntry.source,
      })
      .where(eq(priceCache.symbol, symbol));
  } else {
    // Insert new entry
    await db.insert(priceCache).values(newCacheEntry);
  }
}

/**
 * Gets all cached prices from the database.
 *
 * @returns Array of all cached prices
 */
export async function getAllCachedPrices(): Promise<CachedPrice[]> {
  const rows = await db.select().from(priceCache);
  return rows.map(toCachedPrice);
}

/**
 * Deletes a cached price for a given symbol.
 *
 * @param symbol - The asset symbol to delete from cache
 */
export async function deleteCachedPrice(symbol: string): Promise<void> {
  await db.delete(priceCache).where(eq(priceCache.symbol, symbol));
}
