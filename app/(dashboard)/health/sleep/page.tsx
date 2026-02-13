"use client";

import { useState, useMemo } from "react";
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
import { Moon } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { CHART_GRID, CHART_TEXT, CHART_AXIS, POSITIVE, NEGATIVE } from "@/lib/chart-palette";
import { ChartCard } from "@/components/charts/chart-card";
import { HealthTimeRangeSelector } from "@/components/health/health-time-range-selector";
import { SleepStagesChart } from "@/components/health/sleep-stages-chart";
import { SleepDonut } from "@/components/health/sleep-donut";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface SleepRow {
  logDate: string;
  sleepHours: number;
  sleepDeep: number | null;
  sleepRem: number | null;
  sleepCore: number | null;
  sleepAwake: number;
  sleepStart: string | null;
  sleepEnd: string | null;
  efficiency: number;
  breathingDisturbances: number | null;
  respiratoryRate: number | null;
}

export default function SleepPage() {
  const [range, setRange] = useState("90d");

  const { data, isLoading, isError, refetch } = useQuery<SleepRow[]>({
    queryKey: queryKeys.health.sleep(range),
    queryFn: () =>
      fetch(`/api/health-data/sleep?range=${range}`).then((r) => r.json()),
  });

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const avgDeep = avg(
      data.map((d) => d.sleepDeep).filter((v): v is number => v !== null)
    );
    const avgRem = avg(
      data.map((d) => d.sleepRem).filter((v): v is number => v !== null)
    );
    const avgCore = avg(
      data.map((d) => d.sleepCore).filter((v): v is number => v !== null)
    );
    const avgAwake = avg(data.map((d) => d.sleepAwake));
    const avgEfficiency = avg(data.map((d) => d.efficiency));
    const avgTotal = avg(data.map((d) => d.sleepHours));

    // Average bedtime and wake time
    const bedtimes = data
      .map((d) => d.sleepStart)
      .filter((v): v is string => v !== null);
    const waketimes = data
      .map((d) => d.sleepEnd)
      .filter((v): v is string => v !== null);

    return {
      avgDeep,
      avgRem,
      avgCore,
      avgAwake,
      avgEfficiency,
      avgTotal,
      avgBedtime:
        bedtimes.length > 0 ? bedtimes[Math.floor(bedtimes.length / 2)] : null,
      avgWaketime:
        waketimes.length > 0
          ? waketimes[Math.floor(waketimes.length / 2)]
          : null,
    };
  }, [data]);

  if (isLoading) return <HealthPageSkeleton variant="chart" />;
  if (isError)
    return (
      <ChartError
        message="Failed to load sleep data"
        onRetry={() => refetch()}
      />
    );

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Moon}
        title="No sleep data"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  const dateFormatter = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 13,
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

  function formatTime(time: string | null): string {
    if (!time) return "—";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const minute = m;
    if (hour >= 12) {
      return `${hour === 12 ? 12 : hour - 12}:${minute} pm`;
    }
    return `${hour === 0 ? 12 : hour}:${minute} am`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-heading-lg text-foreground">Sleep</h1>
        <HealthTimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Avg Sleep
            </div>
            <div className="text-2xl font-semibold text-foreground tabular-nums">
              {stats.avgTotal.toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">hrs</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Avg Efficiency
            </div>
            <div className="text-2xl font-semibold text-foreground tabular-nums">
              {stats.avgEfficiency.toFixed(0)}%
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Avg Bedtime
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatTime(stats.avgBedtime)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Avg Wake Time
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatTime(stats.avgWaketime)}
            </div>
          </div>
        </div>
      )}

      {/* Sleep stages stacked area */}
      <ChartCard title="Sleep Stages">
        <SleepStagesChart data={data} />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sleep efficiency trend */}
        <ChartCard title="Sleep Efficiency">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="logDate"
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={dateFormatter}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={[60, 100]}
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                stroke={CHART_AXIS}
                tickFormatter={(v: number) => `${v}%`}
                width={45}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [`${v}%`, "Efficiency"]}
              />
              <Line
                type="monotone"
                dataKey="efficiency"
                stroke={POSITIVE}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Stage breakdown donut */}
        {stats && (
          <ChartCard title="Average Stage Breakdown">
            <SleepDonut
              deep={stats.avgDeep}
              rem={stats.avgRem}
              core={stats.avgCore}
              awake={stats.avgAwake}
            />
          </ChartCard>
        )}

        {/* Breathing disturbances */}
        <ChartCard title="Breathing Disturbances">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data.filter((d) => d.breathingDisturbances !== null)}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
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
                width={30}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [Number(v).toFixed(1), "Disturbances"]}
              />
              <Line
                type="monotone"
                dataKey="breathingDisturbances"
                stroke={NEGATIVE}
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
