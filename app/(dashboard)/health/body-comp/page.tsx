"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Scale } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  BODY_FAT,
  LEAN_MASS,
  ACCENT,
} from "@/lib/chart-palette";
import { ChartCard } from "@/components/charts/chart-card";
import { HealthTimeRangeSelector } from "@/components/health/health-time-range-selector";
import { WeightChart } from "@/components/health/weight-chart";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface BodyCompRow {
  logDate: string;
  weightKg: number | null;
  weight7dAvg: number | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  bmi: number | null;
}

export default function BodyCompPage() {
  const [range, setRange] = useState("90d");

  const { data, isLoading, isError, refetch } = useQuery<BodyCompRow[]>({
    queryKey: queryKeys.health.bodyComp(range),
    queryFn: () =>
      fetch(`/api/health-data/body-comp?range=${range}`).then((r) => r.json()),
  });

  if (isLoading) return <HealthPageSkeleton variant="chart" />;
  if (isError)
    return (
      <ChartError
        message="Failed to load body composition data"
        onRetry={() => refetch()}
      />
    );

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="No body composition data"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  const dateFormatter = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const tooltipLabelFormatter = (label: unknown) => {
    const d = String(label);
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 13,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-heading-lg text-foreground">Body Composition</h1>
        <HealthTimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Weight trend */}
      <ChartCard title="Weight Trend">
        <WeightChart data={data} />
      </ChartCard>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Body Fat % */}
        <ChartCard title="Body Fat %">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="logDate"
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={dateFormatter}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={(v: number) => `${v}%`}
                width={45}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Body Fat"]}
              />
              <Line
                type="monotone"
                dataKey="bodyFatPct"
                stroke={BODY_FAT}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lean Mass */}
        <ChartCard title="Lean Mass">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="logDate"
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={dateFormatter}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={(v: number) => `${v}kg`}
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [`${Number(v).toFixed(1)} kg`, "Lean Mass"]}
              />
              <Line
                type="monotone"
                dataKey="leanMassKg"
                stroke={LEAN_MASS}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* BMI */}
        <ChartCard title="BMI">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="logDate"
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={dateFormatter}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [Number(v).toFixed(1), "BMI"]}
              />
              <Line
                type="monotone"
                dataKey="bmi"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
