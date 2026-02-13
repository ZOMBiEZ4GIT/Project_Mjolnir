"use client";

import { useQuery } from "@tanstack/react-query";
import { Timer, TrendingDown, ArrowRight } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorySpend {
  categoryKey: string;
  totalCents: number;
  txnCount: number;
}

interface PeriodData {
  totalCents: number;
  months: number;
  avgMonthlyCents: number;
  categories: CategorySpend[];
}

interface ChallengeComparisonResponse {
  during: PeriodData;
  after: PeriodData;
  hasDuringData: boolean;
  hasAfterData: boolean;
  challengeEndDate: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCategoryKey(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function daysUntil(dateString: string): number {
  const target = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PeriodColumn({
  title,
  label,
  data,
}: {
  title: string;
  label: string;
  data: PeriodData;
}) {
  const sortedCategories = [...data.categories].sort(
    (a, b) => b.totalCents - a.totalCents
  );

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-3">{label}</p>

      {/* Total */}
      <div className="mb-3">
        <p className="text-xl font-semibold text-foreground tabular-nums">
          {formatCents(data.totalCents)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatCents(data.avgMonthlyCents)}/mo avg
          <span className="ml-1">
            ({data.months} {data.months === 1 ? "month" : "months"})
          </span>
        </p>
      </div>

      {/* Category breakdown */}
      {sortedCategories.length > 0 && (
        <div className="space-y-1.5">
          {sortedCategories.map((cat) => (
            <div
              key={cat.categoryKey}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground truncate mr-2">
                {formatCategoryKey(cat.categoryKey)}
              </span>
              <span className="text-foreground tabular-nums whitespace-nowrap">
                {formatCents(cat.totalCents)}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.categories.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No data yet</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChallengeComparison() {
  const { data, isLoading, error } = useQuery<ChallengeComparisonResponse>({
    queryKey: queryKeys.budget.challengeComparison,
    queryFn: async () => {
      const res = await fetch("/api/budget/challenge-comparison");
      if (!res.ok) throw new Error("Failed to fetch challenge comparison");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3 animate-pulse">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-20 w-full rounded bg-muted" />
      </div>
    );
  }

  if (error || !data) return null;

  // Before April 2026: show countdown
  const today = new Date().toISOString().split("T")[0];
  const challengeEnded = today > data.challengeEndDate;

  if (!challengeEnded) {
    const daysLeft = daysUntil(data.challengeEndDate);

    return (
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Timer className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-medium text-foreground">
            BFT Supplement Challenge
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Challenge ends in{" "}
          <span className="text-foreground font-medium">{daysLeft} days</span>
          <span className="text-xs ml-1">
            (April 30, 2026)
          </span>
        </p>
        {data.hasDuringData && (
          <p className="text-xs text-muted-foreground mt-2">
            Spent so far: {formatCents(data.during.totalCents)} across{" "}
            {data.during.months} {data.during.months === 1 ? "month" : "months"}
          </p>
        )}
      </div>
    );
  }

  // After April 2026: show comparison (only if we have during data)
  if (!data.hasDuringData) return null;

  // Calculate savings
  const monthlySavings =
    data.during.avgMonthlyCents - (data.hasAfterData ? data.after.avgMonthlyCents : 0);

  // Find which categories were dropped or reduced
  const afterCategoryMap = new Map(
    data.after.categories.map((c) => [c.categoryKey, c])
  );

  const droppedCategories = data.during.categories
    .filter((c) => !afterCategoryMap.has(c.categoryKey))
    .map((c) => formatCategoryKey(c.categoryKey));

  const reducedCategories = data.during.categories
    .filter((c) => {
      const afterCat = afterCategoryMap.get(c.categoryKey);
      if (!afterCat) return false;
      // Compare monthly averages
      const duringAvg = c.totalCents / (data.during.months || 1);
      const afterAvg = afterCat.totalCents / (data.after.months || 1);
      return afterAvg < duringAvg * 0.7; // 30%+ reduction
    })
    .map((c) => formatCategoryKey(c.categoryKey));

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-positive" />
        <h3 className="text-sm font-medium text-foreground">
          Post-Challenge Comparison
        </h3>
      </div>

      {/* Savings highlight */}
      {monthlySavings > 0 && (
        <div className="rounded-md bg-positive/10 border border-positive/20 px-3 py-2">
          <p className="text-sm text-positive font-medium">
            You saved {formatCents(monthlySavings)}/month by ending the challenge
          </p>
        </div>
      )}

      {/* Side-by-side periods */}
      <div className="flex gap-4">
        <PeriodColumn
          title="During Challenge"
          label="Feb – Apr 2026"
          data={data.during}
        />
        <div className="flex items-center shrink-0 pt-8">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <PeriodColumn
          title="After Challenge"
          label="May 2026+"
          data={data.after}
        />
      </div>

      {/* Dropped / reduced categories */}
      {(droppedCategories.length > 0 || reducedCategories.length > 0) && (
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          {droppedCategories.length > 0 && (
            <p>
              <span className="text-foreground font-medium">Dropped:</span>{" "}
              {droppedCategories.join(", ")}
            </p>
          )}
          {reducedCategories.length > 0 && (
            <p>
              <span className="text-foreground font-medium">Reduced:</span>{" "}
              {reducedCategories.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
