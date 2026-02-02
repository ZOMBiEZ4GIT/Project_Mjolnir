"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartSkeleton, ChartError } from "@/components/charts";
import { useCallback } from "react";

interface MonthlyBreakdown {
  date: string;
  employerContrib: number;
  employeeContrib: number;
  investmentReturns: number;
  balance: number;
  holdingId?: string;
  holdingName?: string;
}

interface SuperHolding {
  id: string;
  name: string;
  currency: string;
  isDormant: boolean;
}

interface SuperBreakdownResponse {
  breakdown: MonthlyBreakdown[];
  holdings: SuperHolding[];
  generatedAt: string;
}

// Colors for the chart
const COLORS = {
  employer: "#3B82F6", // blue-500
  employee: "#10B981", // emerald-500 (green)
  returns: "#8B5CF6", // purple-500
  balance: "#FFFFFF", // white for balance line
};

async function fetchSuperBreakdown(
  holdingId: string,
  months: number
): Promise<SuperBreakdownResponse> {
  const params = new URLSearchParams({
    holdingId,
    months: months.toString(),
  });
  const response = await fetch(`/api/super/breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch super breakdown");
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
  balance: number;
  employerContrib: number;
  employeeContrib: number;
  investmentReturns: number;
}

/**
 * Custom tooltip component for the chart.
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
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
  const totalContrib =
    data.employerContrib + data.employeeContrib + data.investmentReturns;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-2">
        {formatMonthFull(data.date)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.balance }}
          />
          <span className="text-gray-300 text-sm">Balance:</span>
          <span className="text-white font-semibold">
            {formatCurrency(data.balance, currency)}
          </span>
        </div>
        <div className="border-t border-gray-700 my-2 pt-2">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-wide">
            Monthly Changes
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.employer }}
            />
            <span className="text-gray-300 text-sm">Employer:</span>
            <span className="text-white font-medium">
              {formatCurrency(data.employerContrib, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.employee }}
            />
            <span className="text-gray-300 text-sm">Employee:</span>
            <span className="text-white font-medium">
              {formatCurrency(data.employeeContrib, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.returns }}
            />
            <span className="text-gray-300 text-sm">Returns:</span>
            <span
              className={`font-medium ${
                data.investmentReturns >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {data.investmentReturns >= 0 ? "+" : ""}
              {formatCurrency(data.investmentReturns, currency)}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-2 pt-2">
          <p className="text-gray-400 text-sm">
            Monthly Total:{" "}
            <span
              className={`font-semibold ${
                totalContrib >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {totalContrib >= 0 ? "+" : ""}
              {formatCurrency(totalContrib, currency)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom legend component for the chart.
 */
interface LegendPayload {
  value: string;
  type: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayload[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  const labels: Record<string, string> = {
    balance: "Balance",
    employerContrib: "Employer",
    employeeContrib: "Employee",
    investmentReturns: "Returns",
  };

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300 text-sm">
            {labels[entry.value] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface SuperBalanceHistoryChartProps {
  /**
   * The super holding ID to display.
   */
  holdingId: string;
  /**
   * The currency of the holding for display.
   */
  holdingCurrency: Currency;
  /**
   * Number of months of history to display (default: 12)
   */
  months?: number;
}

/**
 * Super Balance History Chart Component
 *
 * Displays historical balance data for a super holding using data from snapshots.
 * Shows:
 * - Balance history as a white line
 * - Monthly contribution breakdown as stacked bars (employer, employee, investment returns)
 *
 * Features:
 * - X-axis: months
 * - Y-axis (left): balance values for line
 * - Y-axis (right): contribution/returns values for bars
 * - Hover shows exact values for that month
 * - Dark mode styling
 */
export function SuperBalanceHistoryChart({
  holdingId,
  holdingCurrency,
  months = 12,
}: SuperBalanceHistoryChartProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();
  const queryClient = useQueryClient();

  const {
    data: breakdownData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["super-breakdown", months, holdingId],
    queryFn: () => fetchSuperBreakdown(holdingId, months),
    enabled: isLoaded && isSignedIn && !!holdingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["super-breakdown", months, holdingId] });
  }, [queryClient, months, holdingId]);

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <ChartSkeleton variant="bar" />;
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load balance history"
        onRetry={handleRetry}
      />
    );
  }

  // No data available
  if (!breakdownData || !breakdownData.breakdown) {
    return <ChartSkeleton variant="bar" />;
  }

  const { breakdown } = breakdownData;

  // Empty state - no breakdown data yet
  if (breakdown.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          No historical data available yet.
          <br />
          Data will appear after your first monthly check-in.
        </p>
      </div>
    );
  }

  // Single data point - show info card instead of chart
  if (breakdown.length === 1) {
    const point = breakdown[0];
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">Single snapshot recorded:</p>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">
            {formatMonthFull(point.date)}
          </p>
          <p className="text-white text-lg font-semibold">
            {formatCurrency(
              convert(point.balance, holdingCurrency),
              displayCurrency
            )}
          </p>
          {(point.employerContrib > 0 || point.employeeContrib > 0) && (
            <p className="text-gray-400 text-sm mt-2">
              Contributions: {formatCurrency(
                convert(point.employerContrib + point.employeeContrib, holdingCurrency),
                displayCurrency
              )}
            </p>
          )}
        </div>
        <p className="text-gray-500 text-xs">
          Add more snapshots to see a chart.
        </p>
      </div>
    );
  }

  // Build chart data with currency conversion
  const chartData: ChartDataPoint[] = breakdown.map((point) => ({
    date: point.date,
    displayMonth: formatMonth(point.date),
    balance: convert(point.balance, holdingCurrency),
    employerContrib: convert(point.employerContrib, holdingCurrency),
    employeeContrib: convert(point.employeeContrib, holdingCurrency),
    investmentReturns: convert(point.investmentReturns, holdingCurrency),
  }));

  // Calculate Y-axis domains
  // For balance (line)
  const balances = chartData.map((d) => d.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const balanceRange = maxBalance - minBalance;
  const balancePadding = balanceRange * 0.1 || maxBalance * 0.1 || 1000;
  const balanceMin = Math.max(0, minBalance - balancePadding);
  const balanceMax = maxBalance + balancePadding;

  // For contributions/returns (bars) - need to handle negative investment returns
  const allValues = chartData.flatMap((d) => [
    d.employerContrib,
    d.employeeContrib,
    d.investmentReturns,
    // Also include the sum of all three for proper stacking
    d.employerContrib + d.employeeContrib + Math.max(0, d.investmentReturns),
  ]);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues);
  const valuePadding = (maxValue - minValue) * 0.1 || 100;
  const contribMin = minValue - valuePadding;
  const contribMax = maxValue + valuePadding;

  // Format functions for axes
  const formatCurrencyCompact = (value: number): string => {
    return formatCurrency(value, displayCurrency, { compact: true });
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
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
          {/* Left Y-axis for balance (line) */}
          <YAxis
            yAxisId="balance"
            orientation="left"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickLine={{ stroke: "#4B5563" }}
            axisLine={{ stroke: "#4B5563" }}
            tickFormatter={formatCurrencyCompact}
            domain={[balanceMin, balanceMax]}
            width={70}
          />
          {/* Right Y-axis for contributions (bars) */}
          <YAxis
            yAxisId="contrib"
            orientation="right"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickLine={{ stroke: "#4B5563" }}
            axisLine={{ stroke: "#4B5563" }}
            tickFormatter={formatCurrencyCompact}
            domain={[contribMin, contribMax]}
            width={60}
          />
          <Tooltip content={<CustomTooltip currency={displayCurrency} />} />
          <Legend content={<CustomLegend />} verticalAlign="bottom" />

          {/* Stacked bars for contributions */}
          <Bar
            yAxisId="contrib"
            dataKey="employerContrib"
            stackId="contrib"
            fill={COLORS.employer}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            yAxisId="contrib"
            dataKey="employeeContrib"
            stackId="contrib"
            fill={COLORS.employee}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            yAxisId="contrib"
            dataKey="investmentReturns"
            stackId="contrib"
            fill={COLORS.returns}
            radius={[2, 2, 0, 0]}
          />

          {/* Balance line overlaid */}
          <Line
            yAxisId="balance"
            type="monotone"
            dataKey="balance"
            stroke={COLORS.balance}
            strokeWidth={2}
            dot={{ fill: COLORS.balance, strokeWidth: 0, r: 4 }}
            activeDot={{
              r: 6,
              fill: COLORS.balance,
              stroke: "#374151",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
