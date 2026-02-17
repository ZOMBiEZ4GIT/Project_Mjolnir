import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * PATCH /api/transactions/:id/restore
 *
 * Restores a soft-deleted transaction by clearing its `deletedAt` timestamp.
 *
 * Response: The restored Transaction object
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if transaction not found or not deleted
 */
export const PATCH = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Find the soft-deleted transaction, verifying ownership via holdings join
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(
      and(
        eq(transactions.id, id),
        eq(holdings.userId, userId),
        isNotNull(transactions.deletedAt)
      )
    );

  if (!existing) {
    return NextResponse.json(
      { error: "Deleted transaction not found" },
      { status: 404 }
    );
  }

  const now = new Date();

  const [restored] = await db
    .update(transactions)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(transactions.id, id))
    .returning();

  return NextResponse.json(restored);
}, "restoring transaction");
