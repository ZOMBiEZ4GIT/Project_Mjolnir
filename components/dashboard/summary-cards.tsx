"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCurrency } from "@/components/providers/currency-provider";
import { type Currency } from "@/lib/utils/currency";
import { Wallet, CreditCard } from "lucide-react";
import { NumberTicker } from "@/components/dashboard/number-ticker";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  useDashboardNetWorth,
  useDashboardHistory,
} from "@/lib/hooks/use-dashboard-data";

function CardSkeleton() {
  return (
    <div className="rounded-2xl glass-card p-4 sm:p-6">
      <div>
        <div className="h-3 w-20 skeleton-shimmer mb-3" />
        <div className="h-8 w-40 skeleton-shimmer mb-3" />
        <div className="h-5 w-32 skeleton-shimmer mb-2" />
        <div className="h-3 w-24 skeleton-shimmer" />
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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`rounded-2xl glass-card p-4 sm:p-6 ${
        variant === "assets"
          ? "hover:shadow-glow-positive"
          : "hover:shadow-glow-negative"
      }`}
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
  const { convert } = useCurrency();

  const {
    data: netWorthData,
    isLoading: isLoadingNetWorth,
    error: netWorthError,
    displayCurrency,
    currencyLoading,
  } = useDashboardNetWorth();

  const { data: historyData, isLoading: isLoadingHistory } = useDashboardHistory();

  if (isLoadingNetWorth || currencyLoading) {
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
          transition: { staggerChildren: 0.05 },
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
