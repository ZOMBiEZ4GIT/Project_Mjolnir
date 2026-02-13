"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Scale,
  Flame,
  Beef,
  Footprints,
  Moon,
  HeartPulse,
  Activity,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { HealthKpiCard } from "@/components/health/health-kpi-card";
import { WeeklySummaryRow } from "@/components/health/weekly-summary-row";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface TodayData {
  logDate: string;
  weightKg: number | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  steps: number | null;
  sleepHours: number | null;
  restingHr: number | null;
  hrv: number | null;
  [key: string]: unknown;
}

interface TodayResponse {
  today: TodayData | null;
  yesterday: TodayData | null;
  sparkline: TodayData[];
}

interface WeeklyRow {
  weekStart: string;
  avgWeightKg: number | null;
  avgCaloriesKcal: number | null;
  avgProteinG: number | null;
  avgHrv: number | null;
  avgSleepHours: number | null;
  avgSteps: number | null;
  avgRestingHr: number | null;
  daysWithData: number;
}

export default function HealthOverviewPage() {
  const reducedMotion = useReducedMotion();

  const todayQuery = useQuery<TodayResponse>({
    queryKey: queryKeys.health.today,
    queryFn: () => fetch("/api/health-data/today").then((r) => r.json()),
  });

  const weeklyQuery = useQuery<WeeklyRow[]>({
    queryKey: queryKeys.health.weekly,
    queryFn: () => fetch("/api/health-data/weekly").then((r) => r.json()),
  });

  if (todayQuery.isLoading) return <HealthPageSkeleton variant="overview" />;
  if (todayQuery.isError)
    return (
      <ChartError
        message="Failed to load health data"
        onRetry={() => todayQuery.refetch()}
      />
    );

  const { today, yesterday, sparkline } = todayQuery.data ?? {
    today: null,
    yesterday: null,
    sparkline: [],
  };

  if (!today) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="No health data found"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  function delta(
    current: number | null | undefined,
    previous: number | null | undefined
  ): number | null {
    if (current == null || previous == null) return null;
    return current - previous;
  }

  function sparklineFor(key: keyof TodayData): number[] {
    return sparkline
      .map((d) => d[key] as number | null)
      .filter((v): v is number => v !== null);
  }

  // Weekly comparison
  const thisWeek = weeklyQuery.data?.[0] ?? null;
  const lastWeek = weeklyQuery.data?.[1] ?? null;

  const weeklyMetrics = [
    {
      label: "Weight",
      thisWeek: thisWeek?.avgWeightKg ? Number(thisWeek.avgWeightKg) : null,
      lastWeek: lastWeek?.avgWeightKg ? Number(lastWeek.avgWeightKg) : null,
      unit: "kg",
      isPositiveGood: false,
      decimals: 1,
    },
    {
      label: "Calories",
      thisWeek: thisWeek?.avgCaloriesKcal
        ? Number(thisWeek.avgCaloriesKcal)
        : null,
      lastWeek: lastWeek?.avgCaloriesKcal
        ? Number(lastWeek.avgCaloriesKcal)
        : null,
      unit: "kcal",
    },
    {
      label: "Protein",
      thisWeek: thisWeek?.avgProteinG ? Number(thisWeek.avgProteinG) : null,
      lastWeek: lastWeek?.avgProteinG ? Number(lastWeek.avgProteinG) : null,
      unit: "g",
    },
    {
      label: "Steps",
      thisWeek: thisWeek?.avgSteps ? Number(thisWeek.avgSteps) : null,
      lastWeek: lastWeek?.avgSteps ? Number(lastWeek.avgSteps) : null,
      unit: "",
    },
    {
      label: "Sleep",
      thisWeek: thisWeek?.avgSleepHours
        ? Number(thisWeek.avgSleepHours)
        : null,
      lastWeek: lastWeek?.avgSleepHours
        ? Number(lastWeek.avgSleepHours)
        : null,
      unit: "hrs",
      decimals: 1,
    },
    {
      label: "HRV",
      thisWeek: thisWeek?.avgHrv ? Number(thisWeek.avgHrv) : null,
      lastWeek: lastWeek?.avgHrv ? Number(lastWeek.avgHrv) : null,
      unit: "ms",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-heading-lg text-foreground">Health</h1>

      {/* KPI Grid */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={reducedMotion ? undefined : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Weight"
            value={today.weightKg?.toFixed(1) ?? null}
            unit="kg"
            delta={delta(today.weightKg, yesterday?.weightKg)}
            sparklineData={sparklineFor("weightKg")}
            isPositiveGood={false}
            icon={Scale}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Calories"
            value={today.caloriesKcal}
            unit="kcal"
            delta={delta(today.caloriesKcal, yesterday?.caloriesKcal)}
            sparklineData={sparklineFor("caloriesKcal")}
            icon={Flame}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Protein"
            value={today.proteinG?.toFixed(0) ?? null}
            unit="g"
            delta={delta(today.proteinG, yesterday?.proteinG)}
            sparklineData={sparklineFor("proteinG")}
            icon={Beef}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Steps"
            value={today.steps?.toLocaleString() ?? null}
            delta={delta(today.steps, yesterday?.steps)}
            sparklineData={sparklineFor("steps")}
            icon={Footprints}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Sleep"
            value={today.sleepHours?.toFixed(1) ?? null}
            unit="hrs"
            delta={delta(today.sleepHours, yesterday?.sleepHours)}
            sparklineData={sparklineFor("sleepHours")}
            icon={Moon}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="Resting HR"
            value={today.restingHr?.toFixed(0) ?? null}
            unit="bpm"
            delta={delta(today.restingHr, yesterday?.restingHr)}
            sparklineData={sparklineFor("restingHr")}
            isPositiveGood={false}
            icon={HeartPulse}
          />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : staggerItem}>
          <HealthKpiCard
            label="HRV"
            value={today.hrv?.toFixed(0) ?? null}
            unit="ms"
            delta={delta(today.hrv, yesterday?.hrv)}
            sparklineData={sparklineFor("hrv")}
            icon={Activity}
          />
        </motion.div>
      </motion.div>

      {/* Weekly Summary */}
      {weeklyQuery.data && weeklyQuery.data.length >= 2 && (
        <WeeklySummaryRow metrics={weeklyMetrics} />
      )}
    </div>
  );
}
