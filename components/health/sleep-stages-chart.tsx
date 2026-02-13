"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  SLEEP_DEEP,
  SLEEP_REM,
  SLEEP_CORE,
  SLEEP_AWAKE,
} from "@/lib/chart-palette";

interface SleepRow {
  logDate: string;
  sleepDeep: number | null;
  sleepRem: number | null;
  sleepCore: number | null;
  sleepAwake: number;
}

interface SleepStagesChartProps {
  data: SleepRow[];
}

/**
 * Stacked area chart showing sleep stage breakdown over time.
 */
export function SleepStagesChart({ data }: SleepStagesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="logDate"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          stroke={CHART_AXIS}
          tickFormatter={(d: string) => {
            const date = new Date(d + "T00:00:00");
            return date.toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
            });
          }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          stroke={CHART_AXIS}
          tickFormatter={(v: number) => `${v}h`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelFormatter={(label: unknown) => {
            const d = String(label);
            const date = new Date(d + "T00:00:00");
            return date.toLocaleDateString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
          }}
          formatter={(v: unknown, name: unknown) => {
            const labels: Record<string, string> = {
              sleepDeep: "Deep",
              sleepRem: "REM",
              sleepCore: "Core",
              sleepAwake: "Awake",
            };
            const n = String(name);
            return [`${Number(v).toFixed(1)}h`, labels[n] ?? n];
          }}
        />
        <Area
          type="monotone"
          dataKey="sleepDeep"
          stackId="1"
          stroke={SLEEP_DEEP}
          fill={SLEEP_DEEP}
          fillOpacity={0.7}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="sleepRem"
          stackId="1"
          stroke={SLEEP_REM}
          fill={SLEEP_REM}
          fillOpacity={0.7}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="sleepCore"
          stackId="1"
          stroke={SLEEP_CORE}
          fill={SLEEP_CORE}
          fillOpacity={0.7}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="sleepAwake"
          stackId="1"
          stroke={SLEEP_AWAKE}
          fill={SLEEP_AWAKE}
          fillOpacity={0.4}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
