import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { snapshots, holdings, contributions } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * PATCH /api/snapshots/:id/restore
 *
 * Restores a soft-deleted snapshot by clearing its `deletedAt` timestamp.
 * For super holdings, also restores the associated contribution record
 * for the same holding + date (mirrors cascade logic in DELETE).
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if snapshot not found or not deleted
 */
export const PATCH = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Find the soft-deleted snapshot, verifying ownership via holdings join
  const existing = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(snapshots.id, id),
        eq(holdings.userId, userId),
        isNotNull(snapshots.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Deleted snapshot not found" },
      { status: 404 }
    );
  }

  const snapshot = existing[0];
  const now = new Date();

  // Restore the snapshot
  await db
    .update(snapshots)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(snapshots.id, id));

  // For super holdings, also restore the associated contribution if it was deleted
  if (snapshot.holdingType === "super") {
    await db
      .update(contributions)
      .set({ deletedAt: null, updatedAt: now })
      .where(
        and(
          eq(contributions.holdingId, snapshot.holdingId),
          eq(contributions.date, snapshot.date),
          isNotNull(contributions.deletedAt)
        )
      );
  }

  return NextResponse.json({ success: true });
}, "restoring snapshot");
