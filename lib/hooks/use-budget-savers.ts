"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetCategory {
  id: string;
  categoryKey: string | null;
  displayName: string;
  monthlyBudgetCents: number | null;
}

export interface BudgetSaver {
  id: string;
  saverKey: string;
  displayName: string;
  emoji: string;
  monthlyBudgetCents: number;
  saverType: "spending" | "savings_goal" | "investment";
  sortOrder: number;
  colour: string;
  notes: string | null;
  categories: BudgetCategory[];
}

interface SaversResponse {
  savers: BudgetSaver[];
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchSavers(): Promise<BudgetSaver[]> {
  const response = await fetch("/api/budget/savers");
  if (!response.ok) {
    throw new Error("Failed to fetch budget savers");
  }
  const data: SaversResponse = await response.json();
  return data.savers;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useBudgetSavers() {
  return useQuery<BudgetSaver[], Error>({
    queryKey: queryKeys.budget.savers,
    queryFn: fetchSavers,
    staleTime: 30_000,
  });
}
