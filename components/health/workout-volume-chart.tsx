"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_GRID, CHART_TEXT, CHART_AXIS, ACCENT } from "@/lib/chart-palette";

interface WeeklyWorkout {
  weekStart: string;
  sessionCount: number;
  totalMinutes: number | null;
  totalKcal: number | null;
}

interface WorkoutVolumeChartProps {
  data: WeeklyWorkout[];
}

/**
 * Weekly workout volume (total minutes) bar chart.
 */
export function WorkoutVolumeChart({ data }: WorkoutVolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="weekStart"
          tick={{ fill: CHART_TEXT, fontSize: 11 }}
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
          tick={{ fill: CHART_TEXT, fontSize: 11 }}
          stroke={CHART_AXIS}
          tickFormatter={(v: number) => `${v}m`}
          width={45}
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
            return `Week of ${date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
          }}
          formatter={(v: unknown) => [`${v} mins`, "Volume"]}
        />
        <Bar
          dataKey="totalMinutes"
          fill={ACCENT}
          fillOpacity={0.8}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
