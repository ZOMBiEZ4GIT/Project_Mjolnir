"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface ChangeBadgeProps {
  amount: number;
  percentage: number;
  currency: Currency;
  size?: "sm" | "md";
  showAmount?: boolean;
}

/**
 * Reusable change badge displaying percentage (and optionally amount) changes.
 *
 * - Positive: green text + bg, TrendingUp icon
 * - Negative: red text + bg, TrendingDown icon
 * - Zero: muted text, Minus icon
 */
export function ChangeBadge({
  amount,
  percentage,
  currency,
  size = "md",
  showAmount = true,
}: ChangeBadgeProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const colorClasses = isPositive
    ? "text-positive bg-positive/10"
    : isNegative
      ? "text-destructive bg-destructive/10"
      : "text-muted-foreground bg-muted";

  const sizeClasses =
    size === "sm"
      ? "rounded-full px-2 py-0.5 text-xs gap-1"
      : "rounded-full px-3 py-1 text-sm gap-1.5";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  const sign = isPositive ? "+" : isNegative ? "-" : "";
  const formattedPercent = `${sign}${Math.abs(percentage).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        colorClasses,
        sizeClasses
      )}
    >
      <Icon className={cn(iconSize, "shrink-0")} />
      {showAmount && (
        <span>
          {sign}
          {formatCurrency(Math.abs(amount), currency)}
        </span>
      )}
      <span>{formattedPercent}</span>
    </span>
  );
}
