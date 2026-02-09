"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Workflow, AlertCircle } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  useN8nWorkflows,
  useN8nExecutions,
  type N8nExecution,
} from "@/lib/hooks/use-n8n";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

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

function WorkflowCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 w-24 bg-muted/70 rounded" />
        <div className="h-4 w-20 bg-muted/70 rounded" />
        <div className="h-4 w-28 bg-muted/70 rounded" />
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  workflow: { id: string; name: string; active: boolean };
  executions: N8nExecution[];
  isSelected: boolean;
  onSelect: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function ExecutionHistory({ executions }: { executions: N8nExecution[] }) {
  const sorted = [...executions].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No executions in the last 30 days.
      </p>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto space-y-1">
      {sorted.map((execution) => (
        <div
          key={execution.id}
          className="flex items-start gap-3 py-2 px-1 rounded-lg text-xs"
        >
          <span
            className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
              execution.status === "error" ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="text-foreground font-medium">
                {new Date(execution.startedAt).toLocaleString("en-AU", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>{formatDuration(execution.duration)}</span>
            </div>
            {execution.status === "error" && execution.error && (
              <div className="mt-1 text-red-400">
                {execution.error.nodeName && (
                  <span className="text-red-400/70">
                    [{execution.error.nodeName}]{" "}
                  </span>
                )}
                {execution.error.message}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowCard({
  workflow,
  executions,
  isSelected,
  onSelect,
}: WorkflowCardProps) {
  const workflowExecutions = executions.filter(
    (e) => e.workflowId === workflow.id
  );
  const lastExecution = workflowExecutions.length
    ? workflowExecutions.reduce((latest, e) =>
        new Date(e.startedAt).getTime() > new Date(latest.startedAt).getTime()
          ? e
          : latest
      )
    : null;

  return (
    <div
      className={`rounded-2xl border bg-card transition-colors ${
        isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left p-4 sm:p-6 hover:bg-card/80 transition-colors rounded-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground truncate pr-4">
            {workflow.name}
          </h3>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              workflow.active
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {workflow.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {lastExecution && (
            <>
              <span className="flex items-center gap-1">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    lastExecution.status === "error"
                      ? "bg-red-500"
                      : "bg-emerald-500"
                  }`}
                />
                {lastExecution.status === "error" ? "Error" : "Success"}
              </span>
              <span>Last run {formatRelativeTime(lastExecution.startedAt)}</span>
            </>
          )}
          <span>
            {workflowExecutions.length} execution{workflowExecutions.length !== 1 ? "s" : ""} in 30d
          </span>
        </div>
      </button>

      {isSelected && (
        <div className="border-t border-border px-4 sm:px-6 py-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">
            Execution History
          </h4>
          <ExecutionHistory executions={workflowExecutions} />
        </div>
      )}
    </div>
  );
}

export default function AutomationsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const queryClient = useQueryClient();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null
  );

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
  const error = workflowsError || executionsError;

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.n8n.workflows });
    queryClient.invalidateQueries({ queryKey: queryKeys.n8n.executions() });
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <WorkflowCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Workflow}
          title="Sign in required"
          description="Please sign in to view your automations."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Automations</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <WorkflowCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
          icon={AlertCircle}
          title="n8n unavailable"
          description="Could not connect to the n8n instance. Check that it is running and configured."
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {!isLoading && !error && workflows?.length === 0 && (
        <EmptyState
          icon={Workflow}
          title="No workflows found"
          description="Create workflows in your n8n instance and they will appear here."
        />
      )}

      {!isLoading && !error && workflows && workflows.length > 0 && (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              executions={executions ?? []}
              isSelected={selectedWorkflowId === workflow.id}
              onSelect={() =>
                setSelectedWorkflowId(
                  selectedWorkflowId === workflow.id ? null : workflow.id
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
