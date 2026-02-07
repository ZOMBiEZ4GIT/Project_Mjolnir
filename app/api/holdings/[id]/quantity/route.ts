import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { calculateQuantityHeld } from "@/lib/calculations/quantity";
import { withAuth } from "@/lib/utils/with-auth";

export const GET = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

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
}, "fetching holding quantity");
