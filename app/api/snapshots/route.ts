import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots, holdings } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");

  // Build conditions
  const conditions = [
    eq(holdings.userId, userId),
    isNull(snapshots.deletedAt),
    isNull(holdings.deletedAt),
  ];

  if (holdingId) {
    conditions.push(eq(snapshots.holdingId, holdingId));
  }

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
    .where(and(...conditions))
    .orderBy(desc(snapshots.date));

  return NextResponse.json(result);
}
