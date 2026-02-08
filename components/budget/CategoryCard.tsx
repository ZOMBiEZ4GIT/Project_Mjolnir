"use client";

import Link from "next/link";
import type { CategoryBreakdown } from "@/lib/budget/summary";

// ---------------------------------------------------------------------------
// Helpers
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
// CategoryCard
// ---------------------------------------------------------------------------

interface CategoryCardProps {
  category: CategoryBreakdown;
  periodStart: string;
  periodEnd: string;
}

export function CategoryCard({
  category,
  periodStart,
  periodEnd,
}: CategoryCardProps) {
  const { categoryId, categoryName, icon, budgetedCents, spentCents, remainingCents, percentUsed, status } = category;

  const barPercent = Math.min(percentUsed, 100);

  const barColour =
    status === "over"
      ? "bg-red-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const remainingText =
    remainingCents >= 0
      ? `${formatCents(remainingCents)} left`
      : `${formatCents(Math.abs(remainingCents))} over`;

  const remainingColour =
    status === "over"
      ? "text-red-400"
      : status === "warning"
        ? "text-amber-400"
        : "text-muted-foreground";

  return (
    <Link
      href={`/budget/transactions?category=${categoryId}&from=${periodStart}&to=${periodEnd}`}
      className="rounded-lg border border-border bg-card/50 p-4 hover:bg-card/80 active:bg-card/50 transition-colors"
    >
      {/* Header: icon + name + percentage */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 text-sm">{icon}</span>
          <span className="text-sm font-medium text-foreground truncate">
            {categoryName}
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {Math.round(percentUsed)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted mb-2">
        <div
          className={`h-1.5 rounded-full ${barColour} transition-all`}
          style={{ width: `${barPercent}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatCents(spentCents)} / {formatCents(budgetedCents)}
        </span>
        <span className={`${remainingColour} shrink-0 ml-1`}>
          {remainingText}
        </span>
      </div>
    </Link>
  );
}
