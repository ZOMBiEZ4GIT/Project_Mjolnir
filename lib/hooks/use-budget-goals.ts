"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Goal {
  id: string;
  name: string;
  saverId: string | null;
  saverKey: string | null;
  saverDisplayName: string | null;
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents: number;
  targetDate: string | null;
  status: "active" | "completed" | "paused";
  priority: number;
  colour: string | null;
  icon: string | null;
  notes: string | null;
  completedAt: string | null;
  percentComplete: number;
}

interface GoalsResponse {
  goals: Goal[];
}

interface UpdateGoalInput {
  name?: string;
  targetAmountCents?: number;
  currentAmountCents?: number;
  monthlyContributionCents?: number;
  saverId?: string | null;
  targetDate?: string | null;
  status?: "active" | "completed" | "paused";
  priority?: number;
  colour?: string | null;
  icon?: string | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchGoals(): Promise<Goal[]> {
  const response = await fetch("/api/budget/goals");
  if (!response.ok) {
    throw new Error("Failed to fetch budget goals");
  }
  const data: GoalsResponse = await response.json();
  return data.goals;
}

async function updateGoal(
  id: string,
  input: UpdateGoalInput
): Promise<unknown> {
  const response = await fetch(`/api/budget/goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to update goal");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useBudgetGoals() {
  return useQuery<Goal[], Error>({
    queryKey: queryKeys.budget.goals,
    queryFn: fetchGoals,
    staleTime: 30_000,
  });
}

export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGoalInput) => updateGoal(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.goals });
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.summary(),
      });
    },
  });
}
