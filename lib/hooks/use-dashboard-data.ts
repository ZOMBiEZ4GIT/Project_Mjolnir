"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/components/providers/currency-provider";
import { queryKeys } from "@/lib/query-keys";
import type { Currency, ExchangeRates } from "@/lib/utils/currency";

// =============================================================================
// Shared types (previously duplicated across 5+ dashboard components)
// =============================================================================

export interface HoldingValue {
  id: string;
  name: string;
  symbol: string | null;
  value: number;
  currency: string;
  valueNative: number;
}

export interface AssetTypeBreakdown {
  type: "stock" | "etf" | "crypto" | "super" | "cash";
  totalValue: number;
  count: number;
  holdings: HoldingValue[];
}

type StaleReason = "price_expired" | "no_price" | "snapshot_old" | "no_snapshot";

export interface StaleHolding {
  holdingId: string;
  name: string;
  type: string;
  lastUpdated: string | null;
  reason: StaleReason;
}

export interface NetWorthResponse {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  breakdown: AssetTypeBreakdown[];
  hasStaleData: boolean;
  staleHoldings?: StaleHolding[];
  displayCurrency: Currency;
  ratesUsed: ExchangeRates;
  calculatedAt: string;
}

export interface HistoryPoint {
  date: string;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
}

export interface HistoryResponse {
  history: HistoryPoint[];
  generatedAt: string;
}

// =============================================================================
// Fetch helpers
// =============================================================================

async function fetchNetWorth(displayCurrency: Currency): Promise<NetWorthResponse> {
  const response = await fetch(`/api/net-worth?displayCurrency=${displayCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch net worth");
  }
  return response.json();
}

async function fetchHistory(months: number): Promise<HistoryResponse> {
  const response = await fetch(`/api/net-worth/history?months=${months}`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}

// =============================================================================
// Shared hooks
// =============================================================================

/**
 * Fetches 12 months of net-worth history.
 * Components slice whatever range they need from the result.
 * Only the "All" range in the chart needs a separate longer query.
 */
const SHARED_HISTORY_MONTHS = 12;

export function useDashboardHistory() {
  return useQuery({
    queryKey: queryKeys.netWorth.history(SHARED_HISTORY_MONTHS),
    queryFn: () => fetchHistory(SHARED_HISTORY_MONTHS),
  });
}

/**
 * Fetches current net-worth with the user's display currency.
 * Wraps the currency provider so consumers don't need to wire it themselves.
 */
export function useDashboardNetWorth() {
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();

  const query = useQuery({
    queryKey: queryKeys.netWorth.current(displayCurrency),
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: !currencyLoading,
  });

  return {
    ...query,
    displayCurrency,
    currencyLoading,
  };
}
