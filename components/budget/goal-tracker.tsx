"use client";

import { useState } from "react";
import { useBudgetGoals, useUpdateGoal, type Goal } from "@/lib/hooks/use-budget-goals";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function formatETA(goal: Goal): string | null {
  if (goal.targetDate) {
    const date = new Date(goal.targetDate);
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }

  // Estimate from monthly contribution
  if (goal.monthlyContributionCents > 0) {
    const remaining = goal.targetAmountCents - goal.currentAmountCents;
    if (remaining <= 0) return null;
    const monthsLeft = Math.ceil(remaining / goal.monthlyContributionCents);
    const eta = new Date();
    eta.setMonth(eta.getMonth() + monthsLeft);
    return eta.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }

  return null;
}

function isDebtPayoff(goal: Goal): boolean {
  return (
    goal.name.toLowerCase().includes("debt") ||
    goal.name.toLowerCase().includes("payoff") ||
    goal.name.toLowerCase().includes("pay off") ||
    goal.name.toLowerCase().includes("loan")
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function GoalTrackerSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-24 rounded bg-muted" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded bg-muted" />
            <div className="h-5 w-40 rounded bg-muted" />
          </div>
          <div className="h-2 w-full rounded-full bg-muted mb-2" />
          <div className="flex justify-between">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form for updating current balance
// ---------------------------------------------------------------------------

function GoalEditForm({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const [dollars, setDollars] = useState(
    (goal.currentAmountCents / 100).toFixed(0)
  );
  const { mutate, isPending } = useUpdateGoal(goal.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(dollars) * 100);
    if (isNaN(cents) || cents < 0) return;
    mutate(
      { currentAmountCents: cents },
      {
        onSuccess: () => onClose(),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <span className="text-xs text-muted-foreground">$</span>
      <Input
        type="number"
        min="0"
        step="1"
        value={dollars}
        onChange={(e) => setDollars(e.target.value)}
        className="h-8 w-32 text-sm"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={isPending} className="h-8">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8"
      >
        Cancel
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Individual goal card
// ---------------------------------------------------------------------------

function GoalCard({ goal }: { goal: Goal }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const isCompleted = goal.status === "completed";
  const barPercent = Math.min(goal.percentComplete, 100);
  const eta = formatETA(goal);
  const debt = isDebtPayoff(goal);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      {/* Header row: icon + name, expand button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />
          ) : (
            <span className="text-lg shrink-0">{goal.icon ?? "🎯"}</span>
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {goal.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs text-muted-foreground">
            {goal.percentComplete}%
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Completed goals: show completion date instead of progress bar */}
      {isCompleted ? (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-xs text-positive">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              Completed{" "}
              {goal.completedAt
                ? new Date(goal.completedAt).toLocaleDateString("en-AU", {
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted mt-3 mb-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${barPercent}%`,
                backgroundColor: goal.colour ?? "hsl(var(--primary))",
              }}
            />
          </div>

          {/* Amount + details row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {formatCents(goal.currentAmountCents)} /{" "}
              {formatCents(goal.targetAmountCents)}
            </span>
            <div className="flex items-center gap-3">
              {goal.monthlyContributionCents > 0 && (
                <span className="text-muted-foreground">
                  {formatCents(goal.monthlyContributionCents)}/mo
                </span>
              )}
              {eta && (
                <span className="text-muted-foreground">
                  {debt ? `Clears ${eta}` : `ETA ${eta}`}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Expanded section: notes + edit */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {goal.notes && (
            <p className="text-xs text-muted-foreground">{goal.notes}</p>
          )}

          {!isCompleted && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-7 gap-1.5 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Update balance
            </Button>
          )}

          {editing && (
            <GoalEditForm goal={goal} onClose={() => setEditing(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GoalTracker — main export
// ---------------------------------------------------------------------------

export function GoalTracker() {
  const { data: goals, isLoading } = useBudgetGoals();

  if (isLoading) return <GoalTrackerSkeleton />;
  if (!goals || goals.length === 0) return null;

  // Active goals first, then completed
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const sorted = [...activeGoals, ...completedGoals];

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        🎯 Goals
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {sorted.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
