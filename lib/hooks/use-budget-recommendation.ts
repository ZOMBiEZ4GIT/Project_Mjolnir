"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaverStatus {
  saverKey: string;
  status: "green" | "amber" | "red";
  message?: string;
}

interface GoalProgress {
  goalName: string;
  percentComplete: number;
  onTrack: boolean;
  message?: string;
}

interface BudgetAdjustment {
  saverKey: string;
  currentCents: number;
  suggestedCents: number;
  reason: string;
}

interface SavingsProjection {
  currentRate: number;
  projectedRate: number;
  monthlyIncreaseCents: number;
}

export interface Recommendation {
  id: string;
  budgetPeriodId: string;
  overallStatus: "green" | "amber" | "red" | null;
  saverStatuses: SaverStatus[] | null;
  goalProgress: GoalProgress[] | null;
  budgetAdjustments: BudgetAdjustment[] | null;
  insights: string[] | null;
  actionableTip: string | null;
  savingsProjection: SavingsProjection | null;
  generatedAt: string | null;
  createdAt: string;
  status: string;
  recommendationData: unknown;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchLatestRecommendation(
  periodId?: string
): Promise<Recommendation> {
  const params = new URLSearchParams();
  if (periodId) params.set("period_id", periodId);

  const url = `/api/budget/recommendations${params.size ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch recommendation");
  }
  return response.json();
}

async function requestRecommendation(): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch("/api/budget/recommendations/request", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to request recommendation");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useLatestRecommendation(periodId?: string) {
  return useQuery<Recommendation, Error>({
    queryKey: queryKeys.budget.recommendations.latest(periodId),
    queryFn: () => fetchLatestRecommendation(periodId),
    staleTime: 60_000,
  });
}

export function useRequestRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.recommendations.latest(),
      });
    },
  });
}
