"use client";

import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StaleIndicatorProps {
  isStale: boolean;
  lastUpdated?: Date | string;
  variant?: "icon" | "badge";
}

/**
 * Formats a relative timestamp (e.g., "2 minutes ago").
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Stale data indicator component.
 *
 * - Icon variant: amber AlertTriangle with tooltip showing "Last updated: X ago"
 * - Badge variant: amber pill badge showing "X ago" with warning icon
 *
 * Returns null if `isStale` is false.
 */
export function StaleIndicator({
  isStale,
  lastUpdated,
  variant = "icon",
}: StaleIndicatorProps) {
  if (!isStale) return null;

  const parsedDate = lastUpdated
    ? lastUpdated instanceof Date
      ? lastUpdated
      : new Date(lastUpdated)
    : null;

  const timeAgo = parsedDate ? formatTimeAgo(parsedDate) : "unknown";
  const tooltipText = `Last updated: ${timeAgo}`;

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
        <AlertTriangle className="h-3 w-3" />
        {timeAgo}
      </span>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center text-amber-500",
              "cursor-help"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
