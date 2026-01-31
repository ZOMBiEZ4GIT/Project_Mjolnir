import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");

  // Build query with join to include holding info
  // Filter by user via the holdings table (ensures user only sees their own transactions)
  const baseConditions = [
    eq(holdings.userId, userId),
    isNull(holdings.deletedAt),
    isNull(transactions.deletedAt),
  ];

  if (holdingId) {
    baseConditions.push(eq(transactions.holdingId, holdingId));
  }

  const result = await db
    .select({
      id: transactions.id,
      holdingId: transactions.holdingId,
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      fees: transactions.fees,
      currency: transactions.currency,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      holding: {
        id: holdings.id,
        name: holdings.name,
        symbol: holdings.symbol,
        type: holdings.type,
        currency: holdings.currency,
        exchange: holdings.exchange,
      },
    })
    .from(transactions)
    .innerJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(and(...baseConditions))
    .orderBy(desc(transactions.date));

  return NextResponse.json(result);
}
