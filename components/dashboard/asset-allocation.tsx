"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency, type ExchangeRates } from "@/lib/utils/currency";
import {
  TrendingUp,
  Landmark,
  Bitcoin,
  PiggyBank,
  Banknote,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartExportButton } from "@/components/charts";
import { NumberTicker } from "@/components/dashboard/number-ticker";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";

type ViewMode = "bars" | "pie";

const STORAGE_KEY = "asset-allocation-view";

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

async function fetchNetWorth(displayCurrency: Currency): Promise<NetWorthResponse> {
  const response = await fetch(`/api/net-worth?displayCurrency=${displayCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch net worth");
  }
  return response.json();
}

function getAssetIcon(type: string): React.ReactNode {
  switch (type) {
    case "stock":
      return <TrendingUp className="h-5 w-5" />;
    case "etf":
      return <Landmark className="h-5 w-5" />;
    case "crypto":
      return <Bitcoin className="h-5 w-5" />;
    case "super":
      return <PiggyBank className="h-5 w-5" />;
    case "cash":
      return <Banknote className="h-5 w-5" />;
    default:
      return <TrendingUp className="h-5 w-5" />;
  }
}

function getAssetDisplayName(type: string): string {
  switch (type) {
    case "stock":
      return "Stocks";
    case "etf":
      return "ETFs";
    case "crypto":
      return "Crypto";
    case "super":
      return "Superannuation";
    case "cash":
      return "Cash";
    default:
      return type;
  }
}

function getAssetColor(type: string): string {
  switch (type) {
    case "stock":
      return "bg-blue-500";
    case "etf":
      return "bg-purple-500";
    case "crypto":
      return "bg-orange-500";
    case "super":
      return "bg-emerald-500";
    case "cash":
      return "bg-cyan-500";
    default:
      return "bg-gray-500";
  }
}

function getAssetHexColor(type: string): string {
  switch (type) {
    case "stock":
      return "#3B82F6";
    case "etf":
      return "#8B5CF6";
    case "crypto":
      return "#F97316";
    case "super":
      return "#10B981";
    case "cash":
      return "#06B6D4";
    default:
      return "#6B7280";
  }
}

function AllocationSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="h-2 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AllocationItemProps {
  type: string;
  totalValue: number;
  percentage: number;
  count: number;
  currency: Currency;
  animate: boolean;
}

function AllocationItem({
  type,
  totalValue,
  percentage,
  count,
  currency,
  animate,
}: AllocationItemProps) {
  const [barWidth, setBarWidth] = useState(animate ? 0 : percentage);

  useEffect(() => {
    if (animate) {
      // Delay slightly so the stagger can play first
      const timer = setTimeout(() => setBarWidth(percentage), 50);
      return () => clearTimeout(timer);
    }
  }, [animate, percentage]);

  return (
    <motion.div
      variants={staggerItem}
      className="space-y-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-accent/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getAssetColor(type)} bg-opacity-20`}>
            <span className={`${getAssetColor(type).replace("bg-", "text-")}`}>
              {getAssetIcon(type)}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {getAssetDisplayName(type)}
            </span>
            <span className="text-body-sm text-muted-foreground ml-2">
              ({count} holding{count !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-foreground">
            {formatCurrency(totalValue, currency, { compact: true })}
          </div>
          <div className="text-body-sm text-muted-foreground">
            {percentage.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getAssetColor(type)} rounded-full transition-all ease-out`}
          style={{
            width: `${Math.min(barWidth, 100)}%`,
            transitionDuration: "400ms",
          }}
        />
      </div>
    </motion.div>
  );
}

interface PieDataPoint {
  name: string;
  type: string;
  value: number;
  percentage: number;
  count: number;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PieDataPoint;
  }>;
  currency: Currency;
}

function PieChartTooltip({ active, payload, currency }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-foreground font-medium mb-1">{data.name}</p>
      <p className="text-body-sm text-muted-foreground">
        {formatCurrency(data.value, currency)}
      </p>
      <p className="text-body-sm text-muted-foreground">
        {data.percentage.toFixed(1)}% of portfolio
      </p>
      <p className="text-body-sm text-muted-foreground mt-1">
        {data.count} holding{data.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

interface LegendPayload {
  value: string;
  type: string;
  color: string;
  payload: PieDataPoint;
}

interface CustomLegendProps {
  payload?: LegendPayload[];
  currency: Currency;
}

function PieChartLegend({ payload, currency }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-body-sm text-muted-foreground">
            {entry.value}{" "}
            <span className="text-muted-foreground">
              ({formatCurrency(entry.payload.value, currency, { compact: true })})
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
      <button
        onClick={() => onChange("bars")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
          viewMode === "bars"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Bar chart view"
      >
        <BarChart3 className="h-4 w-4" />
        Bars
      </button>
      <button
        onClick={() => onChange("pie")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
          viewMode === "pie"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Pie chart view"
      >
        <PieChartIcon className="h-4 w-4" />
        Pie
      </button>
    </div>
  );
}

export function AssetAllocation() {
  const shouldReduceMotion = useReducedMotion();
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();
  const chartRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("bars");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "bars" || stored === "pie") {
      setViewMode(stored);
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  const {
    data: netWorthData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.netWorth.current(displayCurrency),
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  if (isLoading || currencyLoading) {
    return <AllocationSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load asset allocation</p>
      </div>
    );
  }

  if (!netWorthData || !netWorthData.breakdown) {
    return <AllocationSkeleton />;
  }

  const { breakdown, totalAssets } = netWorthData;

  const sortedBreakdown = [...breakdown].sort(
    (a, b) => b.totalValue - a.totalValue
  );

  if (sortedBreakdown.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-label uppercase text-muted-foreground">
            Asset Allocation
          </h3>
          <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>
        <p className="text-muted-foreground text-center py-8">
          No assets to display. Add holdings to see your allocation.
        </p>
      </div>
    );
  }

  const pieData: PieDataPoint[] = sortedBreakdown
    .filter((item) => item.totalValue > 0)
    .map((item) => ({
      name: getAssetDisplayName(item.type),
      type: item.type,
      value: item.totalValue,
      percentage: totalAssets > 0 ? (item.totalValue / totalAssets) * 100 : 0,
      count: item.count,
    }));

  const containerVariants = shouldReduceMotion ? undefined : staggerContainer;

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      initial={shouldReduceMotion ? false : fadeIn.initial}
      animate={fadeIn.animate}
      transition={shouldReduceMotion ? { duration: 0 } : fadeIn.transition}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="text-label uppercase text-muted-foreground">
          Asset Allocation
        </h3>
        <div className="flex items-center gap-2">
          <ChartExportButton
            chartRef={chartRef}
            filename="asset-allocation"
          />
          <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>
      </div>

      <div ref={chartRef}>
        <AnimatePresence mode="wait">
          {viewMode === "bars" ? (
            <motion.div
              key="bars"
              className="space-y-3"
              variants={containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              {sortedBreakdown.map((item) => {
                const percentage =
                  totalAssets > 0 ? (item.totalValue / totalAssets) * 100 : 0;
                return (
                  <AllocationItem
                    key={item.type}
                    type={item.type}
                    totalValue={item.totalValue}
                    percentage={percentage}
                    count={item.count}
                    currency={displayCurrency}
                    animate={!shouldReduceMotion}
                  />
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="pie"
              className="relative h-64"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={`cell-${entry.type}`}
                        fill={getAssetHexColor(entry.type)}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieChartTooltip currency={displayCurrency} />} />
                  <Legend
                    content={<PieChartLegend currency={displayCurrency} />}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre overlay — total assets */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "40px" }}>
                <div className="text-center">
                  <NumberTicker
                    value={totalAssets}
                    currency={displayCurrency}
                    className="text-heading-sm text-foreground"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
