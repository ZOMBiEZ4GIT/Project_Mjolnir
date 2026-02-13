"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  CALORIES,
} from "@/lib/chart-palette";
import { DEFAULT_CALORIE_TARGET_KCAL } from "@/lib/health/constants";

interface CalorieDataPoint {
  logDate: string;
  caloriesKcal: number | null;
}

interface CalorieChartProps {
  data: CalorieDataPoint[];
}

/**
 * Daily calorie bar chart with target reference line.
 */
export function CalorieChart({ data }: CalorieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          tickFormatter={(v: number) => `${v}`}
          width={50}
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
          formatter={(v: unknown) => [`${Number(v).toLocaleString()} kcal`, "Calories"]}
        />
        <ReferenceLine
          y={DEFAULT_CALORIE_TARGET_KCAL}
          stroke="#EF4444"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: `${DEFAULT_CALORIE_TARGET_KCAL} kcal target`,
            position: "insideTopRight",
            fill: CHART_TEXT,
            fontSize: 11,
          }}
        />
        <Bar
          dataKey="caloriesKcal"
          fill={CALORIES}
          fillOpacity={0.8}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
