import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { snapshots, holdings, contributions } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/snapshots/:id
 *
 * Returns a single snapshot by ID with holding name and type.
 * Ownership is validated via the parent holding's userId.
 *
 * Response: Snapshot object
 *   { id, holdingId, date, balance, currency, notes, createdAt, updatedAt,
 *     holdingName, holdingType }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if snapshot not found or doesn't belong to user
 */
export const GET = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Query with inner join to include holding info and validate ownership
  const result = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      balance: snapshots.balance,
      currency: snapshots.currency,
      notes: snapshots.notes,
      createdAt: snapshots.createdAt,
      updatedAt: snapshots.updatedAt,
      holdingName: holdings.name,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(snapshots.id, id),
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (result.length === 0) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}, "fetching snapshot");

interface UpdateSnapshotBody {
  balance?: string | number;
  notes?: string;
}

/**
 * PATCH /api/snapshots/:id
 *
 * Partially updates a snapshot. Only balance and notes can be changed;
 * the holding and date are immutable after creation.
 *
 * Request body (all optional):
 *   - balance: Numeric balance value
 *   - notes: Free-text notes
 *
 * Response: Updated snapshot object with holdingName and holdingType
 *
 * Errors:
 *   - 400 with { errors } for validation failures or invalid JSON
 *   - 401 if not authenticated
 *   - 404 if snapshot not found or doesn't belong to user
 */
export const PATCH = withAuth(async (request, context, userId) => {
  const { id } = await context.params;

  // Check if snapshot exists and belongs to user
  const existing = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      holdingName: holdings.name,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(snapshots.id, id),
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  let body: UpdateSnapshotBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate balance if provided
  if (body.balance !== undefined && body.balance !== null && body.balance !== "") {
    if (isNaN(Number(body.balance))) {
      errors.balance = "Balance must be a number";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Build update object - only balance and notes can be updated
  const updateData: Partial<{
    balance: string;
    notes: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (body.balance !== undefined) {
    updateData.balance = String(body.balance);
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes?.trim() || null;
  }

  const [updated] = await db
    .update(snapshots)
    .set(updateData)
    .where(eq(snapshots.id, id))
    .returning();

  return NextResponse.json({
    ...updated,
    holdingName: existing[0].holdingName,
    holdingType: existing[0].holdingType,
  });
}, "updating snapshot");

/**
 * DELETE /api/snapshots/:id
 *
 * Soft-deletes a snapshot by setting `deletedAt` timestamp. For super
 * holdings, also soft-deletes the associated contribution record for
 * the same holding + date (if one exists).
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if snapshot not found or doesn't belong to user
 */
export const DELETE = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Check if snapshot exists and belongs to user, get holdingId and date
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
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const snapshot = existing[0];
  const now = new Date();

  // Soft delete the snapshot
  await db
    .update(snapshots)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(snapshots.id, id));

  // For super holdings, also soft delete the associated contribution if it exists
  if (snapshot.holdingType === "super") {
    await db
      .update(contributions)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(contributions.holdingId, snapshot.holdingId),
          eq(contributions.date, snapshot.date),
          isNull(contributions.deletedAt)
        )
      );
  }

  return NextResponse.json({ success: true });
}, "deleting snapshot");
