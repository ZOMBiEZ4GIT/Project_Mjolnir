"use client";

import { type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

interface HealthKpiCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  delta?: number | null;
  sparklineData?: number[];
  /** When true, a positive delta is good (green). When false, lower is better (e.g. resting HR). */
  isPositiveGood?: boolean;
  icon: LucideIcon;
}

/**
 * KPI card for the health overview page.
 * Displays a metric with optional delta badge and sparkline.
 */
export function HealthKpiCard({
  label,
  value,
  unit,
  delta,
  sparklineData,
  isPositiveGood = true,
  icon: Icon,
}: HealthKpiCardProps) {
  const reducedMotion = useReducedMotion();

  const hasDelta = delta !== null && delta !== undefined && delta !== 0;
  const isPositiveDelta = delta !== null && delta !== undefined && delta > 0;
  const isNegativeDelta = delta !== null && delta !== undefined && delta < 0;

  // Determine delta colour based on direction and whether positive is good
  const deltaIsGood = isPositiveGood ? isPositiveDelta : isNegativeDelta;
  const deltaIsBad = isPositiveGood ? isNegativeDelta : isPositiveDelta;

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-foreground tabular-nums">
              {value ?? "—"}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>

          {/* Delta badge */}
          {hasDelta && (
            <div
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                deltaIsGood && "bg-green-500/10 text-green-500",
                deltaIsBad && "bg-red-500/10 text-red-500",
                !deltaIsGood && !deltaIsBad && "bg-muted text-muted-foreground"
              )}
            >
              {isPositiveDelta ? (
                <TrendingUp className="h-3 w-3" />
              ) : isNegativeDelta ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>
                {isPositiveDelta ? "+" : ""}
                {typeof delta === "number" ? delta.toFixed(1) : delta}
              </span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length >= 2 && (
          <div className="shrink-0">
            <Sparkline data={sparklineData} width={80} height={32} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
