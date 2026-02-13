"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MACRO_PROTEIN, MACRO_CARBS, MACRO_FAT } from "@/lib/chart-palette";

interface MacroPieProps {
  protein: number;
  carbs: number;
  fat: number;
}

const COLOURS = [MACRO_PROTEIN, MACRO_CARBS, MACRO_FAT];

/**
 * Donut chart showing macronutrient breakdown.
 */
export function MacroPie({ protein, carbs, fat }: MacroPieProps) {
  const data = [
    { name: "Protein", value: protein, unit: "g" },
    { name: "Carbs", value: carbs, unit: "g" },
    { name: "Fat", value: fat, unit: "g" },
  ].filter((d) => d.value > 0);

  const total = protein + carbs + fat;

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
              <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
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
                `${n.toFixed(0)}g (${total > 0 ? Math.round((n / total) * 100) : 0}%)`,
                String(name),
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOURS[i % COLOURS.length] }}
            />
            <span className="text-muted-foreground">
              {entry.name}: {entry.value.toFixed(0)}g
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
