"use client";

import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

interface HistoryPoint {
  date: string;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
}

interface AssetsVsDebtChartProps {
  data: HistoryPoint[];
  isLoading?: boolean;
}

interface ChartDataPoint {
  date: string;
  displayMonth: string;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
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
 * Custom tooltip component for the chart.
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    payload: ChartDataPoint;
  }>;
  currency: Currency;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-gray-400 text-sm mb-2">
        {formatMonthFull(data.date)}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-green-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Assets
          </span>
          <span className="text-white font-medium">
            {formatCurrency(data.totalAssets, currency)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-red-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Debt
          </span>
          <span className="text-white font-medium">
            {formatCurrency(data.totalDebt, currency)}
          </span>
        </div>
        <div className="border-t border-gray-700 my-2 pt-2 flex justify-between items-center gap-4">
          <span className="text-sm text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            Net Worth
          </span>
          <span className="text-white font-semibold">
            {formatCurrency(data.netWorth, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Assets vs Debt Comparison Chart
 *
 * Displays a stacked area chart comparing total assets and debt over time,
 * with the net worth line overlaid.
 *
 * Features:
 * - Assets shown in green area
 * - Debt shown in red area (inverted, shown below the baseline)
 * - Net worth as white line overlay
 * - Custom tooltip showing all values
 * - Dark mode styling
 */
export function AssetsVsDebtChart({ data, isLoading }: AssetsVsDebtChartProps) {
  const { displayCurrency, convert } = useCurrency();

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-64 bg-gray-700/50 rounded animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading chart...</span>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          No historical data available yet.
          <br />
          Data will appear after your first month of tracking.
        </p>
      </div>
    );
  }

  // Transform data for Recharts - convert from AUD to display currency
  const chartData: ChartDataPoint[] = data.map((point) => ({
    date: point.date,
    displayMonth: formatMonth(point.date),
    totalAssets: convert(point.totalAssets, "AUD"),
    totalDebt: convert(point.totalDebt, "AUD"),
    netWorth: convert(point.netWorth, "AUD"),
  }));

  // Calculate Y-axis domain with some padding
  // Need to consider both assets (positive) and debt might need negative space visualization
  const maxAssets = Math.max(...chartData.map((d) => d.totalAssets));
  const maxDebt = Math.max(...chartData.map((d) => d.totalDebt));
  const maxValue = Math.max(maxAssets, maxDebt);
  const padding = maxValue * 0.1 || 1000;
  const yMax = maxValue + padding;

  // Create a formatter function for the Y-axis that uses the display currency
  const formatCurrencyCompact = (value: number): string => {
    return formatCurrency(value, displayCurrency, { compact: true });
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
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
            domain={[0, yMax]}
            width={70}
          />
          <Tooltip content={<CustomTooltip currency={displayCurrency} />} />

          {/* Total Assets - green area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            stackId="1"
            fill="#10B981"
            fillOpacity={0.6}
            stroke="#10B981"
            strokeWidth={1}
          />

          {/* Total Debt - red area (stacked on top for visual comparison) */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            stackId="2"
            fill="#EF4444"
            fillOpacity={0.6}
            stroke="#EF4444"
            strokeWidth={1}
          />

          {/* Net Worth - white line overlay */}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="#FFFFFF"
            strokeWidth={2}
            dot={{ fill: "#FFFFFF", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#FFFFFF", stroke: "#374151", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
