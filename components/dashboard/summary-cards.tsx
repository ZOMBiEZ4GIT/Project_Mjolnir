"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { type Currency, type ExchangeRates } from "@/lib/utils/currency";
import { Wallet, CreditCard } from "lucide-react";
import { NumberTicker } from "@/components/dashboard/number-ticker";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { staggerContainer, staggerItem } from "@/lib/animations";

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

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="h-8 w-40 bg-muted rounded mb-3" />
        <div className="h-5 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  netWorth: number;
  previousValue: number | null;
  icon: React.ReactNode;
  variant: "assets" | "debt";
  currency: Currency;
}

function SummaryCard({
  title,
  value,
  netWorth,
  previousValue,
  icon,
  variant,
  currency,
}: SummaryCardProps) {
  const hasChange = previousValue !== null && previousValue !== 0;
  const changeAmount = hasChange ? value - previousValue : 0;
  const changePercent = hasChange
    ? (changeAmount / Math.abs(previousValue)) * 100
    : 0;

  // For debt, positive change (increase) is bad, so we flip the badge sign
  const badgeAmount = variant === "debt" ? -changeAmount : changeAmount;
  const badgePercent = variant === "debt" ? -changePercent : changePercent;

  // Percentage of net worth
  const netWorthPercent =
    netWorth !== 0 ? Math.abs((value / netWorth) * 100) : 0;

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 transition-shadow duration-150 hover:shadow-card-hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-label uppercase text-muted-foreground">
          {title}
        </span>
        <div className={variant === "assets" ? "text-positive" : "text-destructive"}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <NumberTicker
        value={value}
        currency={currency}
        className="text-heading-lg text-foreground block mb-2"
      />

      {/* Change from last month */}
      {hasChange && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <ChangeBadge
            amount={badgeAmount}
            percentage={badgePercent}
            currency={currency}
            size="sm"
          />
          <span className="text-body-sm text-muted-foreground">from last month</span>
        </div>
      )}

      {/* Percentage of net worth */}
      <div className="text-body-sm text-muted-foreground">
        {netWorthPercent.toFixed(0)}% of net worth
      </div>
    </motion.div>
  );
}

export function SummaryCards() {
  const shouldReduceMotion = useReducedMotion();
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();

  const {
    data: netWorthData,
    isLoading: isLoadingNetWorth,
    error: netWorthError,
  } = useQuery({
    queryKey: queryKeys.netWorth.current(displayCurrency),
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.netWorth.history(2),
    queryFn: fetchHistory,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  if (!isLoaded || !isSignedIn || isLoadingNetWorth || currencyLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (netWorthError) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load summary data</p>
      </div>
    );
  }

  if (!netWorthData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  let previousAssets: number | null = null;
  let previousDebt: number | null = null;

  if (historyData && historyData.history.length >= 2 && !isLoadingHistory) {
    const previousMonth = historyData.history[historyData.history.length - 2];
    if (previousMonth) {
      previousAssets = convert(previousMonth.totalAssets, "AUD");
      previousDebt = convert(previousMonth.totalDebt, "AUD");
    }
  }

  const containerVariants = shouldReduceMotion
    ? undefined
    : {
        ...staggerContainer,
        visible: {
          transition: { staggerChildren: 0.1 },
        },
      };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      variants={containerVariants}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
    >
      <SummaryCard
        title="Total Assets"
        value={netWorthData.totalAssets}
        netWorth={netWorthData.netWorth}
        previousValue={previousAssets}
        icon={<Wallet className="h-5 w-5" />}
        variant="assets"
        currency={displayCurrency}
      />
      <SummaryCard
        title="Total Debt"
        value={netWorthData.totalDebt}
        netWorth={netWorthData.netWorth}
        previousValue={previousDebt}
        icon={<CreditCard className="h-5 w-5" />}
        variant="debt"
        currency={displayCurrency}
      />
    </motion.div>
  );
}
