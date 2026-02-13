"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartSkeleton, ChartError } from "@/components/charts";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  CATEGORY_FALLBACK,
} from "@/lib/chart-palette";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendSaver {
  saverKey: string;
  displayName: string;
  emoji: string;
  colour: string;
  budgetCents: number;
  spentCents: number;
}

interface TrendPeriodResponse {
  periodId: string;
  startDate: string;
  endDate: string;
  totalSpentCents: number;
  totalIncomeCents: number;
  savingsRate: number;
  isProjected: boolean;
  savers: TrendSaver[];
}

interface ChartDataPoint {
  displayMonth: string;
  startDate: string;
  isProjected: boolean;
  [key: string]: string | number | boolean;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchTrends(periods: number): Promise<TrendPeriodResponse[]> {
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

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: ChartDataPoint;
}

interface TrendsTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  saverLookup: Map<string, { displayName: string; emoji: string; budgetCents: number }>;
}

function TrendsTooltip({ active, payload, saverLookup }: TrendsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-[260px]">
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
        {payload.map((entry) => {
          const meta = saverLookup.get(entry.dataKey);
          if (!meta) return null;
          const overBudget =
            meta.budgetCents > 0 && entry.value * 100 > meta.budgetCents;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground text-xs truncate flex-1">
                {meta.emoji} {meta.displayName}
              </span>
              <span
                className={`text-xs font-medium ${
                  overBudget ? "text-destructive" : "text-foreground"
                }`}
              >
                {formatDollarsFull(entry.value * 100)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SpendingTrendsChart() {
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  const periodsCount = 6;

  const {
    data: trendsData,
    isLoading,
    error,
  } = useQuery<TrendPeriodResponse[]>({
    queryKey: queryKeys.budget.trends(periodsCount),
    queryFn: () => fetchTrends(periodsCount),
    staleTime: 1000 * 60 * 5,
  });

  // Track which savers are visible (all visible by default)
  const [hiddenSavers, setHiddenSavers] = useState<Set<string>>(new Set());

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.budget.trends(periodsCount),
    });
  }, [queryClient]);

  const toggleSaver = useCallback((saverKey: string) => {
    setHiddenSavers((prev) => {
      const next = new Set(prev);
      if (next.has(saverKey)) {
        next.delete(saverKey);
      } else {
        next.add(saverKey);
      }
      return next;
    });
  }, []);

  // Loading & error states
  if (isLoading) {
    return (
      <ChartCard title="Spending Trends">
        <ChartSkeleton variant="bar" />
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Spending Trends">
        <ChartError
          message="Failed to load spending trends"
          onRetry={handleRetry}
        />
      </ChartCard>
    );
  }

  if (!trendsData || trendsData.length === 0) {
    return (
      <ChartCard title="Spending Trends">
        <div className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground text-sm text-center">
            Not enough data yet. Trends will appear after your second budget
            period.
          </p>
        </div>
      </ChartCard>
    );
  }

  // Collect all unique savers across all periods
  const saverMap = new Map<
    string,
    { saverKey: string; displayName: string; emoji: string; colour: string; budgetCents: number }
  >();
  for (const period of trendsData) {
    if (!period.savers) continue;
    for (const saver of period.savers) {
      if (!saverMap.has(saver.saverKey)) {
        saverMap.set(saver.saverKey, {
          saverKey: saver.saverKey,
          displayName: saver.displayName,
          emoji: saver.emoji,
          colour: saver.colour || CATEGORY_FALLBACK,
          budgetCents: saver.budgetCents,
        });
      }
    }
  }
  const allSavers = Array.from(saverMap.values());
  const visibleSavers = allSavers.filter((s) => !hiddenSavers.has(s.saverKey));

  // Build chart data — each period is a data point with saverKey-keyed spending values (in dollars)
  const chartData: ChartDataPoint[] = trendsData.map((period) => {
    const point: ChartDataPoint = {
      displayMonth: formatMonth(period.startDate),
      startDate: period.startDate,
      isProjected: period.isProjected,
    };

    if (period.savers) {
      for (const saver of period.savers) {
        point[saver.saverKey] = saver.spentCents / 100;
      }
    }

    return point;
  });

  // Y-axis domain
  const maxSpent = Math.max(
    ...chartData.flatMap((d) =>
      visibleSavers.map((s) => (typeof d[s.saverKey] === "number" ? (d[s.saverKey] as number) : 0))
    ),
    ...visibleSavers.map((s) => s.budgetCents / 100)
  );
  const yMax = maxSpent * 1.1 || 100;

  return (
    <ChartCard
      title="Spending Trends"
      actions={
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 -mb-1">
          {allSavers.map((saver) => {
            const isVisible = !hiddenSavers.has(saver.saverKey);
            return (
              <button
                key={saver.saverKey}
                onClick={() => toggleSaver(saver.saverKey)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors border shrink-0 ${
                  isVisible
                    ? "border-border bg-card text-foreground"
                    : "border-transparent bg-muted/50 text-muted-foreground line-through"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: isVisible
                      ? saver.colour
                      : "transparent",
                    border: isVisible
                      ? "none"
                      : `1px solid ${CHART_AXIS}`,
                  }}
                />
                <span>{saver.emoji}</span>
              </button>
            );
          })}
        </div>
      }
    >
      <div ref={chartRef} className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
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
              tick={{ fill: CHART_TEXT, fontSize: 11 }}
              tickLine={{ stroke: CHART_AXIS }}
              axisLine={{ stroke: CHART_AXIS }}
              tickFormatter={(v: number) => formatDollars(v * 100)}
              domain={[0, yMax]}
              width={50}
            />
            <Tooltip
              content={<TrendsTooltip saverLookup={saverMap} />}
            />

            {/* Budget reference lines — dashed horizontal per visible saver */}
            {visibleSavers.map((saver) => (
              <ReferenceLine
                key={`budget-${saver.saverKey}`}
                y={saver.budgetCents / 100}
                stroke={saver.colour}
                strokeDasharray="4 4"
                strokeOpacity={0.35}
              />
            ))}

            {/* Lines — one per visible saver */}
            {visibleSavers.map((saver) => (
              <Line
                key={saver.saverKey}
                type="monotone"
                dataKey={saver.saverKey}
                stroke={saver.colour}
                strokeWidth={2}
                dot={{ fill: saver.colour, strokeWidth: 0, r: 3 }}
                activeDot={{
                  r: 5,
                  fill: saver.colour,
                  stroke: CHART_GRID,
                  strokeWidth: 2,
                }}
                name={saver.saverKey}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
