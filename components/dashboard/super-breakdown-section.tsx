"use client";

import { useDashboardNetWorth } from "@/lib/hooks/use-dashboard-data";
import { SuperGrowthChart } from "./super-growth-chart";

/**
 * Loading skeleton for the super breakdown section.
 */
function SectionSkeleton() {
  return (
    <div className="rounded-2xl glass-card p-4 sm:p-6">
      <div>
        <div className="h-5 w-64 skeleton-shimmer mb-6" />
        <div className="h-64 bg-muted/50 rounded flex items-end justify-around px-4 pb-4">
          {[30, 45, 35, 55, 40, 60, 50, 70, 55, 75, 60, 80].map((h, i) => (
            <div
              key={i}
              className="w-4 skeleton-shimmer rounded-t"
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
 * Conditionally renders SuperGrowthChart only if the user has super holdings.
 * Derives super existence from the shared net-worth breakdown instead of a
 * separate /api/super/breakdown request.
 */
export function SuperBreakdownSection() {
  const { data, isLoading, error } = useDashboardNetWorth();

  // Loading state
  if (isLoading) {
    return <SectionSkeleton />;
  }

  // Error or no data — hide section silently
  if (error || !data) {
    return null;
  }

  // Check if there are any super holdings via the net-worth breakdown
  const hasSuperHoldings = data.breakdown.some(
    (b) => b.type === "super" && b.count > 0
  );

  if (!hasSuperHoldings) {
    return null;
  }

  return <SuperGrowthChart />;
}
