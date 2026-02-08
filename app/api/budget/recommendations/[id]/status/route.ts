import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { aiRecommendations } from "@/lib/db/schema";

const updateStatusSchema = z.object({
  status: z.enum(["accepted", "dismissed"]),
});

/**
 * PUT /api/budget/recommendations/:id/status
 *
 * Updates the status of an AI recommendation.
 *
 * Request body:
 *   - status: "accepted" | "dismissed"
 *
 * Response: Updated recommendation object.
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  // Check if recommendation exists
  const existing = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.id, id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(aiRecommendations)
    .set({ status: parsed.data.status })
    .where(eq(aiRecommendations.id, id))
    .returning();

  return NextResponse.json(updated);
}, "updating recommendation status");
