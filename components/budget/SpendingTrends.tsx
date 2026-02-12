"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  POSITIVE,
  CATEGORY_FALLBACK,
} from "@/lib/chart-palette";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendCategory {
  categoryId: string;
  name: string;
  colour: string;
  spentCents: number;
}

interface TrendPeriod {
  periodId: string;
  startDate: string;
  endDate: string;
  totalSpentCents: number;
  totalIncomeCents: number;
  savingsRate: number;
  isProjected: boolean;
  categories: TrendCategory[];
}

interface ChartDataPoint {
  displayMonth: string;
  startDate: string;
  totalSpent: number;
  savingsRate: number;
  isProjected: boolean;
  [key: string]: string | number | boolean;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchTrends(periods: number): Promise<TrendPeriod[]> {
  const response = await fetch(`/api/budget/trends?periods=${periods}`);
  if (!response.ok) {
    throw new Error("Failed to fetch spending trends");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatMonth(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", { month: "short" });
}

function formatMonthFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(dollars)}`;
}

function formatDollarsFull(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: ChartDataPoint;
  }>;
  allCategories: Array<{ id: string; name: string; colour: string }>;
}

function TrendsTooltip({ active, payload, allCategories }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const categoryLookup = new Map(allCategories.map((c) => [c.id, c]));

  // Get category entries from payload (exclude savingsRate line)
  const categoryEntries = payload.filter(
    (p) => p.dataKey !== "savingsRate" && p.dataKey !== "totalSpent"
  );

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-[250px]">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-muted-foreground text-sm">
          {formatMonthFull(data.startDate)}
        </p>
        {data.isProjected && (
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
            Projected
          </span>
        )}
      </div>
      <div className="space-y-1">
        {categoryEntries.map((entry) => {
          const cat = categoryLookup.get(entry.dataKey);
          if (!cat || entry.value === 0) return null;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground text-xs truncate flex-1">
                {cat.name}
              </span>
              <span className="text-foreground text-xs font-medium">
                {formatDollarsFull(entry.value * 100)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
        <span className="text-muted-foreground text-xs">Total</span>
        <span className="text-foreground text-sm font-semibold">
          {formatDollarsFull(data.totalSpent * 100)}
        </span>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-muted-foreground text-xs">Savings rate</span>
        <span
          className={`text-xs font-medium ${
            data.savingsRate >= 0 ? "text-positive" : "text-destructive"
          }`}
        >
          {data.savingsRate}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom legend
// ---------------------------------------------------------------------------

interface LegendPayload {
  value: string;
  type: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayload[];
  allCategories: Array<{ id: string; name: string; colour: string }>;
}

function TrendsLegend({ payload, allCategories }: CustomLegendProps) {
  if (!payload) return null;

  const categoryLookup = new Map(allCategories.map((c) => [c.id, c]));

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
      {payload.map((entry) => {
        if (entry.value === "savingsRate") {
          return (
            <div key={entry.value} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground text-xs">Savings Rate</span>
            </div>
          );
        }
        const cat = categoryLookup.get(entry.value);
        return (
          <div key={entry.value} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground text-xs">
              {cat?.name || entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ViewMode = "total" | "breakdown";

export function SpendingTrends() {
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState<ViewMode>("total");

  const periodsCount = 6;

  const {
    data: trendsData,
    isLoading,
    error,
  } = useQuery<TrendPeriod[]>({
    queryKey: queryKeys.budget.trends(periodsCount),
    queryFn: () => fetchTrends(periodsCount),
    staleTime: 1000 * 60 * 5,
  });

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.budget.trends(periodsCount),
    });
  }, [queryClient, periodsCount]);

  // Loading & error states
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <div className="h-5 w-36 rounded bg-muted mb-4" />
        <ChartSkeleton variant="bar" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Spending Trends
        </h2>
        <ChartError
          message="Failed to load spending trends"
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!trendsData || trendsData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Spending Trends
        </h2>
        <div className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground text-sm text-center">
            Not enough data yet. Trends will appear after your second budget
            period.
          </p>
        </div>
      </div>
    );
  }

  // Collect all unique categories across all periods
  const categoryMap = new Map<
    string,
    { id: string; name: string; colour: string }
  >();
  for (const period of trendsData) {
    for (const cat of period.categories) {
      if (!categoryMap.has(cat.categoryId)) {
        categoryMap.set(cat.categoryId, {
          id: cat.categoryId,
          name: cat.name,
          colour: cat.colour || CATEGORY_FALLBACK,
        });
      }
    }
  }
  const allCategories = Array.from(categoryMap.values());

  // Build chart data
  const chartData: ChartDataPoint[] = trendsData.map((period) => {
    const point: ChartDataPoint = {
      displayMonth: formatMonth(period.startDate),
      startDate: period.startDate,
      totalSpent: period.totalSpentCents / 100,
      savingsRate: period.savingsRate,
      isProjected: period.isProjected,
    };

    // Add category spending as separate keys for stacked bars
    for (const cat of period.categories) {
      point[cat.categoryId] = cat.spentCents / 100;
    }

    return point;
  });

  // Y-axis domain for spending
  const maxSpent = Math.max(...chartData.map((d) => d.totalSpent));
  const spendingMax = maxSpent * 1.1 || 100;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Spending Trends
        </h2>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              onClick={() => setViewMode("total")}
              className={`px-2.5 py-1 transition-colors ${
                viewMode === "total"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setViewMode("breakdown")}
              className={`px-2.5 py-1 transition-colors ${
                viewMode === "breakdown"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              By Category
            </button>
          </div>
          <ChartExportButton
            chartRef={chartRef}
            filename="spending-trends"
          />
        </div>
      </div>

      <motion.div {...(reducedMotion ? {} : fadeIn)}>
        <div ref={chartRef} className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 45, left: 5, bottom: 5 }}
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
              {/* Left Y-axis: spending ($) */}
              <YAxis
                yAxisId="spending"
                orientation="left"
                stroke={CHART_TEXT}
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                tickLine={{ stroke: CHART_AXIS }}
                axisLine={{ stroke: CHART_AXIS }}
                tickFormatter={(v: number) => formatDollars(v * 100)}
                domain={[0, spendingMax]}
                width={50}
              />
              {/* Right Y-axis: savings rate (%) */}
              <YAxis
                yAxisId="rate"
                orientation="right"
                stroke={CHART_TEXT}
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                tickLine={{ stroke: CHART_AXIS }}
                axisLine={{ stroke: CHART_AXIS }}
                tickFormatter={(v: number) => `${v}%`}
                domain={[-20, 100]}
                width={40}
              />
              <Tooltip
                content={
                  <TrendsTooltip allCategories={allCategories} />
                }
              />
              <Legend
                content={
                  <TrendsLegend allCategories={allCategories} />
                }
                verticalAlign="bottom"
              />

              {/* Bars — total mode: single bar; breakdown mode: stacked by category */}
              {viewMode === "total" ? (
                <Bar
                  yAxisId="spending"
                  dataKey="totalSpent"
                  fill={CHART_AXIS}
                  radius={[4, 4, 0, 0]}
                  name="totalSpent"
                />
              ) : (
                allCategories.map((cat) => (
                  <Bar
                    key={cat.id}
                    yAxisId="spending"
                    dataKey={cat.id}
                    stackId="categories"
                    fill={cat.colour}
                    name={cat.id}
                  />
                ))
              )}

              {/* Savings rate line overlay */}
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="savingsRate"
                stroke={POSITIVE}
                strokeWidth={2}
                dot={{ fill: POSITIVE, strokeWidth: 0, r: 3 }}
                activeDot={{
                  r: 5,
                  fill: POSITIVE,
                  stroke: CHART_GRID,
                  strokeWidth: 2,
                }}
                name="savingsRate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
