import { NextResponse } from "next/server";
import { withAuth } from "@/lib/utils/with-auth";

interface N8nApiWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const GET = withAuth(async () => {
  const baseUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "n8n is not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "n8n instance is unreachable" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const workflows = (data.data ?? data) as N8nApiWorkflow[];

    const mapped = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "n8n instance is unreachable" },
      { status: 502 }
    );
  }
}, "fetching n8n workflows");
