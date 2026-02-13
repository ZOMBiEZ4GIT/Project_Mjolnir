"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import type { SaverSummary } from "@/lib/hooks/use-budget-summary";
import { useBudgetSavers } from "@/lib/hooks/use-budget-savers";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  POSITIVE,
  NEGATIVE,
  CATEGORY_FALLBACK,
} from "@/lib/chart-palette";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavingsWaterfallProps {
  incomeCents: number;
  spendingSavers: SaverSummary[];
}

interface WaterfallBar {
  label: string;
  emoji: string;
  /** Bottom of the visible bar (invisible spacer) */
  base: number;
  /** Height of the visible bar */
  value: number;
  /** Colour for this bar */
  colour: string;
  /** Type for grouping: income | spending | savings | investment | remaining */
  type: "income" | "spending" | "savings" | "investment" | "remaining";
  /** Dollar amount for tooltip (always positive for display) */
  dollars: number;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallBar }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const typeLabel =
    row.type === "income"
      ? "Income"
      : row.type === "spending"
        ? "Spending"
        : row.type === "savings"
          ? "Savings Goal"
          : row.type === "investment"
            ? "Investment"
            : "Remaining";

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="text-sm font-medium text-foreground mb-1">
        {row.emoji} {row.label}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{typeLabel}</span>
          <span className="text-foreground font-medium">
            ${row.dollars.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom X-axis tick (emoji + name, rotated for readability)
// ---------------------------------------------------------------------------

function XAxisLabel(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  chartData: WaterfallBar[];
}) {
  const { x = 0, y = 0, payload, chartData } = props;
  if (!payload) return null;

  const row = chartData.find((r) => r.label === payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        className="text-[10px] sm:text-[11px]"
        fill={CHART_TEXT}
      >
        {row?.emoji}
      </text>
      <text
        x={0}
        y={14}
        dy={12}
        textAnchor="middle"
        className="text-[9px] sm:text-[10px]"
        fill={CHART_TEXT}
      >
        {payload.value.length > 10
          ? payload.value.slice(0, 9) + "…"
          : payload.value}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const SPENDING_COLOUR = "#F59E0B"; // amber-500 (warm)
const SAVINGS_COLOUR = "#06B6D4"; // cyan-500 (cool)
const INVESTMENT_COLOUR = "#8B5CF6"; // purple-500 (distinct)

function getBarColour(bar: WaterfallBar): string {
  if (bar.type === "income") return POSITIVE;
  if (bar.type === "remaining") return bar.value >= 0 ? POSITIVE : NEGATIVE;
  // Use saver colour if available, otherwise fall back to type default
  if (bar.colour !== CATEGORY_FALLBACK) return bar.colour;
  if (bar.type === "spending") return SPENDING_COLOUR;
  if (bar.type === "savings") return SAVINGS_COLOUR;
  if (bar.type === "investment") return INVESTMENT_COLOUR;
  return CATEGORY_FALLBACK;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SavingsWaterfall({
  incomeCents,
  spendingSavers,
}: SavingsWaterfallProps) {
  const { data: allSavers } = useBudgetSavers();

  const incomeDollars = Math.round(incomeCents / 100);

  // Build waterfall bars
  const bars: WaterfallBar[] = [];

  // 1. Income bar — starts from 0
  bars.push({
    label: "Income",
    emoji: "💰",
    base: 0,
    value: incomeDollars,
    colour: POSITIVE,
    type: "income",
    dollars: incomeDollars,
  });

  // 2. Allocations — each saver draws down from current running total
  let runningTotal = incomeDollars;

  // Get non-spending savers (savings_goal, investment) from the full savers list
  const nonSpendingSavers = (allSavers ?? []).filter(
    (s) => s.saverType !== "spending"
  );

  // All spending savers first (warm colours), sorted by budget amount descending
  const sortedSpending = [...spendingSavers].sort(
    (a, b) => b.budgetCents - a.budgetCents
  );

  for (const saver of sortedSpending) {
    const allocationDollars = Math.round(saver.budgetCents / 100);
    if (allocationDollars <= 0) continue;

    runningTotal -= allocationDollars;
    bars.push({
      label: saver.displayName,
      emoji: saver.emoji,
      base: Math.max(runningTotal, 0),
      value: allocationDollars,
      colour: saver.colour,
      type: "spending",
      dollars: allocationDollars,
    });
  }

  // Then savings goals (cool colours)
  for (const saver of nonSpendingSavers.filter(
    (s) => s.saverType === "savings_goal"
  )) {
    const allocationDollars = Math.round(saver.monthlyBudgetCents / 100);
    if (allocationDollars <= 0) continue;

    runningTotal -= allocationDollars;
    bars.push({
      label: saver.displayName,
      emoji: saver.emoji,
      base: Math.max(runningTotal, 0),
      value: allocationDollars,
      colour: saver.colour || SAVINGS_COLOUR,
      type: "savings",
      dollars: allocationDollars,
    });
  }

  // Then investments (distinct colour)
  for (const saver of nonSpendingSavers.filter(
    (s) => s.saverType === "investment"
  )) {
    const allocationDollars = Math.round(saver.monthlyBudgetCents / 100);
    if (allocationDollars <= 0) continue;

    runningTotal -= allocationDollars;
    bars.push({
      label: saver.displayName,
      emoji: saver.emoji,
      base: Math.max(runningTotal, 0),
      value: allocationDollars,
      colour: saver.colour || INVESTMENT_COLOUR,
      type: "investment",
      dollars: allocationDollars,
    });
  }

  // 3. Remaining float
  bars.push({
    label: "Remaining",
    emoji: runningTotal >= 0 ? "✅" : "⚠️",
    base: 0,
    value: Math.max(runningTotal, 0),
    colour: runningTotal >= 0 ? POSITIVE : NEGATIVE,
    type: "remaining",
    dollars: Math.abs(runningTotal),
  });

  // Chart dimensions
  const maxValue = Math.max(incomeDollars, ...bars.map((b) => b.base + b.value));
  const chartHeight = 320;

  // Nothing to show
  if (incomeDollars <= 0 && bars.length <= 2) return null;

  return (
    <ChartCard title="Income Allocation">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={bars}
          margin={{ top: 8, right: 8, bottom: 32, left: 8 }}
          barSize={32}
        >
          <XAxis
            dataKey="label"
            tick={<XAxisLabel chartData={bars} />}
            stroke={CHART_AXIS}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, Math.ceil(maxValue * 1.05)]}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            stroke={CHART_AXIS}
            tick={{ fill: CHART_TEXT, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={{ stroke: CHART_AXIS }}
            width={50}
          />

          {/* Zero reference line */}
          <ReferenceLine y={0} stroke={CHART_GRID} />

          {/* Invisible base spacer */}
          <Bar
            dataKey="base"
            stackId="waterfall"
            fill="transparent"
            isAnimationActive={false}
          />

          {/* Visible value bar */}
          <Bar
            dataKey="value"
            stackId="waterfall"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {bars.map((bar, idx) => (
              <Cell key={idx} fill={getBarColour(bar)} fillOpacity={0.85} />
            ))}
          </Bar>

          <Tooltip
            content={<WaterfallTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: POSITIVE }}
          />
          Income / Float
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: SPENDING_COLOUR }}
          />
          Spending
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: SAVINGS_COLOUR }}
          />
          Savings
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: INVESTMENT_COLOUR }}
          />
          Investment
        </span>
      </div>
    </ChartCard>
  );
}
