"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency, type ExchangeRates } from "@/lib/utils/currency";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";

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
 * Loading skeleton for a summary card.
 */
function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-4 w-20 bg-gray-700 rounded mb-3" />
        <div className="h-8 w-40 bg-gray-700 rounded mb-3" />
        <div className="h-4 w-32 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  previousValue: number | null;
  icon: React.ReactNode;
  accentColor: "green" | "red";
  currency: Currency;
}

/**
 * Individual summary card component.
 */
function SummaryCard({
  title,
  value,
  previousValue,
  icon,
  accentColor,
  currency,
}: SummaryCardProps) {
  const hasChange = previousValue !== null && previousValue !== 0;
  const changeAmount = hasChange ? value - previousValue : 0;
  const changePercent = hasChange
    ? (changeAmount / Math.abs(previousValue)) * 100
    : 0;
  const isPositiveChange = changeAmount >= 0;

  // For debt, positive change (increase) is bad, so we flip the indicator
  const showPositiveIndicator =
    accentColor === "green" ? isPositiveChange : !isPositiveChange;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <div className={`text-${accentColor}-500`}>{icon}</div>
      </div>

      {/* Value */}
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
        {formatCurrency(value, currency)}
      </div>

      {/* Change from last month */}
      {hasChange && (
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {showPositiveIndicator ? (
            <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <span
            className={`text-xs sm:text-sm font-medium ${
              showPositiveIndicator ? "text-green-500" : "text-red-500"
            }`}
          >
            {changeAmount >= 0 ? "+" : ""}
            {formatCurrency(changeAmount, currency)} ({formatPercentage(changePercent)})
          </span>
          <span className="text-xs text-gray-500">from last month</span>
        </div>
      )}
    </div>
  );
}

/**
 * Summary Cards Component
 *
 * Displays two smaller cards showing Total Assets and Total Debt.
 * Each card shows:
 * - Current value in the user's display currency
 * - Change from last month (amount and percentage)
 * - Appropriate icon and color coding
 */
export function SummaryCards() {
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
    refetchInterval: 60 * 1000,
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["net-worth-history", 2],
    queryFn: fetchHistory,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoadingNetWorth || currencyLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // Show error state
  if (netWorthError) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load summary data</p>
      </div>
    );
  }

  // No data available
  if (!netWorthData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // Get previous month data
  // Note: History is in AUD, so we convert to display currency for comparison
  let previousAssets: number | null = null;
  let previousDebt: number | null = null;

  if (historyData && historyData.history.length >= 2 && !isLoadingHistory) {
    const previousMonth = historyData.history[historyData.history.length - 2];
    if (previousMonth) {
      previousAssets = convert(previousMonth.totalAssets, "AUD");
      previousDebt = convert(previousMonth.totalDebt, "AUD");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SummaryCard
        title="Total Assets"
        value={netWorthData.totalAssets}
        previousValue={previousAssets}
        icon={<Wallet className="h-5 w-5" />}
        accentColor="green"
        currency={displayCurrency}
      />
      <SummaryCard
        title="Total Debt"
        value={netWorthData.totalDebt}
        previousValue={previousDebt}
        icon={<CreditCard className="h-5 w-5" />}
        accentColor="red"
        currency={displayCurrency}
      />
    </div>
  );
}
