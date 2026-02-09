import { NextResponse } from "next/server";
import { withAuth } from "@/lib/utils/with-auth";

interface N8nApiExecution {
  id: number | string;
  workflowId: string;
  workflowData?: { name?: string };
  status: string;
  startedAt: string;
  stoppedAt: string;
  data?: {
    resultData?: {
      error?: {
        message?: string;
        node?: string;
      };
    };
  };
}

export const GET = withAuth(async (request) => {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_MONITOR_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "n8n is not configured" },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get("workflowId");
  const status = searchParams.get("status");

  const params = new URLSearchParams();
  params.set("limit", "250");

  // Default to last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  params.set("startedAfter", thirtyDaysAgo.toISOString());

  if (workflowId) params.set("workflowId", workflowId);
  if (status) params.set("status", status);

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/executions?${params.toString()}`,
      {
        headers: { "X-N8N-API-KEY": apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "n8n instance is unreachable" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const executions = (data.data ?? data) as N8nApiExecution[];

    const mapped = executions.map((e) => {
      const startedAt = e.startedAt ? new Date(e.startedAt).getTime() : null;
      const stoppedAt = e.stoppedAt ? new Date(e.stoppedAt).getTime() : null;
      const duration =
        startedAt != null && stoppedAt != null ? stoppedAt - startedAt : null;

      const errorData = e.data?.resultData?.error;

      return {
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflowData?.name ?? null,
        status: e.status,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
        duration,
        error:
          e.status === "error" && errorData
            ? {
                message: errorData.message ?? "Unknown error",
                nodeName: errorData.node ?? null,
              }
            : null,
      };
    });

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "n8n instance is unreachable" },
      { status: 502 }
    );
  }
}, "fetching n8n executions");
