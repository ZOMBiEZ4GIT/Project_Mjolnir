"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { showInfo } from "@/lib/toast-helpers";
import type { Anomaly, AnomalySeverity } from "@/lib/budget/anomalies";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnomaliesResponse {
  anomalies: Anomaly[];
}

// ---------------------------------------------------------------------------
// LocalStorage helpers for dismissed anomalies
// ---------------------------------------------------------------------------

const DISMISSED_KEY = "mjolnir:dismissed-anomaly-alerts";

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function dismissAnomaly(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

function severityStyles(severity: AnomalySeverity) {
  switch (severity) {
    case "alert":
      return {
        border: "border-destructive/30",
        bg: "bg-destructive/5",
        iconColor: "text-destructive",
        Icon: AlertTriangle,
      };
    case "warning":
      return {
        border: "border-warning/30",
        bg: "bg-warning/5",
        iconColor: "text-warning",
        Icon: AlertCircle,
      };
  }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchAnomalies(periodId?: string): Promise<Anomaly[]> {
  const params = periodId ? `?period_id=${periodId}` : "";
  const res = await fetch(`/api/budget/anomalies${params}`);
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  const data: AnomaliesResponse = await res.json();
  return data.anomalies;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AnomalyAlertsProps {
  periodId?: string;
}

export function AnomalyAlerts({ periodId }: AnomalyAlertsProps) {
  const { data: anomalies = [] } = useQuery<Anomaly[], Error>({
    queryKey: queryKeys.budget.anomalies(periodId),
    queryFn: () => fetchAnomalies(periodId),
    staleTime: 5 * 60_000, // 5 minutes
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismissed set on mount
  useEffect(() => {
    setDismissed(getDismissedIds());
  }, []);

  const visible = anomalies.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const handleDismiss = (anomaly: Anomaly) => {
    dismissAnomaly(anomaly.id);
    setDismissed((prev) => new Set([...prev, anomaly.id]));
    showInfo("Alert dismissed");
  };

  return (
    <div className="space-y-3">
      {visible.map((anomaly) => {
        const { border, bg, iconColor, Icon } = severityStyles(
          anomaly.severity
        );

        return (
          <div
            key={anomaly.id}
            className={`rounded-lg border ${border} ${bg} p-4`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {anomaly.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {anomaly.type === "large_transaction" &&
                    `Average for this category: $${(anomaly.comparisonCents / 100).toFixed(2)}`}
                  {anomaly.type === "category_overspend" &&
                    `Budget: $${(anomaly.comparisonCents / 100).toFixed(2)} · Spent: $${(anomaly.amountCents / 100).toFixed(2)}`}
                  {anomaly.type === "duplicate_merchant" &&
                    `Check for accidental double charges`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => handleDismiss(anomaly)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
