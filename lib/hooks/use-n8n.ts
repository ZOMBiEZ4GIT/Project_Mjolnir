"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: number | string;
  workflowId: string;
  workflowName: string | null;
  status: string;
  startedAt: string;
  stoppedAt: string;
  duration: number | null;
  error: {
    message: string;
    nodeName: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWorkflows(): Promise<N8nWorkflow[]> {
  const response = await fetch("/api/n8n/workflows");
  if (!response.ok) {
    throw new Error("Failed to fetch n8n workflows");
  }
  return response.json();
}

async function fetchExecutions(workflowId?: string): Promise<N8nExecution[]> {
  const params = new URLSearchParams();
  if (workflowId) params.set("workflowId", workflowId);

  const url = `/api/n8n/executions${params.size ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch n8n executions");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

// Middleware guarantees authentication, so no client-side auth checks needed.

export function useN8nWorkflows() {
  return useQuery<N8nWorkflow[], Error>({
    queryKey: queryKeys.n8n.workflows,
    queryFn: fetchWorkflows,
    staleTime: 30_000,
  });
}

export function useN8nExecutions(workflowId?: string) {
  return useQuery<N8nExecution[], Error>({
    queryKey: queryKeys.n8n.executions(workflowId),
    queryFn: () => fetchExecutions(workflowId),
    staleTime: 30_000,
  });
}
