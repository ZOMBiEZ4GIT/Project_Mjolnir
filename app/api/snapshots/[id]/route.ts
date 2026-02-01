import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots, holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}

interface UpdateSnapshotBody {
  balance?: string | number;
  notes?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if snapshot exists and belongs to user
  const existing = await db
    .select({
      id: snapshots.id,
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

  // Soft delete by setting deletedAt timestamp
  await db
    .update(snapshots)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(snapshots.id, id));

  return NextResponse.json({ success: true });
}
