"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SuggestedBudgetItem {
  categoryId: string;
  currentCents: number;
  suggestedCents: number;
  reason: string;
}

interface SavingsProjection {
  currentRate: number;
  projectedRate: number;
  monthlyIncreaseCents: number;
}

interface RecommendationData {
  suggestedBudget: SuggestedBudgetItem[];
  paySplitConfig: Array<{
    saverName: string;
    percentage: number;
    amountCents: number;
  }>;
  insights: string[];
  savingsProjection: SavingsProjection;
  actionableTip: string;
  generatedAt: string;
}

export interface AiRecommendation {
  id: string;
  budgetPeriodId: string;
  recommendationData: RecommendationData;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

interface CategoryMap {
  [categoryId: string]: string;
}

interface RecommendationModalProps {
  recommendation: AiRecommendation;
  categoryMap: CategoryMap;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (recommendation: AiRecommendation) => Promise<void>;
  onDismiss: (recommendation: AiRecommendation) => Promise<void>;
}

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

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendationModal({
  recommendation,
  categoryMap,
  open,
  onOpenChange,
  onAccept,
  onDismiss,
}: RecommendationModalProps) {
  const [isActioning, setIsActioning] = useState<"accept" | "dismiss" | null>(
    null
  );
  const data = recommendation.recommendationData;
  const isAlreadyActioned = recommendation.status !== "pending";

  async function handleAccept() {
    setIsActioning("accept");
    try {
      await onAccept(recommendation);
    } finally {
      setIsActioning(null);
    }
  }

  async function handleDismiss() {
    setIsActioning("dismiss");
    try {
      await onDismiss(recommendation);
    } finally {
      setIsActioning(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Budget Recommendation</DialogTitle>
          <DialogDescription>
            Analysis of your spending patterns with suggestions to optimise your
            budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1 — Insights */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Spending Insights
            </h3>
            <ul className="space-y-1.5">
              {data.insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 2 — Suggested Budget */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Suggested Budget Adjustments
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      Current
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      Suggested
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      Diff
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.suggestedBudget.map((item) => {
                    const diff = item.suggestedCents - item.currentCents;
                    const isIncrease = diff > 0;
                    const isDecrease = diff < 0;
                    return (
                      <tr
                        key={item.categoryId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 text-foreground">
                          {categoryMap[item.categoryId] || item.categoryId}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                          {formatCents(item.currentCents)}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground font-medium tabular-nums">
                          {formatCents(item.suggestedCents)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              isIncrease
                                ? "text-emerald-400"
                                : isDecrease
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {isIncrease && (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {isDecrease && (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {diff === 0
                              ? "—"
                              : `${isIncrease ? "+" : ""}${formatCents(diff)}`}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs hidden sm:table-cell">
                          {item.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 — Savings Projection */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Savings Projection
            </h3>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Rate
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatRate(data.savingsProjection.currentRate)}
                  </p>
                </div>
                <div>
                  <TrendingUp className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
                  <p className="text-xs text-muted-foreground">Projected</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Projected Rate
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatRate(data.savingsProjection.projectedRate)}
                  </p>
                </div>
              </div>
              {data.savingsProjection.monthlyIncreaseCents > 0 && (
                <p className="text-center text-sm text-emerald-400 mt-3">
                  +{formatCents(data.savingsProjection.monthlyIncreaseCents)}
                  /month extra savings
                </p>
              )}
            </div>
          </section>

          {/* Section 4 — Actionable Tip */}
          <section>
            <div className="rounded-lg border border-border bg-card p-4 flex gap-3">
              <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Tip
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.actionableTip}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        {!isAlreadyActioned && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              disabled={isActioning !== null}
            >
              {isActioning === "dismiss" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Dismiss
            </Button>
            <Button onClick={handleAccept} disabled={isActioning !== null}>
              {isActioning === "accept" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Accept All
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
