"use client";

import { cn } from "@/lib/utils";

interface PriceSkeletonProps {
  /** Which layout to show: "price" = price + change + timestamp, "value" = single value line */
  variant?: "price" | "value";
  className?: string;
}

/**
 * Loading skeleton for price-related cells.
 * Matches typical rendered dimensions to prevent layout shift.
 * Uses bg-muted + animate-pulse (design tokens).
 */
export function PriceSkeleton({ variant = "price", className }: PriceSkeletonProps) {
  if (variant === "value") {
    // Single-line skeleton for MarketValueCell/GainLossCell/CostBasisCell
    return (
      <div className={cn("flex flex-col gap-1 items-end", className)}>
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // Full price cell skeleton: price + change percentage + timestamp
  return (
    <div className={cn("flex flex-col gap-1 items-end", className)}>
      {/* Price placeholder (wider) */}
      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      {/* Change percentage placeholder (narrower) */}
      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
      {/* Timestamp placeholder (narrow) */}
      <div className="h-3 w-14 bg-muted rounded animate-pulse" />
    </div>
  );
}
