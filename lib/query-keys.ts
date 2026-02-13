/**
 * Centralised TanStack Query key constants.
 *
 * Every query key used in the application should be defined here
 * to prevent typos that would silently break cache invalidation.
 * Import from this module instead of using string literals.
 */

import type { Currency } from "@/lib/constants";

// =============================================================================
// BASE KEYS (used for broad invalidation)
// =============================================================================

export const queryKeys = {
  // ---- Holdings ----
  holdings: {
    all: ["holdings"] as const,
    tradeable: ["holdings", "tradeable"] as const,
    list: (opts: { showDormant?: boolean }) =>
      ["holdings", opts] as const,
    detail: (id: string) => ["holding", id] as const,
    quantity: (holdingId: string) =>
      ["holdings", holdingId, "quantity"] as const,
  },

  // ---- Transactions ----
  transactions: {
    all: ["transactions"] as const,
    byHolding: (holdingId: string) =>
      ["transactions", holdingId] as const,
    list: (filters: { holdingId?: string; action?: string; currency?: string }) =>
      ["transactions", filters] as const,
  },

  // ---- Snapshots ----
  snapshots: {
    all: ["snapshots"] as const,
    list: (filters: { holdingId?: string }) =>
      ["snapshots", filters] as const,
  },

  // ---- Contributions ----
  contributions: {
    all: ["contributions"] as const,
    single: (holdingId: string, date: string) =>
      ["contribution", holdingId, date] as const,
  },

  // ---- Prices ----
  prices: {
    all: ["prices"] as const,
    single: (id: string) => ["price", id] as const,
    sparkline: ["sparkline"] as const,
  },

  // ---- Net Worth ----
  netWorth: {
    current: (displayCurrency: Currency) =>
      ["net-worth", displayCurrency] as const,
    history: (months: number) =>
      ["net-worth-history", months] as const,
    /** Broad invalidation key for all net-worth queries. */
    all: ["net-worth"] as const,
    /** Broad invalidation key for all history queries. */
    allHistory: ["net-worth-history"] as const,
  },

  // ---- Super ----
  super: {
    holdingsCheck: ["super-holdings-check"] as const,
    breakdown: (months: number, holdingId?: string | null) =>
      ["super-breakdown", months, holdingId ?? "all"] as const,
  },

  // ---- Dashboard ----
  topPerformers: ["top-performers"] as const,
  currencyExposure: (displayCurrency: Currency) =>
    ["currency-exposure", displayCurrency] as const,

  // ---- Check-in ----
  checkIn: {
    status: ["check-in-status"] as const,
    holdings: ["check-in-holdings"] as const,
  },

  // ---- Budget ----
  budget: {
    payday: ["budget", "payday"] as const,
    categories: ["budget", "categories"] as const,
    templates: ["budget", "templates"] as const,
    summary: (periodId?: string) =>
      ["budget", "summary", periodId ?? "current"] as const,
    periods: {
      all: ["budget", "periods"] as const,
      detail: (id: string) => ["budget", "period", id] as const,
    },
    transactions: {
      all: ["budget", "transactions"] as const,
      list: (filters: Record<string, string | undefined>) =>
        ["budget", "transactions", filters] as const,
      uncategorisedCount: ["budget", "transactions", "uncategorised-count"] as const,
    },
    recommendations: {
      latest: (periodId?: string) =>
        ["budget", "recommendations", periodId ?? "current"] as const,
    },
    trends: (periods?: number) =>
      ["budget", "trends", periods ?? 6] as const,
  },

  // ---- n8n ----
  n8n: {
    workflows: ["n8n", "workflows"] as const,
    executions: (workflowId?: string) =>
      workflowId
        ? (["n8n", "executions", workflowId] as const)
        : (["n8n", "executions"] as const),
  },

  // ---- Health ----
  health: {
    today: ["health", "today"] as const,
    daily: (range: string) => ["health", "daily", range] as const,
    bodyComp: (range: string) => ["health", "body-comp", range] as const,
    sleep: (range: string) => ["health", "sleep", range] as const,
    weekly: ["health", "weekly"] as const,
    workouts: (filters: { limit?: number; type?: string }) =>
      ["health", "workouts", filters] as const,
    workoutsSummary: (range: string) =>
      ["health", "workouts-summary", range] as const,
  },

  // ---- Settings ----
  preferences: ["preferences"] as const,
  exchangeRates: ["exchange-rates"] as const,
} as const;
