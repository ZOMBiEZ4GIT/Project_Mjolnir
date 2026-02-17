import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * PATCH /api/holdings/:id/restore
 *
 * Restores a soft-deleted holding by clearing its `deletedAt` timestamp.
 * Associated transactions/snapshots are not cascade-deleted, so restoring
 * the holding makes them visible again automatically.
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if holding not found or not deleted
 */
export const PATCH = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Find the soft-deleted holding, verifying ownership
  const [existing] = await db
    .select({ id: holdings.id })
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNotNull(holdings.deletedAt)
      )
    );

  if (!existing) {
    return NextResponse.json(
      { error: "Deleted holding not found" },
      { status: 404 }
    );
  }

  const now = new Date();

  await db
    .update(holdings)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(holdings.id, id));

  return NextResponse.json({ success: true });
}, "restoring holding");
