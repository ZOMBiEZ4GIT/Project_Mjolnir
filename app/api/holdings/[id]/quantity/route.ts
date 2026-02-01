import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { calculateQuantityHeld } from "@/lib/calculations/quantity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the holding exists and belongs to the user
  const [holding] = await db
    .select({ id: holdings.id })
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const quantity = await calculateQuantityHeld(id);

  return NextResponse.json({ quantity });
}
