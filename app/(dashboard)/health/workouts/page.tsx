"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { ChartCard } from "@/components/charts/chart-card";
import { HealthTimeRangeSelector } from "@/components/health/health-time-range-selector";
import { WorkoutFrequencyChart } from "@/components/health/workout-frequency-chart";
import { WorkoutTypePie } from "@/components/health/workout-type-pie";
import { WorkoutVolumeChart } from "@/components/health/workout-volume-chart";
import { RecentWorkoutsTable } from "@/components/health/recent-workouts-table";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface WeeklyWorkout {
  weekStart: string;
  sessionCount: number;
  totalMinutes: number | null;
  totalKcal: number | null;
}

interface TypeDistribution {
  workoutType: string;
  count: number;
  totalMinutes: number | null;
}

interface SummaryResponse {
  weekly: WeeklyWorkout[];
  typeDistribution: TypeDistribution[];
}

interface Workout {
  id: string;
  workoutDate: string;
  startTime: string;
  workoutType: string;
  durationMinutes: number | null;
  caloriesKcal: number | null;
  avgHr: number | null;
  maxHr: number | null;
  distanceKm: number | null;
  isIndoor: boolean | null;
}

export default function WorkoutsPage() {
  const [range, setRange] = useState("90d");

  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: queryKeys.health.workoutsSummary(range),
    queryFn: () =>
      fetch(`/api/health-data/workouts/summary?range=${range}`).then((r) =>
        r.json()
      ),
  });

  const workoutsQuery = useQuery<Workout[]>({
    queryKey: queryKeys.health.workouts({ limit: 20 }),
    queryFn: () =>
      fetch("/api/health-data/workouts?limit=20").then((r) => r.json()),
  });

  if (summaryQuery.isLoading) return <HealthPageSkeleton variant="chart" />;
  if (summaryQuery.isError)
    return (
      <ChartError
        message="Failed to load workout data"
        onRetry={() => summaryQuery.refetch()}
      />
    );

  const summary = summaryQuery.data;
  if (
    !summary ||
    (summary.weekly.length === 0 && summary.typeDistribution.length === 0)
  ) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No workout data"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-heading-lg text-foreground">Workouts</h1>
        <HealthTimeRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly frequency */}
        <ChartCard title="Weekly Frequency">
          <WorkoutFrequencyChart data={summary.weekly} />
        </ChartCard>

        {/* Type distribution */}
        <ChartCard title="Workout Types">
          <WorkoutTypePie data={summary.typeDistribution} />
        </ChartCard>

        {/* Volume chart */}
        <ChartCard title="Weekly Volume (Minutes)">
          <WorkoutVolumeChart data={summary.weekly} />
        </ChartCard>
      </div>

      {/* Recent workouts table */}
      {workoutsQuery.data && workoutsQuery.data.length > 0 && (
        <ChartCard title="Recent Workouts">
          <RecentWorkoutsTable data={workoutsQuery.data} />
        </ChartCard>
      )}
    </div>
  );
}
