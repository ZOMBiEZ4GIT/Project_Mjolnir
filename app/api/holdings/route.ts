import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const includeDormant = searchParams.get("include_dormant") === "true";

  const conditions = [
    eq(holdings.userId, userId),
    isNull(holdings.deletedAt),
  ];

  if (!includeDormant) {
    conditions.push(eq(holdings.isDormant, false));
  }

  const result = await db
    .select()
    .from(holdings)
    .where(and(...conditions));

  return NextResponse.json(result);
}
