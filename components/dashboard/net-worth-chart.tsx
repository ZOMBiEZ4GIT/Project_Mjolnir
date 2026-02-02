"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

async function fetchHistory(): Promise<HistoryResponse> {
  const response = await fetch("/api/net-worth/history?months=12");
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

/**
 * Loading skeleton for the chart.
 */
function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <div className="animate-pulse">
        <div className="h-5 w-40 bg-gray-700 rounded mb-6" />
        <div className="h-64 bg-gray-700/50 rounded flex items-end justify-around px-4 pb-4">
          {/* Fake bar chart skeleton */}
          {[40, 60, 45, 70, 55, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
            <div
              key={i}
              className="w-4 bg-gray-600 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
 * Net Worth History Chart
 *
 * Displays a line chart showing net worth over the last 12 months.
 * Features:
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

  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["net-worth-history", 12],
    queryFn: fetchHistory,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <ChartSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load net worth history</p>
      </div>
    );
  }

  // No data available
  if (!historyData || !historyData.history) {
    return <ChartSkeleton />;
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
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
          Net Worth History
        </h3>
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
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Net Worth History
      </h3>
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
    </div>
  );
}
