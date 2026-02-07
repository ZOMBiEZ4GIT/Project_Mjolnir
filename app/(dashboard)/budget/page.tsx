"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  AlertCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  Wallet,
} from "lucide-react";
import { SankeyChartContainer } from "@/components/budget/SankeyChartContainer";
import { MobileBudgetChart } from "@/components/budget/MobileBudgetChart";
import { CategoryCard } from "@/components/budget/CategoryCard";
import { PaydayCountdown } from "@/components/budget/PaydayCountdown";
import { SavingsIndicator } from "@/components/budget/SavingsIndicator";
import Link from "next/link";
import type { BudgetSummary } from "@/lib/budget/summary";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchBudgetSummary(
  periodId?: string
): Promise<BudgetSummary> {
  const url = periodId
    ? `/api/budget/summary?period_id=${periodId}`
    : "/api/budget/summary";

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    if (response.status === 404) {
      const data = await response.json();
      throw new Error(data.error || "No budget period found");
    }
    throw new Error("Failed to fetch budget summary");
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function BudgetDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Period selector skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-9 w-24 rounded bg-muted" />
      </div>

      {/* Hero chart placeholder */}
      <div className="rounded-lg border border-border bg-card/50 p-6">
        <div className="h-5 w-32 rounded bg-muted mb-4" />
        <div className="h-64 rounded bg-muted" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="h-4 w-20 rounded bg-muted mb-2" />
            <div className="h-6 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="h-4 w-24 rounded bg-muted mb-3" />
            <div className="h-2 w-full rounded-full bg-muted mb-2" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BudgetDashboardPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();

  // periodId will be controlled by PeriodSelector in B4-010
  const periodId: string | undefined = undefined;

  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<BudgetSummary, Error>({
    queryKey: queryKeys.budget.summary(periodId),
    queryFn: () => fetchBudgetSummary(periodId),
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
  });

  // Auth loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BudgetDashboardSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={PieChart}
          title="Sign in required"
          description="Please sign in to view your budget dashboard."
        />
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget</h1>
        <BudgetDashboardSkeleton />
      </div>
    );
  }

  // Error — special case for "no period"
  if (error) {
    const isNoPeriod = error.message.includes("No budget period");
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget</h1>
        <EmptyState
          icon={isNoPeriod ? PieChart : AlertCircle}
          title={isNoPeriod ? "No budget period found" : "Something went wrong"}
          description={
            isNoPeriod
              ? "Set up a budget period to start tracking your spending."
              : error.message
          }
          action={
            isNoPeriod ? (
              <Button asChild>
                <Link href="/budget/setup">Set up budget</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!summary) return null;

  // Derived values
  const incomePercent =
    summary.income.expectedCents > 0
      ? Math.round(
          (summary.income.actualCents / summary.income.expectedCents) * 100
        )
      : 0;
  const spentPercent =
    summary.totals.budgetedCents > 0
      ? Math.round(
          (summary.totals.spentCents / summary.totals.budgetedCents) * 100
        )
      : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(summary.startDate, summary.endDate)}
          </p>
        </div>
        {/* Period selector placeholder — B4-010 will replace this */}
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Day {summary.daysElapsed} of {summary.totalDays}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Income"
          value={formatCents(summary.income.actualCents)}
          subtext={`${incomePercent}% of ${formatCents(summary.income.expectedCents)} expected`}
          icon={DollarSign}
        />
        <StatCard
          label="Spent"
          value={formatCents(summary.totals.spentCents)}
          subtext={`${spentPercent}% of ${formatCents(summary.totals.budgetedCents)} budgeted`}
          icon={Wallet}
        />
        <StatCard
          label="Savings"
          value={formatCents(summary.totals.savingsCents)}
          subtext={`${summary.totals.savingsRate}% savings rate`}
          icon={TrendingUp}
          accent={
            summary.totals.savingsCents >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }
        />
        <StatCard
          label="Days left"
          value={String(summary.daysRemaining)}
          subtext={`${summary.daysElapsed} days elapsed`}
          icon={Calendar}
        />
      </div>

      {/* Hero chart area — Sankey (desktop) / mobile chart placeholder (B4-006) */}
      <div className="rounded-lg border border-border bg-card/50 p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Budget Breakdown
        </h2>
        <SankeyChartContainer summary={summary} />
        <MobileBudgetChart summary={summary} />
      </div>

      {/* Category cards grid — B4-007 */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {summary.categories.map((cat) => (
            <CategoryCard
              key={cat.categoryId}
              category={cat}
              periodStart={summary.startDate}
              periodEnd={summary.endDate}
            />
          ))}
        </div>
      </div>

      {/* Payday countdown & Savings indicator — B4-008 / B4-009 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaydayCountdown
          daysElapsed={summary.daysElapsed}
          totalDays={summary.totalDays}
        />
        <SavingsIndicator
          savingsCents={summary.totals.savingsCents}
          savingsRate={summary.totals.savingsRate}
          spentCents={summary.totals.spentCents}
          incomeCents={summary.income.actualCents}
          daysElapsed={summary.daysElapsed}
          totalDays={summary.totalDays}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${accent ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
    </div>
  );
}
