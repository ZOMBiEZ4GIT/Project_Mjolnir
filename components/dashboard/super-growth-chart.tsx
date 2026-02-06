"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartSkeleton, ChartError, ChartExportButton } from "@/components/charts";
import { useCallback, useRef } from "react";

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

// Colors for the stacked areas
const COLORS = {
  employer: "#3B82F6", // blue-500
  employee: "#10B981", // emerald-500 (green)
  returns: "#8B5CF6", // purple-500
};

async function fetchSuperBreakdown(
  months: number,
  holdingId?: string
): Promise<SuperBreakdownResponse> {
  const params = new URLSearchParams({ months: months.toString() });
  if (holdingId) {
    params.set("holdingId", holdingId);
  }
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
  cumulativeEmployer: number;
  cumulativeEmployee: number;
  cumulativeReturns: number;
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
  const total =
    data.cumulativeEmployer + data.cumulativeEmployee + data.cumulativeReturns;

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-muted-foreground text-sm mb-2">
        {formatMonthFull(data.date)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.employer }}
          />
          <span className="text-muted-foreground text-sm">Employer:</span>
          <span className="text-foreground font-medium">
            {formatCurrency(data.cumulativeEmployer, currency)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.employee }}
          />
          <span className="text-muted-foreground text-sm">Employee:</span>
          <span className="text-foreground font-medium">
            {formatCurrency(data.cumulativeEmployee, currency)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.returns }}
          />
          <span className="text-muted-foreground text-sm">Returns:</span>
          <span className="text-foreground font-medium">
            {formatCurrency(data.cumulativeReturns, currency)}
          </span>
        </div>
      </div>
      <div className="border-t border-border mt-2 pt-2">
        <p className="text-muted-foreground text-sm">
          Total Growth:{" "}
          <span className="text-foreground font-semibold">
            {formatCurrency(total, currency)}
          </span>
        </p>
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
    cumulativeEmployer: "Employer Contributions",
    cumulativeEmployee: "Employee Contributions",
    cumulativeReturns: "Investment Returns",
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

interface SuperGrowthChartProps {
  /**
   * Optional specific super holding to display.
   * If not provided, aggregates across all super holdings.
   */
  holdingId?: string;
  /**
   * Number of months of history to display (default: 12)
   */
  months?: number;
}

/**
 * Super Growth Breakdown Chart
 *
 * Displays a stacked area chart showing how super fund balance has grown.
 * Breaks down growth into three components:
 * - Employer contributions (blue)
 * - Employee contributions (green)
 * - Investment returns (purple)
 *
 * Shows cumulative growth over time to visualize total contributions
 * and returns building up.
 */
export function SuperGrowthChart({
  holdingId,
  months = 12,
}: SuperGrowthChartProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);

  const {
    data: breakdownData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["super-breakdown", months, holdingId],
    queryFn: () => fetchSuperBreakdown(months, holdingId),
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["super-breakdown", months, holdingId] });
  }, [queryClient, months, holdingId]);

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return (
      <ChartSkeleton
        title="Superannuation Growth Breakdown"
        variant="bar"
        withContainer
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <ChartError
        message="Failed to load super breakdown"
        onRetry={handleRetry}
        withContainer
      />
    );
  }

  // No data available
  if (!breakdownData || !breakdownData.breakdown) {
    return (
      <ChartSkeleton
        title="Superannuation Growth Breakdown"
        variant="bar"
        withContainer
      />
    );
  }

  const { breakdown, holdings } = breakdownData;

  // Empty state - no super holdings
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Superannuation Growth Breakdown
        </h3>
        <p className="text-muted-foreground text-center py-8">
          No superannuation holdings found. Add a super fund to see growth breakdown.
        </p>
      </div>
    );
  }

  // Empty state - no breakdown data yet
  if (breakdown.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Superannuation Growth Breakdown
        </h3>
        <p className="text-muted-foreground text-center py-8">
          No historical data available yet.
          <br />
          Data will appear after your first monthly check-in.
        </p>
      </div>
    );
  }

  // Determine the currency for conversion (all super holdings should be in same currency,
  // but we'll use AUD as default since that's the primary currency)
  const sourceCurrency = holdings[0]?.currency || "AUD";

  // Calculate cumulative values for stacked area chart
  let cumulativeEmployer = 0;
  let cumulativeEmployee = 0;
  let cumulativeReturns = 0;

  const chartData: ChartDataPoint[] = breakdown.map((point) => {
    cumulativeEmployer += point.employerContrib;
    cumulativeEmployee += point.employeeContrib;
    cumulativeReturns += point.investmentReturns;

    return {
      date: point.date,
      displayMonth: formatMonth(point.date),
      cumulativeEmployer: convert(cumulativeEmployer, sourceCurrency as "AUD" | "NZD" | "USD"),
      cumulativeEmployee: convert(cumulativeEmployee, sourceCurrency as "AUD" | "NZD" | "USD"),
      cumulativeReturns: convert(cumulativeReturns, sourceCurrency as "AUD" | "NZD" | "USD"),
    };
  });

  // Calculate Y-axis domain
  const maxValue = Math.max(
    ...chartData.map(
      (d) => d.cumulativeEmployer + d.cumulativeEmployee + d.cumulativeReturns
    )
  );
  const yMax = maxValue * 1.1 || 1000; // 10% padding, fallback to 1000 if all zeros

  // Create a formatter function for the Y-axis
  const formatCurrencyCompact = (value: number): string => {
    return formatCurrency(value, displayCurrency, { compact: true });
  };

  // Determine title based on whether we're showing all or specific holding
  const title = holdingId
    ? `${holdings[0]?.name || "Super"} Growth Breakdown`
    : "Superannuation Growth Breakdown";

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <ChartExportButton
          chartRef={chartRef}
          filename="super-growth-breakdown"
        />
      </div>
      <div ref={chartRef} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            <Legend content={<CustomLegend />} verticalAlign="bottom" />
            <Area
              type="monotone"
              dataKey="cumulativeEmployer"
              stackId="1"
              stroke={COLORS.employer}
              fill={COLORS.employer}
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="cumulativeEmployee"
              stackId="1"
              stroke={COLORS.employee}
              fill={COLORS.employee}
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="cumulativeReturns"
              stackId="1"
              stroke={COLORS.returns}
              fill={COLORS.returns}
              fillOpacity={0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
