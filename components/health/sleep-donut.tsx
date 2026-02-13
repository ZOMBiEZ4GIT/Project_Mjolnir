"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  SLEEP_DEEP,
  SLEEP_REM,
  SLEEP_CORE,
  SLEEP_AWAKE,
} from "@/lib/chart-palette";

interface SleepDonutProps {
  deep: number;
  rem: number;
  core: number;
  awake: number;
}

const STAGE_COLOURS = [SLEEP_DEEP, SLEEP_REM, SLEEP_CORE, SLEEP_AWAKE];

/**
 * Donut chart showing average sleep stage breakdown.
 */
export function SleepDonut({ deep, rem, core, awake }: SleepDonutProps) {
  const data = [
    { name: "Deep", value: deep },
    { name: "REM", value: rem },
    { name: "Core", value: core },
    { name: "Awake", value: awake },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            isAnimationActive={false}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={STAGE_COLOURS[i % STAGE_COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(v: unknown) => [`${Number(v).toFixed(1)}h`, undefined]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STAGE_COLOURS[i % STAGE_COLOURS.length] }}
            />
            <span className="text-muted-foreground">
              {entry.name}: {entry.value.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
