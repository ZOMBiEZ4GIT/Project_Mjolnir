import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
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

  // Query transaction with holding join to verify user ownership
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
    .where(
      and(
        eq(transactions.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt),
        isNull(transactions.deletedAt)
      )
    );

  if (result.length === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
