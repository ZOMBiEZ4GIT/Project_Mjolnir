"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  Wallet,
  Download,
  Loader2,
  CheckCircle2,
  Tag,
  ChevronDown,
} from "lucide-react";
import { PeriodSelector } from "@/components/budget/PeriodSelector";
import { AIRecommendationButton } from "@/components/budget/AIRecommendationButton";
import {
  RecommendationModal,
  type AiRecommendation,
} from "@/components/budget/RecommendationModal";
import { toast } from "sonner";
import {
  useBudgetSummary,
  type SaverSummary,
} from "@/lib/hooks/use-budget-summary";
import Link from "next/link";
import { GoalTracker } from "@/components/budget/goal-tracker";
import { BudgetVsActualChart } from "@/components/budget/charts/budget-vs-actual-chart";
import { SpendingPaceChart } from "@/components/budget/charts/spending-pace-chart";
import { AiCheckinCard } from "@/components/budget/ai-checkin-card";
import { SavingsWaterfall } from "@/components/budget/charts/savings-waterfall";
import { SpendingTrendsChart } from "@/components/budget/charts/spending-trends";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return cents < 0 ? `-${formatted}` : formatted;
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

      {/* Summary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Overall progress bar skeleton */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="h-4 w-40 rounded bg-muted mb-3" />
        <div className="h-3 w-full rounded-full bg-muted" />
      </div>

      {/* Saver cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded bg-muted" />
              <div className="h-5 w-32 rounded bg-muted" />
            </div>
            <div className="h-2 w-full rounded-full bg-muted mb-2" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Traffic light status dot
// ---------------------------------------------------------------------------

function TrafficLight({
  saver,
  progressPercent,
}: {
  saver: SaverSummary;
  progressPercent: number;
}) {
  // Fixed amount exactly at 100% gets a checkmark (e.g. rent already paid)
  if (saver.percentUsed === 100 && saver.budgetCents > 0) {
    return <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />;
  }

  // Pace-based traffic light
  const pacePercent =
    saver.budgetCents > 0
      ? (saver.actualCents / saver.budgetCents) * 100
      : 0;

  let dotColour: string;
  if (pacePercent > progressPercent) {
    dotColour = "bg-destructive"; // red — over pace
  } else if (pacePercent >= progressPercent * 0.85) {
    dotColour = "bg-warning"; // amber — near pace
  } else {
    dotColour = "bg-positive"; // green — under pace
  }

  return (
    <span
      className={`inline-block h-3 w-3 rounded-full shrink-0 ${dotColour}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Saver card
// ---------------------------------------------------------------------------

function SaverCard({
  saver,
  progressPercent,
}: {
  saver: SaverSummary;
  progressPercent: number;
}) {
  const barPercent = Math.min(saver.percentUsed, 100);
  const overBudget = saver.percentUsed > 100;

  // Top 3-4 categories by actual spend
  const topCategories = [...saver.categories]
    .sort((a, b) => b.actualCents - a.actualCents)
    .slice(0, 4)
    .filter((c) => c.actualCents > 0);

  return (
    <Link
      href={`/budget/saver/${saver.saverKey}`}
      className="block rounded-lg border border-border bg-card/50 p-4 hover:bg-card/80 active:bg-card/50 transition-colors"
    >
      {/* Header: emoji + name + traffic light */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{saver.emoji}</span>
          <span className="text-sm font-medium text-foreground truncate">
            {saver.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {Math.round(saver.percentUsed)}%
          </span>
          <TrafficLight saver={saver} progressPercent={progressPercent} />
        </div>
      </div>

      {/* Progress bar — use saver's colour */}
      <div className="h-2 w-full rounded-full bg-muted mb-2">
        <div
          className={`h-2 rounded-full transition-all ${
            overBudget ? "bg-destructive" : ""
          }`}
          style={{
            width: `${barPercent}%`,
            backgroundColor: overBudget ? undefined : saver.colour,
          }}
        />
      </div>

      {/* Amounts */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-muted-foreground">
          {formatCents(saver.actualCents)} / {formatCents(saver.budgetCents)}
        </span>
        <span
          className={
            overBudget
              ? "text-destructive"
              : saver.paceStatus === "on"
                ? "text-warning"
                : "text-muted-foreground"
          }
        >
          {overBudget
            ? `${formatCents(saver.actualCents - saver.budgetCents)} over`
            : `${formatCents(saver.budgetCents - saver.actualCents)} left`}
        </span>
      </div>

      {/* Top categories preview */}
      {topCategories.length > 0 && (
        <div className="border-t border-border pt-2 space-y-1">
          {topCategories.map((cat) => (
            <div
              key={cat.categoryKey ?? "uncategorised"}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span className="truncate">{cat.displayName}</span>
              <span className="shrink-0 ml-2">
                {formatCents(cat.actualCents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BudgetDashboardPage() {
  const queryClient = useQueryClient();

  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [activeRecommendation, setActiveRecommendation] =
    useState<AiRecommendation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [chartView, setChartView] = useState<"budget" | "waterfall">("budget");
  const [showTrends, setShowTrends] = useState(false);

  const handleRecommendation = useCallback((rec: unknown) => {
    setActiveRecommendation(rec as AiRecommendation);
    setModalOpen(true);
  }, []);

  const handleAccept = useCallback(
    async (rec: AiRecommendation) => {
      const allocations = rec.recommendationData.suggestedBudget.map(
        (item) => ({
          categoryId: item.categoryId,
          allocatedCents: item.suggestedCents,
        })
      );

      const [allocRes, statusRes] = await Promise.all([
        fetch(`/api/budget/periods/${rec.budgetPeriodId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocations }),
        }),
        fetch(`/api/budget/recommendations/${rec.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        }),
      ]);

      if (!allocRes.ok || !statusRes.ok) {
        toast.error("Failed to apply recommendations");
        return;
      }

      setModalOpen(false);
      toast.success("Budget updated with AI recommendations");

      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.summary(rec.budgetPeriodId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.recommendations.latest(rec.budgetPeriodId),
      });
    },
    [queryClient]
  );

  const handleDismiss = useCallback(
    async (rec: AiRecommendation) => {
      await fetch(`/api/budget/recommendations/${rec.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setModalOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.recommendations.latest(rec.budgetPeriodId),
      });
    },
    [queryClient]
  );

  const { data: summary, isLoading, error } = useBudgetSummary(periodId);

  const handleExportSummary = useCallback(async () => {
    if (!summary) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "summary");
      params.set("from", summary.period.startDate);
      params.set("to", summary.period.endDate);
      const url = `/api/budget/export?${params.toString()}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }, [summary]);

  // Loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget</h1>
        <BudgetDashboardSkeleton />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget</h1>
        <EmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description={error.message}
        />
      </div>
    );
  }

  if (!summary) return null;

  // Derived values
  const { period } = summary;
  const incomePercent =
    summary.income.expectedCents > 0
      ? Math.round(
          (summary.income.actualCents / summary.income.expectedCents) * 100
        )
      : 0;
  const spentPercent =
    summary.totalBudgetedCents > 0
      ? Math.round(
          (summary.totalSpentCents / summary.totalBudgetedCents) * 100
        )
      : 0;
  const savingsCents = summary.income.actualCents - summary.totalSpentCents;
  const savingsRate =
    summary.income.actualCents > 0
      ? Math.round((savingsCents / summary.income.actualCents) * 1000) / 10
      : 0;

  // Category map for recommendation modal (flatten from savers)
  const categoryMap: Record<string, string> = {};
  for (const saver of summary.spendingSavers) {
    for (const cat of saver.categories) {
      if (cat.categoryKey) {
        categoryMap[cat.categoryKey] = cat.displayName;
      }
    }
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header with period navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Budget</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/budget/tags">
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tags</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            disabled={isExporting}
            className="gap-1.5 h-9"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <AIRecommendationButton
            periodId={summary.periodId}
            onRecommendation={handleRecommendation}
          />
          <PeriodSelector
            currentPeriodId={summary.periodId}
            onPeriodChange={setPeriodId}
          />
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Income"
          value={formatCents(summary.income.actualCents)}
          subtext={`${incomePercent}% of ${formatCents(summary.income.expectedCents)} expected`}
          icon={DollarSign}
        />
        <StatCard
          label="Total Spent"
          value={formatCents(summary.totalSpentCents)}
          subtext={`${spentPercent}% of ${formatCents(summary.totalBudgetedCents)} budgeted`}
          icon={Wallet}
        />
        <StatCard
          label="Total Saved"
          value={formatCents(savingsCents)}
          subtext={`${savingsRate}% savings rate`}
          icon={TrendingUp}
          accent={savingsCents >= 0 ? "text-positive" : "text-destructive"}
        />
        <StatCard
          label="Days left"
          value={String(period.daysRemaining)}
          subtext={`${period.daysElapsed} days elapsed`}
          icon={Calendar}
        />
      </div>

      {/* Overall progress bar with period info */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Day {period.daysElapsed} of {period.totalDays}{" "}
            <span className="hidden sm:inline">
              ({period.progressPercent}% through period)
            </span>
            <span className="sm:hidden">
              · {period.progressPercent}%
            </span>
          </span>
          <span className="text-xs sm:text-sm font-medium text-foreground shrink-0">
            {spentPercent}% spent
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted">
          <div
            className={`h-3 rounded-full transition-all ${
              spentPercent > 100 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Chart toggle tabs */}
      {summary.spendingSavers.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-full sm:w-fit">
            <button
              onClick={() => setChartView("budget")}
              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartView === "budget"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Budget vs Actual
            </button>
            <button
              onClick={() => setChartView("waterfall")}
              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartView === "waterfall"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income Allocation
            </button>
          </div>

          {chartView === "budget" ? (
            <BudgetVsActualChart
              savers={summary.spendingSavers}
              progressPercent={period.progressPercent}
            />
          ) : (
            <SavingsWaterfall
              incomeCents={summary.income.expectedCents}
              spendingSavers={summary.spendingSavers}
            />
          )}
        </div>
      )}

      {/* Spending Pace chart */}
      {summary.totalBudgetedCents > 0 && (
        <SpendingPaceChart
          periodStartDate={period.startDate}
          periodEndDate={period.endDate}
          totalBudgetCents={summary.totalBudgetedCents}
          totalDays={period.totalDays}
          daysElapsed={period.daysElapsed}
        />
      )}

      {/* Spending Trends — collapsible */}
      <div>
        <button
          onClick={() => setShowTrends((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showTrends ? "rotate-0" : "-rotate-90"}`}
          />
          Trends
        </button>
        {showTrends && <SpendingTrendsChart />}
      </div>

      {/* Spending Savers section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Spending Savers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {summary.spendingSavers.map((saver) => (
            <SaverCard
              key={saver.saverKey}
              saver={saver}
              progressPercent={period.progressPercent}
            />
          ))}
        </div>
      </div>

      {/* Goal tracker section */}
      <GoalTracker />

      {/* AI Check-in card */}
      <AiCheckinCard periodId={summary.periodId} />

      {/* AI Recommendation Modal */}
      {activeRecommendation && (
        <RecommendationModal
          recommendation={activeRecommendation}
          categoryMap={categoryMap}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
