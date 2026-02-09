"use client";

import Link from "next/link";
import { Workflow } from "lucide-react";
import { useN8nWorkflows, useN8nExecutions } from "@/lib/hooks/use-n8n";

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function StatusCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-muted rounded" />
          <div className="h-5 w-24 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted/70 rounded" />
          <div className="h-4 w-40 bg-muted/70 rounded" />
        </div>
      </div>
    </div>
  );
}

export function N8nStatusCard() {
  const {
    data: workflows,
    isLoading: workflowsLoading,
    error: workflowsError,
  } = useN8nWorkflows();

  const {
    data: executions,
    isLoading: executionsLoading,
    error: executionsError,
  } = useN8nExecutions();

  const isLoading = workflowsLoading || executionsLoading;
  const hasError = workflowsError || executionsError;

  if (isLoading) {
    return <StatusCardSkeleton />;
  }

  if (hasError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Workflow className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Automations</h3>
        </div>
        <p className="text-sm text-muted-foreground">n8n unavailable</p>
      </div>
    );
  }

  const totalWorkflows = workflows?.length ?? 0;
  const activeWorkflows = workflows?.filter((w) => w.active).length ?? 0;

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const recentFailures =
    executions?.filter(
      (e) =>
        e.status === "error" &&
        new Date(e.startedAt).getTime() > twentyFourHoursAgo
    ) ?? [];

  const mostRecentExecution = executions?.length
    ? executions.reduce((latest, e) =>
        new Date(e.startedAt).getTime() > new Date(latest.startedAt).getTime()
          ? e
          : latest
      )
    : null;

  const hasFailures = recentFailures.length > 0;

  return (
    <Link
      href="/automations"
      className="block rounded-2xl border border-border bg-card p-4 sm:p-6 transition-colors hover:bg-card/80"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Automations</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasFailures ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
          <span
            className={`text-xs ${
              hasFailures ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {hasFailures
              ? `${recentFailures.length} failure${recentFailures.length > 1 ? "s" : ""} in 24h`
              : "All systems operational"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {activeWorkflows}/{totalWorkflows} active
        </span>
        {mostRecentExecution && (
          <span>Last run {formatRelativeTime(mostRecentExecution.startedAt)}</span>
        )}
      </div>
    </Link>
  );
}
