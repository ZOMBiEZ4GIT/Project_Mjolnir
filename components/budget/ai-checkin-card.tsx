"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  useLatestRecommendation,
  useRequestRecommendation,
  type Recommendation,
} from "@/lib/hooks/use-budget-recommendation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColour(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green":
      return "bg-positive";
    case "amber":
      return "bg-warning";
    case "red":
      return "bg-destructive";
  }
}

function statusText(status: "green" | "amber" | "red"): string {
  switch (status) {
    case "green":
      return "On Track";
    case "amber":
      return "Needs Attention";
    case "red":
      return "Over Budget";
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function AiCheckinSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full bg-muted" />
        <div className="h-5 w-48 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation display
// ---------------------------------------------------------------------------

function RecommendationDisplay({ rec }: { rec: Recommendation }) {
  const timestamp = rec.generatedAt ?? rec.createdAt;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          🤖 AI Check-in
        </h3>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last run: {timeAgo(timestamp)}
        </span>
      </div>

      {/* Overall status */}
      {rec.overallStatus && (
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-4 w-4 rounded-full shrink-0 ${statusColour(rec.overallStatus)}`}
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              {statusText(rec.overallStatus)}
            </span>
            {rec.insights && rec.insights.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {rec.insights[0]}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Saver Health grid */}
      {rec.saverStatuses && rec.saverStatuses.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Saver Health
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {rec.saverStatuses.map((s) => (
              <div
                key={s.saverKey}
                className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${statusColour(s.status)}`}
                />
                <span className="text-xs text-foreground truncate">
                  {s.saverKey}
                </span>
                {s.message && (
                  <span className="text-xs text-muted-foreground ml-auto truncate">
                    {s.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {rec.insights && rec.insights.length > 1 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Insights
          </h4>
          <ul className="space-y-1.5">
            {rec.insights.slice(1).map((insight, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-muted-foreground/60 shrink-0 mt-0.5">
                  •
                </span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actionable Tip */}
      {rec.actionableTip && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
          <h4 className="text-xs font-medium text-primary mb-1">
            💡 Actionable Tip
          </h4>
          <p className="text-xs text-foreground">{rec.actionableTip}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 5_000;
const POLL_TIMEOUT = 60_000;

export function AiCheckinCard({ periodId }: { periodId: string }) {
  const queryClient = useQueryClient();
  const {
    data: recommendation,
    isLoading,
    error,
  } = useLatestRecommendation(periodId);
  const requestMutation = useRequestRecommendation();

  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Detect new recommendation while polling
  useEffect(() => {
    if (
      isPolling &&
      recommendation &&
      recommendation.id !== baselineIdRef.current
    ) {
      stopPolling();
    }
  }, [isPolling, recommendation, stopPolling]);

  const handleRunCheckin = async () => {
    baselineIdRef.current = recommendation?.id ?? null;
    setIsPolling(true);

    try {
      await requestMutation.mutateAsync();

      // Start polling for the result
      pollTimerRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.budget.recommendations.latest(periodId),
        });
      }, POLL_INTERVAL);

      // Timeout after 60 seconds
      timeoutRef.current = setTimeout(() => {
        stopPolling();
      }, POLL_TIMEOUT);
    } catch {
      setIsPolling(false);
    }
  };

  if (isLoading) {
    return <AiCheckinSkeleton />;
  }

  // Error state — allow retry
  if (error && !recommendation) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            🤖 AI Check-in
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Failed to load check-in data.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunCheckin}
          disabled={isPolling}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // No recommendation yet — empty state
  if (!recommendation) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            🤖 AI Check-in
          </h3>
        </div>
        {isPolling ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Analysing your budget…
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              No check-in yet. Run your first AI check-in to get personalised
              insights.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCheckin}
              disabled={isPolling || requestMutation.isPending}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Check-in
            </Button>
          </>
        )}
      </div>
    );
  }

  // Has recommendation — show it
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
      <RecommendationDisplay rec={recommendation} />

      {/* Run check-in button */}
      <div className="mt-4 pt-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunCheckin}
          disabled={isPolling || requestMutation.isPending}
        >
          {isPolling ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analysing your budget…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Run Check-in
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
