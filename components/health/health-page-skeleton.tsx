"use client";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";

interface HealthPageSkeletonProps {
  variant?: "overview" | "chart" | "table";
}

/**
 * Loading skeleton for health dashboard pages.
 */
export function HealthPageSkeleton({ variant = "overview" }: HealthPageSkeletonProps) {
  if (variant === "overview") {
    return (
      <div className="space-y-6">
        {/* KPI grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-6"
            >
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Weekly summary skeleton */}
        <div className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="h-4 w-40 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted/50 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className="space-y-6">
        {/* Time range selector skeleton */}
        <div className="animate-pulse flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-12 bg-muted rounded-md" />
          ))}
        </div>
        {/* Chart skeleton */}
        <ChartSkeleton variant="line" height="h-80" withContainer />
      </div>
    );
  }

  // Table variant
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/50 rounded" />
        ))}
      </div>
    </div>
  );
}
