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
import { CHART_GRID, CHART_TEXT, CHART_AXIS, HRV } from "@/lib/chart-palette";

interface HrvDataPoint {
  logDate: string;
  hrv: number | null;
}

interface HrvChartProps {
  data: HrvDataPoint[];
}

/**
 * HRV trend line chart.
 */
export function HrvChart({ data }: HrvChartProps) {
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
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          stroke={CHART_AXIS}
          tickFormatter={(v: number) => `${v}`}
          width={40}
          label={{
            value: "ms",
            position: "insideTopLeft",
            fill: CHART_TEXT,
            fontSize: 11,
            offset: -5,
          }}
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
          formatter={(v: unknown) => [`${Number(v).toFixed(0)} ms`, "HRV"]}
        />
        <Line
          type="monotone"
          dataKey="hrv"
          stroke={HRV}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
