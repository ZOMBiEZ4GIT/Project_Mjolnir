"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  useBudgetSummary,
  type SaverSummary,
  type CategorySummary,
} from "@/lib/hooks/use-budget-summary";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  description: string;
  rawText: string | null;
  amountCents: number;
  status: "HELD" | "SETTLED";
  saverKey: string | null;
  categoryKey: string | null;
  tags: string[] | null;
  transactionDate: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

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

function formatAmount(amountCents: number): string {
  const abs = Math.abs(amountCents) / 100;
  return abs.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchSaverTransactions(
  saverKey: string,
  from: string,
  to: string
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    saver: saverKey,
    from,
    to,
    limit: "20",
  });
  const response = await fetch(`/api/budget/transactions?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch transactions");
  return response.json();
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SaverDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-muted" />
          <div className="h-6 w-40 rounded bg-muted" />
        </div>
        <div className="h-3 w-full rounded-full bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>

      {/* Categories skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-24 rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/50 p-3 space-y-2"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Transactions skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 border-b border-border"
          >
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Traffic light dot
// ---------------------------------------------------------------------------

function TrafficLight({
  saver,
  progressPercent,
}: {
  saver: SaverSummary;
  progressPercent: number;
}) {
  if (saver.percentUsed === 100 && saver.budgetCents > 0) {
    return <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />;
  }

  const pacePercent =
    saver.budgetCents > 0
      ? (saver.actualCents / saver.budgetCents) * 100
      : 0;

  let dotColour: string;
  if (pacePercent > progressPercent) {
    dotColour = "bg-destructive";
  } else if (pacePercent >= progressPercent * 0.85) {
    dotColour = "bg-warning";
  } else {
    dotColour = "bg-positive";
  }

  return (
    <span
      className={`inline-block h-4 w-4 rounded-full shrink-0 ${dotColour}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Category row
// ---------------------------------------------------------------------------

function CategoryRow({
  category,
  saverColour,
}: {
  category: CategorySummary;
  saverColour: string;
}) {
  const hasBudget = category.budgetCents > 0;
  const percentUsed = hasBudget
    ? Math.round((category.actualCents / category.budgetCents) * 100)
    : 0;
  const barPercent = hasBudget ? Math.min(percentUsed, 100) : 0;
  const overBudget = percentUsed > 100;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">
          {category.displayName}
        </span>
        <div className="flex items-center gap-2 text-xs">
          {hasBudget ? (
            <>
              <span className="text-muted-foreground">
                {formatCents(category.actualCents)} /{" "}
                {formatCents(category.budgetCents)}
              </span>
              <span
                className={
                  overBudget
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }
              >
                {percentUsed}%
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {formatCents(category.actualCents)}
            </span>
          )}
        </div>
      </div>

      {hasBudget && (
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={`h-1.5 rounded-full transition-all ${
              overBudget ? "bg-destructive" : ""
            }`}
            style={{
              width: `${barPercent}%`,
              backgroundColor: overBudget ? undefined : saverColour,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction row
// ---------------------------------------------------------------------------

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const tags = transaction.tags ?? [];

  return (
    <div className="flex items-start gap-3 px-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-foreground truncate">
            {transaction.description}
          </p>
          <span
            className={`text-sm font-mono whitespace-nowrap shrink-0 ${
              transaction.amountCents < 0
                ? "text-destructive"
                : "text-positive"
            }`}
          >
            {transaction.amountCents < 0 ? "-" : "+"}
            {formatAmount(transaction.amountCents)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatDateShort(transaction.transactionDate)}
          </span>
          {transaction.categoryKey && (
            <span className="text-xs text-muted-foreground">
              · {transaction.categoryKey}
            </span>
          )}
          {transaction.status === "HELD" && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning">
              HELD
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SaverDetailPage({
  params,
}: {
  params: Promise<{ saverKey: string }>;
}) {
  const { saverKey } = use(params);

  const { data: summary, isLoading, error } = useBudgetSummary();

  // Find the specific saver from the summary
  const saver = summary?.spendingSavers.find(
    (s) => s.saverKey === saverKey
  );

  // Fetch recent transactions scoped to this saver + period
  const {
    data: txnData,
    isLoading: txnLoading,
  } = useQuery<TransactionsResponse>({
    queryKey: queryKeys.budget.transactions.list({
      saver: saverKey,
      from: summary?.period.startDate,
      to: summary?.period.endDate,
    }),
    queryFn: () =>
      fetchSaverTransactions(
        saverKey,
        summary!.period.startDate,
        summary!.period.endDate
      ),
    enabled: !!summary,
  });

  // Loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link
          href="/budget"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budget
        </Link>
        <SaverDetailSkeleton />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link
          href="/budget"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budget
        </Link>
        <EmptyState
          icon={ArrowLeft}
          title="Something went wrong"
          description={error.message}
        />
      </div>
    );
  }

  // Saver not found
  if (!saver || !summary) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link
          href="/budget"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budget
        </Link>
        <EmptyState
          icon={ArrowLeft}
          title="Saver not found"
          description={`No spending saver found with key "${saverKey}".`}
        />
      </div>
    );
  }

  const { period } = summary;
  const barPercent = Math.min(saver.percentUsed, 100);
  const overBudget = saver.percentUsed > 100;
  const pacePercent =
    saver.budgetCents > 0
      ? Math.round((saver.actualCents / saver.budgetCents) * 100)
      : 0;

  // Sort categories: those with spend first, then alphabetically
  const sortedCategories = [...saver.categories].sort((a, b) => {
    if (b.actualCents !== a.actualCents) return b.actualCents - a.actualCents;
    return a.displayName.localeCompare(b.displayName);
  });

  const transactions = txnData?.transactions ?? [];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      {/* Back link */}
      <Link
        href="/budget"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Budget
      </Link>

      {/* Saver header card */}
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{saver.emoji}</span>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {saver.displayName}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(saver.percentUsed)}%
            </span>
            <TrafficLight saver={saver} progressPercent={period.progressPercent} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full rounded-full bg-muted">
          <div
            className={`h-3 rounded-full transition-all ${
              overBudget ? "bg-destructive" : ""
            }`}
            style={{
              width: `${barPercent}%`,
              backgroundColor: overBudget ? undefined : saver.colour,
            }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-center justify-between text-sm">
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

        {/* Pace comparison */}
        <div className="text-xs text-muted-foreground">
          Pace: {pacePercent}% spent vs {period.progressPercent}% expected
          <span className="ml-1.5">
            (Day {period.daysElapsed} of {period.totalDays})
          </span>
        </div>
      </div>

      {/* Categories section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Categories
        </h2>
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories configured for this saver.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedCategories.map((cat) => (
              <CategoryRow
                key={cat.categoryKey ?? "uncategorised"}
                category={cat}
                saverColour={saver.colour}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Recent Transactions
        </h2>
        {txnLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border-b border-border"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions in this period.
          </p>
        ) : (
          <div className="rounded-lg border border-border">
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
