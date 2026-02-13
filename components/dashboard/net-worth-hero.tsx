"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCurrency } from "@/components/providers/currency-provider";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { NumberTicker } from "@/components/dashboard/number-ticker";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { StaleIndicator } from "@/components/dashboard/stale-indicator";
import { slideUp } from "@/lib/animations";
import { POSITIVE, NEGATIVE } from "@/lib/chart-palette";
import { HeroBeams } from "@/components/effects/hero-beams";
import {
  useDashboardNetWorth,
  useDashboardHistory,
} from "@/lib/hooks/use-dashboard-data";

interface SparklineDataPoint {
  netWorth: number;
}

interface SparklineProps {
  data: SparklineDataPoint[];
}

function Sparkline({ data }: SparklineProps) {
  if (data.length < 2) {
    return null;
  }

  const firstValue = data[0].netWorth;
  const lastValue = data[data.length - 1].netWorth;
  const isPositive = lastValue >= firstValue;
  const strokeColor = isPositive ? POSITIVE : NEGATIVE;

  return (
    <div className="h-12 w-28" role="img" aria-label={`Net worth trend: ${isPositive ? "up" : "down"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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

function HeroSkeleton() {
  return (
    <div className="rounded-2xl p-[1px] shadow-glow-lg bg-accent/20">
      <div className="rounded-[calc(1rem-1px)] bg-gradient-to-br from-card via-card to-accent/5 p-6 sm:p-8">
        <div>
          <div className="h-3 w-20 skeleton-shimmer mb-4" />
          <div className="h-14 w-72 skeleton-shimmer mb-4" />
          <div className="h-7 w-48 skeleton-shimmer mb-2" />
          <div className="h-3 w-24 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

/** Number of recent history points to show in the sparkline */
const SPARKLINE_POINTS = 7;

export function NetWorthHero() {
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
    return <HeroSkeleton />;
  }

  if (netWorthError) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-8">
        <p className="text-destructive">Failed to load net worth data</p>
      </div>
    );
  }

  if (!netWorthData) {
    return <HeroSkeleton />;
  }

  // Calculate change from last month
  let changeAmount = 0;
  let changePercent = 0;
  let hasHistoricalData = false;

  if (historyData && historyData.history.length >= 2 && !isLoadingHistory) {
    const previousMonth = historyData.history[historyData.history.length - 2];
    if (previousMonth && previousMonth.netWorth !== 0) {
      const previousNetWorthConverted = convert(previousMonth.netWorth, "AUD");
      changeAmount = netWorthData.netWorth - previousNetWorthConverted;
      changePercent =
        (changeAmount / Math.abs(previousNetWorthConverted)) * 100;
      hasHistoricalData = true;
    }
  }

  const calculatedAt = new Date(netWorthData.calculatedAt);

  // Slice last N points from the shared 12-month history for the sparkline
  const sparklineData: SparklineDataPoint[] =
    historyData?.history
      .slice(-SPARKLINE_POINTS)
      .map((point) => ({
        netWorth: convert(point.netWorth, "AUD"),
      })) ?? [];

  return (
    <motion.div
      className="relative rounded-2xl p-[1px] shadow-glow-lg overflow-hidden"
      initial={shouldReduceMotion ? false : slideUp.initial}
      animate={slideUp.animate}
      transition={shouldReduceMotion ? { duration: 0 } : slideUp.transition}
    >
      {/* Animated conic-gradient border */}
      {!shouldReduceMotion && (
        <div
          className="absolute inset-0 rounded-2xl animate-conic-spin"
          style={{
            background:
              "conic-gradient(from var(--angle), hsl(263 84% 70% / 0.8), hsl(263 84% 70% / 0.1), hsl(263 84% 70% / 0.4), hsl(263 84% 70% / 0.1), hsl(263 84% 70% / 0.8))",
          }}
        />
      )}

      {/* Inner card */}
      <div className="relative rounded-[calc(1rem-1px)] bg-gradient-to-br from-card via-card to-accent/5 p-6 sm:p-8">
      {/* Ambient beam effect behind content */}
      {!shouldReduceMotion && <HeroBeams />}

      {/* Stale data warning — top-right corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <StaleIndicator
          isStale={netWorthData.hasStaleData}
          lastUpdated={calculatedAt}
        />
      </div>

      {/* Label */}
      <span className="text-label uppercase text-muted-foreground mb-3 block">
        Net Worth
      </span>

      {/* Net Worth Value with Sparkline */}
      <div className="flex items-center gap-4 sm:gap-6 mb-4">
        <NumberTicker
          value={netWorthData.netWorth}
          currency={displayCurrency}
          className="text-display-xl text-foreground"
        />
        {!isLoadingHistory && (
          <div className="hidden sm:block">
            <Sparkline data={sparklineData} />
          </div>
        )}
      </div>

      {/* Sparkline below value on mobile */}
      {!isLoadingHistory && sparklineData.length >= 2 && (
        <div className="block sm:hidden mb-4">
          <Sparkline data={sparklineData} />
        </div>
      )}

      {/* Change from last month */}
      {hasHistoricalData && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ChangeBadge
            amount={changeAmount}
            percentage={changePercent}
            currency={displayCurrency}
          />
          <span className="text-body-sm text-muted-foreground">from last month</span>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-body-sm text-muted-foreground">
        as of {formatTimeAgo(calculatedAt)}
      </div>
      </div>
    </motion.div>
  );
}
