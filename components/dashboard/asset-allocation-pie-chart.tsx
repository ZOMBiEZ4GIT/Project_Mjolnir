"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency, type ExchangeRates } from "@/lib/utils/currency";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartSkeleton, ChartError } from "@/components/charts";
import { NumberTicker } from "@/components/dashboard/number-ticker";
import { STOCK, ETF, CRYPTO, SUPER, CASH, CATEGORY_FALLBACK } from "@/lib/chart-palette";
import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

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

/**
 * Returns the display name for an asset type.
 */
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

/**
 * Returns the hex color for an asset type (for Recharts SVG rendering).
 */
function getAssetHexColor(type: string): string {
  switch (type) {
    case "stock":
      return STOCK;
    case "etf":
      return ETF;
    case "crypto":
      return CRYPTO;
    case "super":
      return SUPER;
    case "cash":
      return CASH;
    default:
      return CATEGORY_FALLBACK;
  }
}


interface PieDataPoint {
  name: string;
  type: string;
  value: number;
  percentage: number;
  count: number;
}

/**
 * Custom tooltip component for the pie chart.
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PieDataPoint;
  }>;
  currency: Currency;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-foreground font-medium mb-1">{data.name}</p>
      <p className="text-muted-foreground text-sm">
        {formatCurrency(data.value, currency)}
      </p>
      <p className="text-muted-foreground text-sm">
        {data.percentage.toFixed(1)}% of portfolio
      </p>
      <p className="text-muted-foreground text-xs mt-1">
        {data.count} holding{data.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

/**
 * Custom legend component for the pie chart.
 */
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

function CustomLegend({ payload, currency }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground text-sm">
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

/**
 * Asset Allocation Pie Chart Component
 *
 * Displays a pie chart showing asset allocation by type.
 * Features:
 * - Shows asset types: Stocks, ETFs, Crypto, Super, Cash
 * - Each slice colored by asset type
 * - Hover shows percentage and value
 * - Legend with values
 * - Dark mode styling
 */
export function AssetAllocationPieChart() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();

  const {
    data: netWorthData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.netWorth.current(displayCurrency),
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth.current(displayCurrency) });
  }, [queryClient, displayCurrency]);

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return (
      <ChartSkeleton
        title="Asset Allocation"
        variant="pie"
        withContainer
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load asset allocation"
        onRetry={handleRetry}
        withContainer
      />
    );
  }

  // No data available
  if (!netWorthData || !netWorthData.breakdown) {
    return (
      <ChartSkeleton
        title="Asset Allocation"
        variant="pie"
        withContainer
      />
    );
  }

  const { breakdown, totalAssets } = netWorthData;

  // Transform data for Recharts
  const pieData: PieDataPoint[] = breakdown
    .filter((item) => item.totalValue > 0)
    .map((item) => ({
      name: getAssetDisplayName(item.type),
      type: item.type,
      value: item.totalValue,
      percentage: totalAssets > 0 ? (item.totalValue / totalAssets) * 100 : 0,
      count: item.count,
    }))
    .sort((a, b) => b.value - a.value);

  // Empty state
  if (pieData.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-label uppercase text-muted-foreground mb-4">
          Asset Allocation
        </h3>
        <p className="text-muted-foreground text-center py-8">
          No assets to display. Add holdings to see your allocation.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      {...(reducedMotion ? {} : fadeIn)}
    >
      <h3 className="text-label uppercase text-muted-foreground mb-6">
        Asset Allocation
      </h3>
      <div className="relative h-64" role="img" aria-label="Asset allocation pie chart showing portfolio breakdown by asset type">
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
            <Tooltip content={<CustomTooltip currency={displayCurrency} />} />
            <Legend
              content={<CustomLegend currency={displayCurrency} />}
              verticalAlign="bottom"
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre overlay — positioned over the donut hole */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ marginBottom: 40 }}
        >
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground">Total</span>
            <NumberTicker
              value={netWorthData.netWorth}
              currency={displayCurrency}
              compact
              className="text-lg font-semibold text-foreground"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
