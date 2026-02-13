"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TypeDistribution {
  workoutType: string;
  count: number;
  totalMinutes: number | null;
}

interface WorkoutTypePieProps {
  data: TypeDistribution[];
}

// Distinct palette for workout types
const TYPE_COLOURS = [
  "#F97316", // orange
  "#3B82F6", // blue
  "#22C55E", // green
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
  "#F59E0B", // amber
  "#EC4899", // pink
  "#10B981", // emerald
  "#6366F1", // indigo
];

/**
 * Donut chart showing workout type distribution.
 */
export function WorkoutTypePie({ data }: WorkoutTypePieProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

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
            dataKey="count"
            nameKey="workoutType"
            isAnimationActive={false}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={TYPE_COLOURS[i % TYPE_COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(v: unknown, name: unknown) => {
              const n = Number(v);
              return [
                `${n} (${total > 0 ? Math.round((n / total) * 100) : 0}%)`,
                String(name),
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {data.map((entry, i) => (
          <div key={entry.workoutType} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: TYPE_COLOURS[i % TYPE_COLOURS.length],
              }}
            />
            <span className="text-muted-foreground">
              {entry.workoutType}: {entry.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
