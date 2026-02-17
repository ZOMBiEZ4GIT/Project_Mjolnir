"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fadeIn } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface WeeklyMetric {
  label: string;
  thisWeek: number | null;
  lastWeek: number | null;
  unit: string;
  /** When false, lower is better (e.g. resting HR) */
  isPositiveGood?: boolean;
  decimals?: number;
}

interface WeeklySummaryRowProps {
  metrics: WeeklyMetric[];
}

/**
 * Compact row comparing this week vs last week averages for key metrics.
 */
export function WeeklySummaryRow({ metrics }: WeeklySummaryRowProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      {...(reducedMotion ? {} : fadeIn)}
    >
      <h3 className="text-label uppercase text-muted-foreground mb-4">
        This week vs last week
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {metrics.map((m) => {
          const delta =
            m.thisWeek !== null && m.lastWeek !== null
              ? m.thisWeek - m.lastWeek
              : null;
          const isPositive = delta !== null && delta > 0;
          const isNegative = delta !== null && delta < 0;
          const isGood = m.isPositiveGood !== false ? isPositive : isNegative;
          const isBad = m.isPositiveGood !== false ? isNegative : isPositive;

          return (
            <div key={m.label} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {m.label}
              </div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {m.thisWeek !== null
                  ? m.thisWeek.toFixed(m.decimals ?? 0)
                  : "—"}
                <span className="text-xs text-muted-foreground ml-0.5">
                  {m.unit}
                </span>
              </div>
              {delta !== null && (
                <div
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs mt-0.5",
                    isGood && "text-positive",
                    isBad && "text-destructive",
                    !isGood && !isBad && "text-muted-foreground"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {delta.toFixed(m.decimals ?? 0)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
