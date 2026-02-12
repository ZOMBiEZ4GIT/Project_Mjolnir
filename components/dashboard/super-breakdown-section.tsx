"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { SuperGrowthChart } from "./super-growth-chart";

interface SuperHolding {
  id: string;
  name: string;
  currency: string;
  isDormant: boolean;
}

interface SuperBreakdownResponse {
  holdings: SuperHolding[];
}

/**
 * Fetches super holdings to check if the user has any.
 * We use the breakdown API with months=1 to minimize data transfer.
 */
async function fetchSuperHoldings(): Promise<SuperBreakdownResponse> {
  const response = await fetch("/api/super/breakdown?months=1");
  if (!response.ok) {
    throw new Error("Failed to fetch super holdings");
  }
  return response.json();
}

/**
 * Loading skeleton for the super breakdown section.
 */
function SectionSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-5 w-64 bg-muted rounded mb-6" />
        <div className="h-64 bg-muted/50 rounded flex items-end justify-around px-4 pb-4">
          {[30, 45, 35, 55, 40, 60, 50, 70, 55, 75, 60, 80].map((h, i) => (
            <div
              key={i}
              className="w-4 bg-muted rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Super Breakdown Section
 *
 * This is a wrapper component that conditionally renders the SuperGrowthChart
 * only if the user has superannuation holdings.
 *
 * Features:
 * - Checks for super holdings before rendering
 * - Shows nothing if no super holdings exist (completely hidden from dashboard)
 * - Shows skeleton while loading
 * - Delegates to SuperGrowthChart for actual chart rendering and empty data states
 */
export function SuperBreakdownSection() {
  const {
    data: holdingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.super.holdingsCheck,
    queryFn: fetchSuperHoldings,
    staleTime: 5 * 60 * 1000, // 5 minutes - holdings don't change often
  });

  // Loading state
  if (isLoading) {
    return <SectionSkeleton />;
  }

  // Error state - silently hide section on error to not disrupt dashboard
  if (error) {
    return null;
  }

  // No super holdings - don't render the section at all
  if (!holdingsData?.holdings || holdingsData.holdings.length === 0) {
    return null;
  }

  // User has super holdings - render the chart
  // The SuperGrowthChart handles its own empty state for no breakdown data
  return <SuperGrowthChart />;
}
