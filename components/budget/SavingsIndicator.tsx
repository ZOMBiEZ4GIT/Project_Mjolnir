"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface SavingsIndicatorProps {
  savingsCents: number;
  savingsRate: number;
  spentCents: number;
  incomeCents: number;
  daysElapsed: number;
  totalDays: number;
}

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

const TARGET_RATE = 30;

export function SavingsIndicator({
  savingsCents,
  savingsRate,
  spentCents,
  incomeCents,
  daysElapsed,
  totalDays,
}: SavingsIndicatorProps) {
  // Project end-of-period savings using linear extrapolation
  const projectedSpent =
    daysElapsed > 0 ? (spentCents / daysElapsed) * totalDays : spentCents;
  const projectedSavings = incomeCents - projectedSpent;
  const projectedRate =
    incomeCents > 0
      ? Math.round((projectedSavings / incomeCents) * 1000) / 10
      : 0;

  // Use projected rate for the colour indicator mid-period
  const effectiveRate = daysElapsed < totalDays ? projectedRate : savingsRate;

  const colour =
    effectiveRate >= TARGET_RATE
      ? "text-emerald-400"
      : effectiveRate >= 25
        ? "text-amber-400"
        : "text-red-400";

  const onTrack = effectiveRate >= TARGET_RATE;
  const Icon = savingsCents >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${colour}`} />
        <span className="text-xs text-muted-foreground">Savings</span>
      </div>
      <p className={`text-lg font-semibold ${colour}`}>
        {formatCents(savingsCents)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {savingsRate}% savings rate
      </p>
      {daysElapsed < totalDays && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Projected: {projectedRate}% at end of period
        </p>
      )}
      <p className={`text-xs mt-1 ${colour}`}>
        {onTrack
          ? `On track (target ${TARGET_RATE}%)`
          : `Below ${TARGET_RATE}% target`}
      </p>
    </div>
  );
}
