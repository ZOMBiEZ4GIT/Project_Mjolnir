"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
import { ChartSkeleton, ChartError, ChartExportButton } from "@/components/charts";
import { CHART_GRID, CHART_TEXT, CHART_AXIS, EMPLOYER, EMPLOYEE, RETURNS, NET_WORTH } from "@/lib/chart-palette";
import { useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

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

const COLORS = {
  employer: EMPLOYER,
  employee: EMPLOYEE,
  returns: RETURNS,
  balance: NET_WORTH,
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
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-muted-foreground text-sm mb-2">
        {formatMonthFull(data.date)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.balance }}
          />
          <span className="text-muted-foreground text-sm">Balance:</span>
          <span className="text-foreground font-semibold">
            {formatCurrency(data.balance, currency)}
          </span>
        </div>
        <div className="border-t border-border my-2 pt-2">
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wide">
            Monthly Changes
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.employer }}
            />
            <span className="text-muted-foreground text-sm">Employer:</span>
            <span className="text-foreground font-medium">
              {formatCurrency(data.employerContrib, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.employee }}
            />
            <span className="text-muted-foreground text-sm">Employee:</span>
            <span className="text-foreground font-medium">
              {formatCurrency(data.employeeContrib, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.returns }}
            />
            <span className="text-muted-foreground text-sm">Returns:</span>
            <span
              className={`font-medium ${
                data.investmentReturns >= 0 ? "text-positive" : "text-destructive"
              }`}
            >
              {data.investmentReturns >= 0 ? "+" : ""}
              {formatCurrency(data.investmentReturns, currency)}
            </span>
          </div>
        </div>
        <div className="border-t border-border mt-2 pt-2">
          <p className="text-muted-foreground text-sm">
            Monthly Total:{" "}
            <span
              className={`font-semibold ${
                totalContrib >= 0 ? "text-positive" : "text-destructive"
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
          <span className="text-muted-foreground text-sm">
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
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const {
    data: breakdownData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.super.breakdown(months, holdingId),
    queryFn: () => fetchSuperBreakdown(holdingId, months),
    enabled: !!holdingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.super.breakdown(months, holdingId) });
  }, [queryClient, months, holdingId]);

  // Show skeleton while loading
  if (isLoading || currencyLoading) {
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
        <p className="text-muted-foreground text-center">
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
        <p className="text-muted-foreground text-sm">Single snapshot recorded:</p>
        <div className="bg-card rounded-lg p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {formatMonthFull(point.date)}
          </p>
          <p className="text-foreground text-lg font-semibold">
            {formatCurrency(
              convert(point.balance, holdingCurrency),
              displayCurrency
            )}
          </p>
          {(point.employerContrib > 0 || point.employeeContrib > 0) && (
            <p className="text-muted-foreground text-sm mt-2">
              Contributions: {formatCurrency(
                convert(point.employerContrib + point.employeeContrib, holdingCurrency),
                displayCurrency
              )}
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
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
    <motion.div {...(reducedMotion ? {} : fadeIn)}>
      <div className="flex justify-end mb-4">
        <ChartExportButton
          chartRef={chartRef}
          filename="super-balance-history"
        />
      </div>
      <div ref={chartRef} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
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
            {/* Left Y-axis for balance (line) */}
            <YAxis
              yAxisId="balance"
              orientation="left"
              stroke={CHART_TEXT}
              tick={{ fill: CHART_TEXT, fontSize: 12 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
              tickFormatter={formatCurrencyCompact}
              domain={[balanceMin, balanceMax]}
              width={70}
            />
            {/* Right Y-axis for contributions (bars) */}
            <YAxis
              yAxisId="contrib"
              orientation="right"
              stroke={CHART_TEXT}
              tick={{ fill: CHART_TEXT, fontSize: 12 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
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
                stroke: CHART_GRID,
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
