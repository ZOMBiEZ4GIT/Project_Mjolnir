"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { BudgetSummary } from "@/lib/budget/summary";

// ---------------------------------------------------------------------------
// Helpers
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

function StatusIcon({ status }: { status: "under" | "warning" | "over" }) {
  switch (status) {
    case "under":
      return <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
    case "over":
      return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MobileBudgetChartProps {
  summary: BudgetSummary;
}

export function MobileBudgetChart({ summary }: MobileBudgetChartProps) {
  const incomePercent =
    summary.income.expectedCents > 0
      ? Math.min(
          100,
          Math.round(
            (summary.income.actualCents / summary.income.expectedCents) * 100
          )
        )
      : 0;

  return (
    <div className="space-y-3 md:hidden">
      {/* Income bar */}
      <div className="rounded-lg border border-border bg-card/30 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">Income</span>
          <span className="text-xs text-muted-foreground">
            {formatCents(summary.income.actualCents)} of{" "}
            {formatCents(summary.income.expectedCents)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${incomePercent}%` }}
          />
        </div>
        <div className="text-right text-xs text-muted-foreground mt-1">
          {incomePercent}%
        </div>
      </div>

      {/* Category bars */}
      {summary.categories.map((cat) => {
        const barPercent = Math.min(cat.percentUsed, 100);
        const barColour =
          cat.status === "over"
            ? "bg-destructive"
            : cat.status === "warning"
              ? "bg-warning"
              : "bg-positive";

        return (
          <Link
            key={cat.categoryId}
            href={`/budget/transactions?category=${cat.categoryId}&from=${summary.startDate}&to=${summary.endDate}`}
            className="block rounded-lg border border-border bg-card/30 p-3 active:bg-card/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {cat.categoryName}
                </span>
              </div>
              <StatusIcon status={cat.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{formatCents(cat.spentCents)}</span>
              <span>of {formatCents(cat.budgetedCents)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${barColour} transition-all`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <div className="text-right text-xs text-muted-foreground mt-1">
              {Math.round(cat.percentUsed)}%
            </div>
          </Link>
        );
      })}

      {/* Summary row */}
      <div className="rounded-lg border border-border bg-card/30 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total spent</span>
          <span className="font-medium text-foreground">
            {formatCents(summary.totals.spentCents)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total budgeted</span>
          <span className="font-medium text-foreground">
            {formatCents(summary.totals.budgetedCents)}
          </span>
        </div>
        <div className="border-t border-border pt-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Savings</span>
          <span
            className={`font-medium ${summary.totals.savingsCents >= 0 ? "text-positive" : "text-destructive"}`}
          >
            {formatCents(summary.totals.savingsCents)} (
            {summary.totals.savingsRate}%)
          </span>
        </div>
      </div>
    </div>
  );
}
