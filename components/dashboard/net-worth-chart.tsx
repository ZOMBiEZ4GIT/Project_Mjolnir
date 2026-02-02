"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AssetsVsDebtChart } from "./assets-vs-debt-chart";
import { ChartSkeleton, ChartError } from "@/components/charts";

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

/**
 * Time range options for the chart.
 */
type TimeRange = "3m" | "6m" | "1y" | "all";

/**
 * Chart view modes.
 */
type ChartViewMode = "networth" | "assetsvsdebt";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; months: number }[] = [
  { value: "3m", label: "3M", months: 3 },
  { value: "6m", label: "6M", months: 6 },
  { value: "1y", label: "1Y", months: 12 },
  { value: "all", label: "All", months: 60 }, // 5 years max
];

const DEFAULT_TIME_RANGE: TimeRange = "1y";
const CHART_VIEW_STORAGE_KEY = "net-worth-chart-view";

async function fetchHistory(months: number): Promise<HistoryResponse> {
  const response = await fetch(`/api/net-worth/history?months=${months}`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}

/**
 * Formats a date string to month abbreviation (e.g., "Jan").
 */
function formatMonth(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", { month: "short" });
}

/**
 * Formats a date string for tooltip display (e.g., "January 2026").
 */
function formatMonthFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}


interface ChartDataPoint {
  date: string;
  displayMonth: string;
  netWorth: number;
}

/**
 * Custom tooltip component for the chart.
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
  currency: Currency;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-1">
        {formatMonthFull(data.payload.date)}
      </p>
      <p className="text-white font-semibold text-lg">
        {formatCurrency(data.value, currency)}
      </p>
    </div>
  );
}

/**
 * Time range selector component for the chart.
 */
interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

function TimeRangeSelector({ selectedRange, onRangeChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onRangeChange(option.value)}
          className={`
            px-3 py-1 text-sm font-medium rounded-md transition-colors
            ${
              selectedRange === option.value
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Chart view toggle component.
 */
interface ChartViewToggleProps {
  viewMode: ChartViewMode;
  onChange: (mode: ChartViewMode) => void;
}

function ChartViewToggle({ viewMode, onChange }: ChartViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
      <button
        onClick={() => onChange("networth")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "networth"
            ? "bg-gray-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
        title="Net Worth only"
      >
        <LineChartIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Net Worth</span>
      </button>
      <button
        onClick={() => onChange("assetsvsdebt")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "assetsvsdebt"
            ? "bg-gray-600 text-white"
            : "text-gray-400 hover:text-white"
        }`}
        title="Assets vs Debt comparison"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">Assets vs Debt</span>
      </button>
    </div>
  );
}

/**
 * Net Worth History Chart
 *
 * Displays a line chart showing net worth history with configurable time ranges.
 * Features:
 * - Time range selector: 3M, 6M, 1Y, All
 * - Default selection is 12 months (1Y)
 * - URL param ?range=3m persists selection
 * - X-axis: months (Jan, Feb, etc.)
 * - Y-axis: net worth value (auto-scaled, in display currency)
 * - Hover shows exact value for that month
 * - Handles missing months gracefully
 * - Dark mode styling
 *
 * Note: Historical values are stored in AUD and converted to display currency
 * for chart display. This uses current exchange rates, so historical USD values
 * are estimates based on today's rates.
 */
export function NetWorthChart() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Chart view mode state with localStorage persistence
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("networth");

  // Load chart view preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CHART_VIEW_STORAGE_KEY);
    if (stored === "networth" || stored === "assetsvsdebt") {
      setChartViewMode(stored);
    }
  }, []);

  // Handle chart view mode change
  const handleChartViewChange = (mode: ChartViewMode) => {
    setChartViewMode(mode);
    localStorage.setItem(CHART_VIEW_STORAGE_KEY, mode);
  };

  // Get time range from URL param, default to 1Y
  const rangeParam = searchParams.get("range") as TimeRange | null;
  const selectedRange: TimeRange =
    rangeParam && TIME_RANGE_OPTIONS.some((opt) => opt.value === rangeParam)
      ? rangeParam
      : DEFAULT_TIME_RANGE;

  // Get months for the selected range
  const selectedOption = TIME_RANGE_OPTIONS.find((opt) => opt.value === selectedRange);
  const months = selectedOption?.months ?? 12;

  // Handle range change by updating URL param
  const handleRangeChange = useCallback(
    (newRange: TimeRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newRange === DEFAULT_TIME_RANGE) {
        // Remove param if default value to keep URL clean
        params.delete("range");
      } else {
        params.set("range", newRange);
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["net-worth-history", months],
    queryFn: () => fetchHistory(months),
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["net-worth-history", months] });
  }, [queryClient, months]);

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return (
      <ChartSkeleton
        title="Net Worth History"
        variant="line"
        withContainer
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load net worth history"
        onRetry={handleRetry}
        withContainer
      />
    );
  }

  // No data available
  if (!historyData || !historyData.history) {
    return (
      <ChartSkeleton
        title="Net Worth History"
        variant="line"
        withContainer
      />
    );
  }

  // Transform data for Recharts - convert from AUD to display currency
  const chartData: ChartDataPoint[] = historyData.history.map((point) => ({
    date: point.date,
    displayMonth: formatMonth(point.date),
    netWorth: convert(point.netWorth, "AUD"),
  }));

  // Empty state
  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Net Worth History
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <ChartViewToggle
              viewMode={chartViewMode}
              onChange={handleChartViewChange}
            />
            <TimeRangeSelector
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 text-center">
            No historical data available yet.
            <br />
            Data will appear after your first month of tracking.
          </p>
        </div>
      </div>
    );
  }

  // Calculate Y-axis domain with some padding
  const values = chartData.map((d) => d.netWorth);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range * 0.1 || maxValue * 0.1 || 1000;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;

  // Create a formatter function for the Y-axis that uses the display currency
  const formatCurrencyCompact = (value: number): string => {
    return formatCurrency(value, displayCurrency, { compact: true });
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Net Worth History
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <ChartViewToggle
            viewMode={chartViewMode}
            onChange={handleChartViewChange}
          />
          <TimeRangeSelector
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
          />
        </div>
      </div>

      {chartViewMode === "networth" ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                vertical={false}
              />
              <XAxis
                dataKey="displayMonth"
                stroke="#9CA3AF"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={{ stroke: "#4B5563" }}
                axisLine={{ stroke: "#4B5563" }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={{ stroke: "#4B5563" }}
                axisLine={{ stroke: "#4B5563" }}
                tickFormatter={formatCurrencyCompact}
                domain={[yMin, yMax]}
                width={70}
              />
              <Tooltip content={<CustomTooltip currency={displayCurrency} />} />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <AssetsVsDebtChart data={historyData.history} />
      )}
    </div>
  );
}
