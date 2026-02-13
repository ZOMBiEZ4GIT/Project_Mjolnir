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
import { HeartPulse } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  CHART_GRID,
  CHART_TEXT,
  CHART_AXIS,
  RESTING_HR,
  VO2_MAX,
} from "@/lib/chart-palette";
import { ChartCard } from "@/components/charts/chart-card";
import { HealthTimeRangeSelector } from "@/components/health/health-time-range-selector";
import { HrvChart } from "@/components/health/hrv-chart";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface DailyRow {
  logDate: string;
  hrv: number | null;
  restingHr: number | null;
  vo2Max: number | null;
  sleepHours: number | null;
}

export default function HeartPage() {
  const [range, setRange] = useState("90d");

  const { data, isLoading, isError, refetch } = useQuery<DailyRow[]>({
    queryKey: queryKeys.health.daily(range),
    queryFn: () =>
      fetch(`/api/health-data/daily?range=${range}`).then((r) => r.json()),
  });

  // HRV-sleep correlation insight
  const insight = useMemo(() => {
    if (!data || data.length < 14) return null;

    const withBoth = data.filter(
      (d) => d.hrv !== null && d.sleepHours !== null
    );
    if (withBoth.length < 10) return null;

    const goodSleepHrv = withBoth
      .filter((d) => d.sleepHours! >= 7)
      .map((d) => d.hrv!);
    const poorSleepHrv = withBoth
      .filter((d) => d.sleepHours! < 7)
      .map((d) => d.hrv!);

    if (goodSleepHrv.length < 3 || poorSleepHrv.length < 3) return null;

    const avgGood =
      goodSleepHrv.reduce((a, b) => a + b, 0) / goodSleepHrv.length;
    const avgPoor =
      poorSleepHrv.reduce((a, b) => a + b, 0) / poorSleepHrv.length;

    if (avgPoor === 0) return null;
    const pctDiff = Math.round(((avgGood - avgPoor) / avgPoor) * 100);

    if (pctDiff > 0) {
      return `HRV is ${pctDiff}% higher on nights with 7+ hours of sleep (${avgGood.toFixed(0)} vs ${avgPoor.toFixed(0)} ms).`;
    }
    return null;
  }, [data]);

  if (isLoading) return <HealthPageSkeleton variant="chart" />;
  if (isError)
    return (
      <ChartError
        message="Failed to load heart data"
        onRetry={() => refetch()}
      />
    );

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="No heart data"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  const hrvData = data.filter((d) => d.hrv !== null);
  const hrData = data.filter((d) => d.restingHr !== null);
  const vo2Data = data.filter((d) => d.vo2Max !== null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-heading-lg text-foreground">Heart & Recovery</h1>
        <HealthTimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Insight card */}
      {insight && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="text-label uppercase text-muted-foreground mb-2">
            Insight
          </h3>
          <p className="text-sm text-foreground">{insight}</p>
        </div>
      )}

      {/* HRV trend */}
      <ChartCard title="Heart Rate Variability (HRV)">
        <HrvChart data={hrvData} />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resting HR */}
        <ChartCard title="Resting Heart Rate">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={hrData}
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
                tickFormatter={(v: number) => `${v}`}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [`${Number(v).toFixed(0)} bpm`, "Resting HR"]}
              />
              <Line
                type="monotone"
                dataKey="restingHr"
                stroke={RESTING_HR}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* VO2 Max */}
        <ChartCard title="VO2 Max">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={vo2Data}
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
                tickFormatter={(v: number) => `${v}`}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={tooltipLabelFormatter}
                formatter={(v: unknown) => [
                  `${Number(v).toFixed(1)} ml/kg/min`,
                  "VO2 Max",
                ]}
              />
              <Line
                type="monotone"
                dataKey="vo2Max"
                stroke={VO2_MAX}
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
