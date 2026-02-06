"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceTimestampProps {
  fetchedAt: Date | null;
  isStale: boolean;
  error?: string;
}

/**
 * Displays relative time since price was fetched, with tooltip showing exact timestamp.
 * Auto-updates every 30 seconds. Shows warning styling for stale/error states.
 */
export function PriceTimestamp({ fetchedAt, isStale, error }: PriceTimestampProps) {
  const [relativeTime, setRelativeTime] = useState(() =>
    fetchedAt ? formatTimeAgo(fetchedAt) : null
  );

  // Auto-update relative time every 30 seconds
  useEffect(() => {
    if (!fetchedAt) return;

    setRelativeTime(formatTimeAgo(fetchedAt));

    const interval = setInterval(() => {
      setRelativeTime(formatTimeAgo(fetchedAt));
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchedAt]);

  // No timestamp
  if (!fetchedAt) {
    return <span className="text-muted-foreground text-xs">&mdash;</span>;
  }

  // Determine styling based on state
  const hasError = !!error;
  const iconClass = hasError
    ? "text-destructive"
    : isStale
      ? "text-warning"
      : "text-muted-foreground";
  const textClass = hasError
    ? "text-destructive"
    : isStale
      ? "text-warning"
      : "text-muted-foreground";

  const exactTime = fetchedAt.toLocaleString("en-AU", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-xs flex items-center gap-0.5 ${textClass}`}>
            {hasError || isStale ? (
              <AlertTriangle className={`h-3 w-3 ${iconClass}`} />
            ) : (
              <Clock className={`h-3 w-3 ${iconClass}`} />
            )}
            {relativeTime}
            {hasError && <span>(failed)</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{exactTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}
