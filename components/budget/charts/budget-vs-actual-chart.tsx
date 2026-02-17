"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import type { SaverSummary } from "@/lib/hooks/use-budget-summary";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  NEGATIVE,
} from "@/lib/chart-palette";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BudgetVsActualChartProps {
  savers: SaverSummary[];
  progressPercent: number;
}

interface ChartRow {
  label: string;
  emoji: string;
  saverKey: string;
  colour: string;
  budgetDollars: number;
  actualDollars: number;
  /** Actual capped at budget — the "normal" portion */
  actualNormal: number;
  /** Amount exceeding budget, rendered in red */
  actualOverflow: number;
  percentUsed: number;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const diff = row.actualDollars - row.budgetDollars;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-sm font-medium text-foreground mb-2">
        {row.emoji} {row.label}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Budget</span>
          <span className="text-foreground font-medium">
            ${row.budgetDollars.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Actual</span>
          <span className="text-foreground font-medium">
            ${row.actualDollars.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Used</span>
          <span className="text-foreground font-medium">
            {Math.round(row.percentUsed)}%
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border">
          <span className="text-muted-foreground">
            {diff > 0 ? "Over" : "Remaining"}
          </span>
          <span
            className={
              diff > 0 ? "text-destructive font-medium" : "text-positive font-medium"
            }
          >
            ${Math.abs(diff).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Y-axis tick (emoji + name)
// ---------------------------------------------------------------------------

function YAxisLabel(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  chartData: ChartRow[];
  isMobile?: boolean;
}) {
  const { x = 0, y = 0, payload, chartData, isMobile } = props;
  if (!payload) return null;

  const row = chartData.find((r) => r.label === payload.value);
  const displayName = isMobile && payload.value.length > 8
    ? payload.value.slice(0, 7) + "…"
    : payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-4}
        y={0}
        dy={4}
        textAnchor="end"
        className="text-[11px] sm:text-xs"
        fill={CHART_TEXT}
      >
        {row?.emoji} {displayName}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BudgetVsActualChart({
  savers,
  progressPercent,
}: BudgetVsActualChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (savers.length === 0) {
    return (
      <ChartCard title="Budget vs Actual">
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          No saver data for this period
        </div>
      </ChartCard>
    );
  }

  // Transform saver data for the chart
  const chartData: ChartRow[] = savers.map((s) => {
    const budgetDollars = Math.round(s.budgetCents / 100);
    const actualDollars = Math.round(s.actualCents / 100);
    const normalPortion = Math.min(actualDollars, budgetDollars);
    const overflowPortion = Math.max(0, actualDollars - budgetDollars);

    return {
      label: s.displayName,
      emoji: s.emoji,
      saverKey: s.saverKey,
      colour: s.colour,
      budgetDollars,
      actualDollars,
      actualNormal: normalPortion,
      actualOverflow: overflowPortion,
      percentUsed: s.percentUsed,
    };
  });

  // Maximum value for X-axis domain (budget or actual, whichever is larger)
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.budgetDollars, d.actualDollars))
  );

  // Pace line position: progressPercent% of the maximum budget
  const maxBudget = Math.max(...chartData.map((d) => d.budgetDollars));
  const paceLineValue = Math.round((progressPercent / 100) * maxBudget);

  // Calculate Y-axis width — narrower on mobile to give more chart space
  const longestLabel = Math.max(
    ...chartData.map((d) => `${d.emoji} ${d.label}`.length)
  );
  const yAxisWidth = isMobile
    ? Math.min(Math.max(longestLabel * 5.5, 70), 100)
    : Math.min(Math.max(longestLabel * 7, 80), 140);

  const barHeight = 28;
  const chartHeight = Math.max(chartData.length * (barHeight + 16) + 40, 150);

  return (
    <ChartCard title="Budget vs Actual">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          barGap={-barHeight}
          barSize={barHeight}
        >
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxValue * 1.1)]}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TEXT, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={{ stroke: CHART_AXIS }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            tick={<YAxisLabel chartData={chartData} isMobile={isMobile} />}
            axisLine={false}
            tickLine={false}
          />

          {/* Pace reference line */}
          <ReferenceLine
            x={paceLineValue}
            stroke={CHART_TEXT}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `${progressPercent}% pace`,
              position: "top",
              fill: CHART_TEXT,
              fontSize: 10,
            }}
          />

          {/* Budget bar — semi-transparent outline */}
          <Bar
            dataKey="budgetDollars"
            fill="transparent"
            stroke={CHART_GRID}
            strokeWidth={1}
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          />

          {/* Actual bar — solid fill (normal portion) */}
          <Bar
            dataKey="actualNormal"
            stackId="actual"
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          >
            {chartData.map((row) => (
              <Cell key={row.saverKey} fill={row.colour} fillOpacity={0.85} />
            ))}
          </Bar>

          {/* Overflow portion — rendered in red */}
          <Bar
            dataKey="actualOverflow"
            stackId="actual"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {chartData.map((row) => (
              <Cell
                key={row.saverKey}
                fill={row.actualOverflow > 0 ? NEGATIVE : "transparent"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
