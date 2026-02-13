"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useBudgetSavers } from "@/lib/hooks/use-budget-savers";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, Copy, Check } from "lucide-react";
import { showSuccess, showInfo } from "@/lib/toast-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Suggestion {
  merchantPattern: string;
  suggestedSaverKey: string;
  suggestedCategoryKey: string;
  correctionCount: number;
  exampleDescriptions: string[];
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// ---------------------------------------------------------------------------
// LocalStorage helpers for dismissed suggestions
// ---------------------------------------------------------------------------

const DISMISSED_KEY = "mjolnir:dismissed-correction-suggestions";

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function dismissSuggestion(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

function makeSuggestionId(s: Suggestion): string {
  return `${s.merchantPattern}::${s.suggestedSaverKey}::${s.suggestedCategoryKey}`;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchSuggestions(): Promise<Suggestion[]> {
  const res = await fetch("/api/budget/corrections/suggestions");
  if (!res.ok) throw new Error("Failed to fetch correction suggestions");
  const data: SuggestionsResponse = await res.json();
  return data.suggestions;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CorrectionSuggestions() {
  const queryClient = useQueryClient();
  const { data: suggestions = [] } = useQuery<Suggestion[], Error>({
    queryKey: queryKeys.budget.corrections.suggestions,
    queryFn: fetchSuggestions,
    staleTime: 60_000,
  });

  const { data: savers = [] } = useBudgetSavers();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load dismissed set on mount
  useEffect(() => {
    setDismissed(getDismissedIds());
  }, []);

  const visible = suggestions.filter(
    (s) => !dismissed.has(makeSuggestionId(s))
  );

  const handleDismiss = useCallback(
    (s: Suggestion) => {
      const id = makeSuggestionId(s);
      dismissSuggestion(id);
      setDismissed((prev) => new Set([...prev, id]));
      showInfo("Suggestion dismissed");
    },
    []
  );

  const handleAccept = useCallback(
    async (s: Suggestion) => {
      // Build a rule JSON that could be imported into n8n
      const rule = {
        merchantPattern: s.merchantPattern,
        saverKey: s.suggestedSaverKey,
        categoryKey: s.suggestedCategoryKey,
        correctionCount: s.correctionCount,
        examples: s.exampleDescriptions,
      };
      await navigator.clipboard.writeText(JSON.stringify(rule, null, 2));
      const id = makeSuggestionId(s);
      setCopiedId(id);
      showSuccess("Rule copied to clipboard");
      // Auto-dismiss after copying
      setTimeout(() => {
        dismissSuggestion(id);
        setDismissed((prev) => new Set([...prev, id]));
        setCopiedId(null);
        queryClient.invalidateQueries({
          queryKey: queryKeys.budget.corrections.suggestions,
        });
      }, 2000);
    },
    [queryClient]
  );

  // Build saver lookup for display names
  const saverMap = new Map(
    savers.map((s) => [s.saverKey, s])
  );

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((s) => {
        const id = makeSuggestionId(s);
        const saver = saverMap.get(s.suggestedSaverKey);
        const saverLabel = saver
          ? `${saver.emoji} ${saver.displayName}`
          : s.suggestedSaverKey;

        return (
          <div
            key={id}
            className="rounded-lg border border-warning/30 bg-warning/5 p-4"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  You&apos;ve corrected{" "}
                  <span className="font-semibold">{s.merchantPattern}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {saverLabel} &rarr; {s.suggestedCategoryKey}
                  </span>{" "}
                  {s.correctionCount} times. Add as a rule?
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Examples: {s.exampleDescriptions.slice(0, 3).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => handleAccept(s)}
                >
                  {copiedId === id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Rule
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDismiss(s)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
