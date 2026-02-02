"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency, type ExchangeRates } from "@/lib/utils/currency";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface HoldingValue {
  id: string;
  name: string;
  symbol: string | null;
  value: number;
  currency: string;
  valueNative: number;
}

interface AssetTypeBreakdown {
  type: "stock" | "etf" | "crypto" | "super" | "cash";
  totalValue: number;
  count: number;
  holdings: HoldingValue[];
}

interface NetWorthResponse {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  breakdown: AssetTypeBreakdown[];
  hasStaleData: boolean;
  displayCurrency: Currency;
  ratesUsed: ExchangeRates;
  calculatedAt: string;
}

interface HistoryPoint {
  date: string;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
}

interface HistoryResponse {
  history: HistoryPoint[];
  generatedAt: string;
}

async function fetchNetWorth(displayCurrency: Currency): Promise<NetWorthResponse> {
  const response = await fetch(`/api/net-worth?displayCurrency=${displayCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch net worth");
  }
  return response.json();
}

async function fetchHistory(): Promise<HistoryResponse> {
  const response = await fetch("/api/net-worth/history?months=2");
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}

/**
 * Formats a percentage with sign.
 */
function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Formats a relative timestamp (e.g., "2 minutes ago").
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }
}

/**
 * Loading skeleton for the hero card.
 */
function HeroSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8">
      <div className="animate-pulse">
        <div className="h-4 w-20 bg-gray-700 rounded mb-4" />
        <div className="h-12 w-64 bg-gray-700 rounded mb-4" />
        <div className="h-5 w-40 bg-gray-700 rounded mb-2" />
        <div className="h-3 w-24 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * Net Worth Hero Card
 *
 * Displays the user's total net worth prominently at the top of the dashboard.
 * Shows:
 * - Current net worth in the user's display currency (large, formatted)
 * - Change from last month (amount and percentage, colored green/red)
 * - "as of" timestamp
 * - Stale data warning icon if applicable
 */
export function NetWorthHero() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();

  const {
    data: netWorthData,
    isLoading: isLoadingNetWorth,
    error: netWorthError,
  } = useQuery({
    queryKey: ["net-worth", displayCurrency],
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["net-worth-history", 2],
    queryFn: fetchHistory,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoadingNetWorth || currencyLoading) {
    return <HeroSkeleton />;
  }

  // Show error state
  if (netWorthError) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-8">
        <p className="text-red-400">Failed to load net worth data</p>
      </div>
    );
  }

  // No data available
  if (!netWorthData) {
    return <HeroSkeleton />;
  }

  // Calculate change from last month
  // Note: History is in AUD, so we convert to display currency for comparison
  let changeAmount = 0;
  let changePercent = 0;
  let hasHistoricalData = false;

  if (historyData && historyData.history.length >= 2 && !isLoadingHistory) {
    // History is in chronological order, so last item is most recent month
    // and second to last is the previous month
    const previousMonth = historyData.history[historyData.history.length - 2];
    if (previousMonth && previousMonth.netWorth !== 0) {
      // Convert previous month's AUD value to display currency
      const previousNetWorthConverted = convert(previousMonth.netWorth, "AUD");
      changeAmount = netWorthData.netWorth - previousNetWorthConverted;
      changePercent =
        (changeAmount / Math.abs(previousNetWorthConverted)) * 100;
      hasHistoricalData = true;
    }
  }

  const isPositiveChange = changeAmount >= 0;
  const calculatedAt = new Date(netWorthData.calculatedAt);

  return (
    <div className="rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8">
      {/* Header with stale data warning */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Net Worth
        </span>
        {netWorthData.hasStaleData && (
          <div className="flex items-center gap-1 text-yellow-500" title="Some holdings have stale data">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">Stale data</span>
          </div>
        )}
      </div>

      {/* Net Worth Value */}
      <div className="text-4xl md:text-5xl font-bold text-white mb-4">
        {formatCurrency(netWorthData.netWorth, displayCurrency)}
      </div>

      {/* Change from last month */}
      {hasHistoricalData && (
        <div className="flex items-center gap-2 mb-2">
          {isPositiveChange ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <span
            className={`text-lg font-semibold ${
              isPositiveChange ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPositiveChange ? "+" : ""}
            {formatCurrency(changeAmount, displayCurrency)} ({formatPercentage(changePercent)})
          </span>
          <span className="text-sm text-gray-500">from last month</span>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500">
        as of {formatTimeAgo(calculatedAt)}
      </div>
    </div>
  );
}
