"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { queryKeys } from "@/lib/query-keys";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  POSITIVE,
  NEGATIVE,
} from "@/lib/chart-palette";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpendingPaceChartProps {
  periodStartDate: string;
  periodEndDate: string;
  totalBudgetCents: number;
  totalDays: number;
  daysElapsed: number;
}

interface TransactionRow {
  amountCents: number;
  transactionDate: string;
}

interface DayDataPoint {
  day: number;
  date: string;
  cumulativeSpend: number;
  paceAmount: number;
}

// ---------------------------------------------------------------------------
// Fetch transactions for the period
// ---------------------------------------------------------------------------

async function fetchPeriodTransactions(
  from: string,
  to: string
): Promise<TransactionRow[]> {
  const params = new URLSearchParams({
    from,
    to,
    limit: "2000",
  });
  const res = await fetch(`/api/budget/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.transactions;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function PaceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DayDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const diff = point.cumulativeSpend - point.paceAmount;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="text-xs text-muted-foreground mb-2">{point.date}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Spent</span>
          <span className="text-foreground font-medium">
            ${point.cumulativeSpend.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Pace</span>
          <span className="text-foreground font-medium">
            ${Math.round(point.paceAmount).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border">
          <span className="text-muted-foreground">
            {diff > 0 ? "Over pace" : "Under pace"}
          </span>
          <span
            className={
              diff > 0
                ? "text-destructive font-medium"
                : "text-positive font-medium"
            }
          >
            ${Math.abs(Math.round(diff)).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SpendingPaceChart({
  periodStartDate,
  periodEndDate,
  totalBudgetCents,
  totalDays,
  daysElapsed,
}: SpendingPaceChartProps) {
  const totalBudgetDollars = totalBudgetCents / 100;
  const queryClient = useQueryClient();

  // Fetch all transactions for the period
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: queryKeys.budget.transactions.list({
      from: periodStartDate,
      to: periodEndDate,
      limit: "2000",
    }),
    queryFn: () => fetchPeriodTransactions(periodStartDate, periodEndDate),
    staleTime: 30_000,
  });

  // Build daily cumulative data
  const chartData = useMemo(() => {
    if (!transactions) return [];

    // Group spending by day number (1-indexed)
    const startDate = new Date(periodStartDate);
    const dailySpend: Record<number, number> = {};

    for (const txn of transactions) {
      // Only count negative amounts (spending), ignore income
      if (txn.amountCents >= 0) continue;

      const txnDate = new Date(txn.transactionDate);
      const diffMs = txnDate.getTime() - startDate.getTime();
      const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

      if (dayNum >= 1 && dayNum <= totalDays) {
        dailySpend[dayNum] = (dailySpend[dayNum] ?? 0) + Math.abs(txn.amountCents);
      }
    }

    // Build cumulative data points up to today (daysElapsed)
    const points: DayDataPoint[] = [];
    let runningTotal = 0;
    const dayLimit = Math.min(daysElapsed, totalDays);

    for (let day = 1; day <= dayLimit; day++) {
      const spentToday = dailySpend[day] ?? 0;
      runningTotal += spentToday;

      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day - 1);

      points.push({
        day,
        date: dayDate.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        }),
        cumulativeSpend: Math.round(runningTotal / 100),
        paceAmount: (totalBudgetDollars / totalDays) * day,
      });
    }

    return points;
  }, [transactions, periodStartDate, totalBudgetDollars, totalDays, daysElapsed]);

  if (isLoading) {
    return (
      <ChartCard title="Spending Pace">
        <ChartSkeleton variant="line" height="h-[250px]" />
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Spending Pace">
        <ChartError
          message="Failed to load spending pace"
          onRetry={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.budget.transactions.list({
                from: periodStartDate,
                to: periodEndDate,
                limit: "2000",
              }),
            })
          }
        />
      </ChartCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <ChartCard title="Spending Pace">
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          No spending data yet for this period
        </div>
      </ChartCard>
    );
  }

  const maxSpend = Math.max(
    ...chartData.map((d) => Math.max(d.cumulativeSpend, d.paceAmount))
  );

  return (
    <ChartCard title="Spending Pace">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <defs>
            {/* Green fill for under-pace area */}
            <linearGradient id="underPaceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={POSITIVE} stopOpacity={0.2} />
              <stop offset="100%" stopColor={POSITIVE} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TEXT, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={{ stroke: CHART_AXIS }}
            tickFormatter={(day: number) => {
              // Show every ~5th label to avoid crowding
              if (totalDays <= 10 || day === 1 || day % 5 === 0) return `${day}`;
              return "";
            }}
          />
          <YAxis
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TEXT, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={{ stroke: CHART_AXIS }}
            domain={[0, Math.ceil(maxSpend * 1.1)]}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            width={50}
          />

          {/* Today marker */}
          {daysElapsed < totalDays && (
            <ReferenceLine
              x={daysElapsed}
              stroke={CHART_TEXT}
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "Today",
                position: "top",
                fill: CHART_TEXT,
                fontSize: 10,
              }}
            />
          )}

          {/* Pace line — grey dashed diagonal */}
          <Area
            type="monotone"
            dataKey="paceAmount"
            stroke={CHART_GRID}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
            isAnimationActive={false}
          />

          {/* Actual cumulative spending */}
          <Area
            type="monotone"
            dataKey="cumulativeSpend"
            stroke={
              chartData.length > 0 &&
              chartData[chartData.length - 1].cumulativeSpend >
                chartData[chartData.length - 1].paceAmount
                ? NEGATIVE
                : POSITIVE
            }
            strokeWidth={2}
            fill="url(#underPaceFill)"
            dot={false}
            isAnimationActive={false}
          />

          <Tooltip
            content={<PaceTooltip />}
            cursor={{ stroke: CHART_GRID, strokeDasharray: "3 3" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
