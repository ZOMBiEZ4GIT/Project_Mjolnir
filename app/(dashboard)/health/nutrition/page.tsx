"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Utensils } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { ChartCard } from "@/components/charts/chart-card";
import { HealthTimeRangeSelector } from "@/components/health/health-time-range-selector";
import { CalorieChart } from "@/components/health/calorie-chart";
import { MacroPie } from "@/components/health/macro-pie";
import { ProteinTracker } from "@/components/health/protein-tracker";
import { WeeklyAveragesTable } from "@/components/health/weekly-averages-table";
import { HealthPageSkeleton } from "@/components/health/health-page-skeleton";
import { ChartError } from "@/components/charts/chart-error";
import { EmptyState } from "@/components/ui/empty-state";

interface DailyRow {
  logDate: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

interface WeeklyRow {
  weekStart: string;
  avgCaloriesKcal: number | null;
  avgProteinG: number | null;
  avgWeightKg: number | null;
  daysWithData: number;
}

export default function NutritionPage() {
  const [range, setRange] = useState("90d");

  const dailyQuery = useQuery<DailyRow[]>({
    queryKey: queryKeys.health.daily(range),
    queryFn: () =>
      fetch(`/api/health-data/daily?range=${range}`).then((r) => r.json()),
  });

  const weeklyQuery = useQuery<WeeklyRow[]>({
    queryKey: queryKeys.health.weekly,
    queryFn: () => fetch("/api/health-data/weekly").then((r) => r.json()),
  });

  const avgMacros = useMemo(() => {
    if (!dailyQuery.data) return null;
    const withData = dailyQuery.data.filter(
      (d) => d.proteinG !== null || d.carbsG !== null || d.fatG !== null
    );
    if (withData.length === 0) return null;

    const avg = (vals: (number | null)[]) => {
      const nums = vals.filter((v): v is number => v !== null);
      return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    };

    return {
      protein: avg(withData.map((d) => d.proteinG)),
      carbs: avg(withData.map((d) => d.carbsG)),
      fat: avg(withData.map((d) => d.fatG)),
    };
  }, [dailyQuery.data]);

  if (dailyQuery.isLoading) return <HealthPageSkeleton variant="chart" />;
  if (dailyQuery.isError)
    return (
      <ChartError
        message="Failed to load nutrition data"
        onRetry={() => dailyQuery.refetch()}
      />
    );

  if (!dailyQuery.data || dailyQuery.data.length === 0) {
    return (
      <EmptyState
        icon={Utensils}
        title="No nutrition data"
        description="Data syncs automatically from Apple Health via the n8n pipeline."
      />
    );
  }

  const calorieData = dailyQuery.data.filter((d) => d.caloriesKcal !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-heading-lg text-foreground">Nutrition</h1>
        <HealthTimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Calorie chart */}
      <ChartCard title="Daily Calories">
        <CalorieChart data={calorieData} />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Macro breakdown donut */}
        {avgMacros && (
          <ChartCard title="Average Macros">
            <MacroPie
              protein={avgMacros.protein}
              carbs={avgMacros.carbs}
              fat={avgMacros.fat}
            />
          </ChartCard>
        )}

        {/* Protein tracker */}
        <ChartCard title="Protein Target (30 Days)">
          <ProteinTracker data={dailyQuery.data} />
        </ChartCard>
      </div>

      {/* Weekly averages table */}
      {weeklyQuery.data && weeklyQuery.data.length > 0 && (
        <ChartCard title="Weekly Averages">
          <WeeklyAveragesTable data={weeklyQuery.data} />
        </ChartCard>
      )}
    </div>
  );
}
