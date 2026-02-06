"use client";

import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Formats a relative time string like "2 minutes ago" or "1 hour ago".
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  }
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

/**
 * Formats a rate to 4 decimal places.
 */
function formatRate(rate: number): string {
  return rate.toFixed(4);
}

/**
 * Props for the FxRatesDisplay component.
 */
export interface FxRatesDisplayProps {
  /**
   * Additional CSS classes.
   */
  className?: string;

  /**
   * Display mode: "compact" shows icon with tooltip, "inline" shows rates inline.
   * Default: "compact"
   */
  mode?: "compact" | "inline";

  /**
   * Show loading skeleton while rates are loading.
   * Default: true
   */
  showLoadingState?: boolean;
}

/**
 * Loading skeleton for inline mode.
 */
function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-7 w-48 items-center rounded bg-muted animate-pulse",
        className
      )}
      aria-label="Loading exchange rates"
    />
  );
}

/**
 * Loading skeleton for compact mode.
 */
function CompactSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded bg-muted animate-pulse",
        className
      )}
      aria-label="Loading exchange rates"
    />
  );
}

/**
 * FxRatesDisplay Component
 *
 * Displays current exchange rates (USD/AUD, NZD/AUD) with an "as of" time indicator.
 * Can be used in two modes:
 * - "compact": Shows an icon with a tooltip containing rate details
 * - "inline": Shows rates directly inline with the timestamp
 *
 * Uses the CurrencyProvider context for rate data.
 *
 * @example
 * // Compact mode (icon with tooltip) - good for toolbars
 * <FxRatesDisplay mode="compact" />
 *
 * @example
 * // Inline mode - good for cards/sections
 * <FxRatesDisplay mode="inline" />
 */
export function FxRatesDisplay({
  className,
  mode = "compact",
  showLoadingState = true,
}: FxRatesDisplayProps) {
  const { rates, isLoading, isStale, ratesFetchedAt } = useCurrency();

  // Show loading skeleton
  if (showLoadingState && isLoading) {
    return mode === "compact" ? (
      <CompactSkeleton className={className} />
    ) : (
      <InlineSkeleton className={className} />
    );
  }

  // No rates available
  if (!rates) {
    if (mode === "compact") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded border border-border text-muted-foreground hover:bg-card transition-colors",
                  className
                )}
                aria-label="Exchange rates unavailable"
              >
                <AlertTriangle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-sm">
              <p>Exchange rates unavailable</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-sm text-muted-foreground",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        <span>Exchange rates unavailable</span>
      </div>
    );
  }

  const usdRate = rates["USD/AUD"];
  const nzdRate = rates["NZD/AUD"];
  const fetchedAt = ratesFetchedAt ? formatRelativeTime(ratesFetchedAt) : "unknown";

  // Rate display content (shared between modes)
  const ratesContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <TrendingUp className="h-4 w-4 text-positive" />
        Exchange Rates
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">1 USD =</span>
        <span className="font-mono text-foreground">{formatRate(usdRate)} AUD</span>
        <span className="text-muted-foreground">1 NZD =</span>
        <span className="font-mono text-foreground">{formatRate(nzdRate)} AUD</span>
      </div>
      <div
        className={cn(
          "text-xs flex items-center gap-1",
          isStale ? "text-amber-400" : "text-muted-foreground"
        )}
      >
        {isStale && <AlertTriangle className="h-3 w-3" />}
        <span>as of {fetchedAt}</span>
      </div>
    </div>
  );

  // Compact mode: icon with tooltip
  if (mode === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:bg-card transition-colors",
                isStale ? "text-amber-400" : "text-muted-foreground",
                className
              )}
              aria-label="View exchange rates"
            >
              <Info className="h-4 w-4" />
            </button>
            </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="p-3 min-w-[200px]">
            {ratesContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline mode: show rates directly
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background/50 p-3",
        className
      )}
    >
      {ratesContent}
    </div>
  );
}
