/**
 * Shared constants, types, and label maps used across the application.
 *
 * Centralises values that were previously duplicated in 20+ files.
 * All holding type arrays, currency maps, and display labels should
 * be imported from here rather than redefined locally.
 */

import type { Holding } from "@/lib/db/schema";

// =============================================================================
// HOLDING TYPES
// =============================================================================

/** Holding types that use transaction-based tracking (BUY/SELL events). */
export const TRADEABLE_TYPES = ["stock", "etf", "crypto"] as const;
export type TradeableType = (typeof TRADEABLE_TYPES)[number];

/** Holding types that use snapshot-based balance tracking (monthly check-in). */
export const SNAPSHOT_TYPES = ["super", "cash", "debt"] as const;
export type SnapshotType = (typeof SNAPSHOT_TYPES)[number];

/** All valid holding types in display order. */
export const HOLDING_TYPE_ORDER: Holding["type"][] = [
  "stock",
  "etf",
  "crypto",
  "super",
  "cash",
  "debt",
];

/** Human-readable labels for each holding type. */
export const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// =============================================================================
// CURRENCIES
// =============================================================================

/** Supported currency codes. */
export const CURRENCIES = ["AUD", "NZD", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Currency symbols for display.
 * AUD uses plain "$", NZD uses "NZ$", USD uses "US$" to differentiate.
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AUD: "$",
  NZD: "NZ$",
  USD: "US$",
};

// =============================================================================
// TRANSACTIONS
// =============================================================================

/** Valid transaction action types. */
export const TRANSACTION_ACTIONS = ["BUY", "SELL", "DIVIDEND", "SPLIT"] as const;
export type TransactionAction = (typeof TRANSACTION_ACTIONS)[number];

// =============================================================================
// EXCHANGES
// =============================================================================

/** Supported stock exchanges. */
export const EXCHANGES = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;
export type Exchange = (typeof EXCHANGES)[number];

// =============================================================================
// SHARED INTERFACES
// =============================================================================

/** Latest snapshot data shape returned by the API. */
export interface LatestSnapshot {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
}

/**
 * Holding enriched with cost basis and/or snapshot data.
 *
 * Used by the holdings list, detail page, and delete dialog.
 * Tradeable holdings populate the cost basis fields;
 * snapshot holdings populate the latestSnapshot field.
 */
export interface HoldingWithData extends Holding {
  /** Quantity currently held (tradeable holdings only). */
  quantity: number | null;
  /** Total cost basis in native currency (tradeable holdings only). */
  costBasis: number | null;
  /** Average cost per unit in native currency (tradeable holdings only). */
  avgCost: number | null;
  /** Most recent balance snapshot (snapshot holdings only). */
  latestSnapshot: LatestSnapshot | null;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Type guard: returns true if the holding type is tradeable. */
export function isTradeable(type: string): type is TradeableType {
  return TRADEABLE_TYPES.includes(type as TradeableType);
}

/** Type guard: returns true if the holding type uses snapshots. */
export function isSnapshotType(type: string): type is SnapshotType {
  return SNAPSHOT_TYPES.includes(type as SnapshotType);
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Normalise any date string to the first of its month (YYYY-MM-01).
 * Used by snapshot and contribution routes to enforce monthly granularity.
 */
export function normalizeToFirstOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Returns true if the given date falls in the current or previous month.
 * Used to restrict check-in and snapshot dates.
 */
export function isValidSnapshotMonth(dateStr: string): boolean {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const snapshotDate = new Date(dateStr);
  const snapshotMonth = new Date(
    snapshotDate.getFullYear(),
    snapshotDate.getMonth(),
    1
  );

  return (
    snapshotMonth.getTime() === currentMonth.getTime() ||
    snapshotMonth.getTime() === previousMonth.getTime()
  );
}
