import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createApiErrorResponse } from "@/lib/utils/api-error";

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type AuthedHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  userId: string
) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler, errorContext: string): RouteHandler {
  return async (request, context) => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      return await handler(request, context, userId);
    } catch (error) {
      const { body, status } = createApiErrorResponse(error, errorContext);
      return NextResponse.json(body, { status });
    }
  };
}
