"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
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

/**
 * Formats a percentage.
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns the icon for an asset type.
 */
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
 * Returns the color class for an asset type.
 */
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

/**
 * Returns the hex color for an asset type (for Recharts).
 */
function getAssetHexColor(type: string): string {
  switch (type) {
    case "stock":
      return "#3B82F6"; // blue-500
    case "etf":
      return "#8B5CF6"; // purple-500
    case "crypto":
      return "#F97316"; // orange-500
    case "super":
      return "#10B981"; // emerald-500
    case "cash":
      return "#06B6D4"; // cyan-500
    default:
      return "#6B7280"; // gray-500
  }
}

/**
 * Loading skeleton for asset allocation.
 */
function AllocationSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-5 w-32 bg-gray-700 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-700 rounded" />
                  <div className="h-4 w-24 bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-700 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-700 rounded" />
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
}

/**
 * Individual asset allocation row.
 */
function AllocationItem({
  type,
  totalValue,
  percentage,
  count,
  currency,
}: AllocationItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getAssetColor(type)} bg-opacity-20`}>
            <span className={`${getAssetColor(type).replace("bg-", "text-")}`}>
              {getAssetIcon(type)}
            </span>
          </div>
          <div>
            <span className="font-medium text-white">
              {getAssetDisplayName(type)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({count} holding{count !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-white">{formatCurrency(totalValue, currency, { compact: true })}</div>
          <div className="text-xs text-gray-400">{formatPercentage(percentage)}</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getAssetColor(type)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Pie chart data point interface.
 */
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
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-1">{data.name}</p>
      <p className="text-gray-300 text-sm">
        {formatCurrency(data.value, currency)}
      </p>
      <p className="text-gray-400 text-sm">
        {data.percentage.toFixed(1)}% of portfolio
      </p>
      <p className="text-gray-500 text-xs mt-1">
        {data.count} holding{data.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

/**
 * Custom legend for the pie chart.
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
          <span className="text-gray-300 text-sm">
            {entry.value}{" "}
            <span className="text-gray-500">
              ({formatCurrency(entry.payload.value, currency, { compact: true })})
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * View mode toggle button group.
 */
interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
      <button
        onClick={() => onChange("bars")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "bars"
            ? "bg-gray-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
        title="Bar chart view"
      >
        <BarChart3 className="h-4 w-4" />
        Bars
      </button>
      <button
        onClick={() => onChange("pie")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "pie"
            ? "bg-gray-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
        title="Pie chart view"
      >
        <PieChartIcon className="h-4 w-4" />
        Pie
      </button>
    </div>
  );
}

/**
 * Asset Allocation Component
 *
 * Displays a breakdown of assets by type (Stocks, ETFs, Crypto, Super, Cash).
 * Supports two view modes:
 * - Bars: Progress bars showing each asset type's percentage
 * - Pie: Donut chart showing asset allocation
 *
 * View preference is persisted in localStorage.
 * Sorted by value descending. Debt is shown separately (not included here).
 */
export function AssetAllocation() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();
  const chartRef = useRef<HTMLDivElement>(null);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>("bars");

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "bars" || stored === "pie") {
      setViewMode(stored);
    }
  }, []);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  const {
    data: netWorthData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["net-worth", displayCurrency],
    queryFn: () => fetchNetWorth(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <AllocationSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load asset allocation</p>
      </div>
    );
  }

  // No data available
  if (!netWorthData || !netWorthData.breakdown) {
    return <AllocationSkeleton />;
  }

  const { breakdown, totalAssets } = netWorthData;

  // Sort breakdown by value descending
  const sortedBreakdown = [...breakdown].sort(
    (a, b) => b.totalValue - a.totalValue
  );

  // Empty state
  if (sortedBreakdown.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Asset Allocation
          </h3>
          <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>
        <p className="text-gray-500 text-center py-8">
          No assets to display. Add holdings to see your allocation.
        </p>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData: PieDataPoint[] = sortedBreakdown
    .filter((item) => item.totalValue > 0)
    .map((item) => ({
      name: getAssetDisplayName(item.type),
      type: item.type,
      value: item.totalValue,
      percentage: totalAssets > 0 ? (item.totalValue / totalAssets) * 100 : 0,
      count: item.count,
    }));

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
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
        {viewMode === "bars" ? (
          <div className="space-y-5">
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
                />
              );
            })}
          </div>
        ) : (
          <div className="h-64">
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
          </div>
        )}
      </div>
    </div>
  );
}
