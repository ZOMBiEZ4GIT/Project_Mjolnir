"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaceStatus = "under" | "on" | "over";

interface CategorySummary {
  categoryKey: string | null;
  displayName: string;
  budgetCents: number;
  actualCents: number;
}

interface SaverSummary {
  saverKey: string;
  displayName: string;
  emoji: string;
  colour: string;
  budgetCents: number;
  actualCents: number;
  percentUsed: number;
  paceStatus: PaceStatus;
  projectedEndCents: number;
  categories: CategorySummary[];
}

interface GoalSummary {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents: number;
  targetDate: string | null;
  status: string;
  percentComplete: number;
  colour: string | null;
  icon: string | null;
}

export interface BudgetSummary {
  periodId: string;
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    progressPercent: number;
  };
  income: {
    expectedCents: number;
    actualCents: number;
  };
  spendingSavers: SaverSummary[];
  totalSpentCents: number;
  totalBudgetedCents: number;
  savingsGoals: GoalSummary[];
}

export type { SaverSummary, CategorySummary, GoalSummary, PaceStatus };

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchSummary(periodId?: string): Promise<BudgetSummary> {
  const params = new URLSearchParams();
  if (periodId) params.set("period_id", periodId);

  const url = `/api/budget/summary${params.size ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch budget summary");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useBudgetSummary(periodId?: string) {
  return useQuery<BudgetSummary, Error>({
    queryKey: queryKeys.budget.summary(periodId),
    queryFn: () => fetchSummary(periodId),
    staleTime: 30_000,
  });
}
