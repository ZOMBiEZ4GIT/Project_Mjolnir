"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";

interface AiRecommendation {
  id: string;
  budgetPeriodId: string;
  recommendationData: Record<string, unknown>;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

interface AIRecommendationButtonProps {
  periodId: string;
  onRecommendation: (recommendation: AiRecommendation) => void;
}

const POLL_INTERVAL = 3_000;
const POLL_TIMEOUT = 60_000;

export function AIRecommendationButton({
  periodId,
  onRecommendation,
}: AIRecommendationButtonProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const queryClient = useQueryClient();

  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the recommendation id that existed before requesting
  const baselineIdRef = useRef<string | null>(null);

  // Fetch existing recommendation for this period
  const { data: existing, isLoading: isCheckingExisting } =
    useQuery<AiRecommendation | null>({
      queryKey: queryKeys.budget.recommendations.latest(periodId),
      queryFn: async () => {
        const res = await fetch(
          `/api/budget/recommendations?period_id=${periodId}`
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch recommendation");
        return res.json();
      },
      enabled: isLoaded && isSignedIn,
      staleTime: 1000 * 60 * 2,
    });

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/budget/recommendations?period_id=${periodId}`
        );
        if (res.status === 404) return;
        if (!res.ok) return;

        const rec: AiRecommendation = await res.json();
        // Only treat it as new if it's a different recommendation than baseline
        if (rec && rec.id !== baselineIdRef.current) {
          stopPolling();
          setIsRequesting(false);
          queryClient.setQueryData(
            queryKeys.budget.recommendations.latest(periodId),
            rec
          );
          onRecommendation(rec);
        }
      } catch {
        // Swallow — keep polling
      }
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setIsRequesting(false);
      setError("Timed out waiting for recommendation. Try again.");
    }, POLL_TIMEOUT);
  }, [periodId, stopPolling, queryClient, onRecommendation]);

  const handleRequest = async () => {
    setError(null);
    setIsRequesting(true);
    // Capture current recommendation id as baseline before requesting
    baselineIdRef.current = existing?.id ?? null;

    try {
      const res = await fetch("/api/budget/recommendations", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed (${res.status})`
        );
      }

      // POST returned 202 — start polling for the result
      startPolling();
    } catch (err) {
      setIsRequesting(false);
      setError(
        err instanceof Error ? err.message : "Failed to request recommendation"
      );
    }
  };

  // Show existing recommendation action
  const hasExisting = existing && existing.status === "pending";

  if (isCheckingExisting) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (error) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequest}
        className="text-red-400 border-red-400/30 hover:bg-red-400/10"
      >
        <AlertCircle className="h-4 w-4" />
        Retry
      </Button>
    );
  }

  if (isRequesting) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Analysing your spending…</span>
        <span className="sm:hidden">Analysing…</span>
      </Button>
    );
  }

  if (hasExisting) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRecommendation(existing)}
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">View Recommendation</span>
        <span className="sm:hidden">View</span>
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRequest}>
      <Sparkles className="h-4 w-4" />
      <span className="hidden sm:inline">Get AI Recommendation</span>
      <span className="sm:hidden">AI Tips</span>
    </Button>
  );
}
