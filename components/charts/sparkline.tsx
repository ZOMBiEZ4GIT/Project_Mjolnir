"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { POSITIVE, NEGATIVE } from "@/lib/chart-palette";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 32,
  positive,
}: SparklineProps) {
  // Render nothing for empty or single-point data
  if (!data || data.length < 2) return null;

  const trend = positive ?? data[data.length - 1] >= data[0];
  const color = trend ? POSITIVE : NEGATIVE;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div style={{ width, height }} role="img" aria-label={`Price trend: ${trend ? "up" : "down"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
