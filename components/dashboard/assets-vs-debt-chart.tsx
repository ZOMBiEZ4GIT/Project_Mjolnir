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
import { CHART_GRID, CHART_TEXT, CHART_AXIS, POSITIVE, NEGATIVE, NET_WORTH } from "@/lib/chart-palette";

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
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-muted-foreground text-sm mb-2">
        {formatMonthFull(data.date)}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-positive flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-positive" />
            Assets
          </span>
          <span className="text-foreground font-medium">
            {formatCurrency(data.totalAssets, currency)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-destructive flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Debt
          </span>
          <span className="text-foreground font-medium">
            {formatCurrency(data.totalDebt, currency)}
          </span>
        </div>
        <div className="border-t border-border my-2 pt-2 flex justify-between items-center gap-4">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground" />
            Net Worth
          </span>
          <span className="text-foreground font-semibold">
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
      <div className="h-64 bg-muted/50 rounded animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground">Loading chart...</span>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
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
            stroke={CHART_GRID}
            vertical={false}
          />
          <XAxis
            dataKey="displayMonth"
            stroke={CHART_TEXT}
            tick={{ fill: CHART_TEXT, fontSize: 12 }}
            tickLine={{ stroke: CHART_AXIS }}
            axisLine={{ stroke: CHART_AXIS }}
          />
          <YAxis
            stroke={CHART_TEXT}
            tick={{ fill: CHART_TEXT, fontSize: 12 }}
            tickLine={{ stroke: CHART_AXIS }}
            axisLine={{ stroke: CHART_AXIS }}
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
            fill={POSITIVE}
            fillOpacity={0.6}
            stroke={POSITIVE}
            strokeWidth={1}
          />

          {/* Total Debt - red area (stacked on top for visual comparison) */}
          <Area
            type="monotone"
            dataKey="totalDebt"
            stackId="2"
            fill={NEGATIVE}
            fillOpacity={0.6}
            stroke={NEGATIVE}
            strokeWidth={1}
          />

          {/* Net Worth - white line overlay */}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke={NET_WORTH}
            strokeWidth={2}
            dot={{ fill: NET_WORTH, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: NET_WORTH, stroke: CHART_GRID, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
