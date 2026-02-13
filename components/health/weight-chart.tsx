"use client";

import {
  LineChart,
  Line,
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
  WEIGHT,
  WEIGHT_AVG,
} from "@/lib/chart-palette";

interface BodyCompRow {
  logDate: string;
  weightKg: number | null;
  weight7dAvg: number | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  bmi: number | null;
}

interface WeightChartProps {
  data: BodyCompRow[];
}

/**
 * Weight trend chart showing raw data points and 7-day rolling average.
 */
export function WeightChart({ data }: WeightChartProps) {
  // Calculate domain with padding
  const weights = data
    .map((d) => d.weightKg)
    .filter((v): v is number => v !== null);
  const min = Math.floor(Math.min(...weights) - 1);
  const max = Math.ceil(Math.max(...weights) + 1);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          domain={[min, max]}
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          stroke={CHART_AXIS}
          tickFormatter={(v: number) => `${v}kg`}
          width={55}
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
          formatter={(value: unknown, name: unknown) => [
            `${Number(value).toFixed(1)} kg`,
            name === "weightKg" ? "Weight" : "7-day avg",
          ]}
        />
        {/* Raw weight dots */}
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke={WEIGHT}
          strokeWidth={1}
          strokeOpacity={0.4}
          dot={{ r: 2, fill: WEIGHT, fillOpacity: 0.5 }}
          activeDot={{ r: 4 }}
          connectNulls
          isAnimationActive={false}
        />
        {/* 7-day rolling average */}
        <Line
          type="monotone"
          dataKey="weight7dAvg"
          stroke={WEIGHT_AVG}
          strokeWidth={2.5}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
