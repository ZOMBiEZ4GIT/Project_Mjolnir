import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";

interface UpdateTransactionBody {
  date?: string;
  quantity?: number | string;
  unit_price?: number | string;
  fees?: number | string;
  notes?: string;
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // First, get the existing transaction to verify ownership and get current data
  const [existingTransaction] = await db
    .select({
      id: transactions.id,
      holdingId: transactions.holdingId,
      action: transactions.action,
      quantity: transactions.quantity,
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

  if (!existingTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  let body: UpdateTransactionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};
  const updates: Record<string, unknown> = {};

  // Validate and prepare updates for each field
  if (body.date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      errors.date = "Date must be in YYYY-MM-DD format";
    } else {
      const parsedDate = new Date(body.date);
      if (isNaN(parsedDate.getTime())) {
        errors.date = "Invalid date";
      } else {
        updates.date = body.date;
      }
    }
  }

  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "") {
    const qty = Number(body.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = "Quantity must be a positive number";
    } else {
      updates.quantity = String(body.quantity);
    }
  }

  if (body.unit_price !== undefined && body.unit_price !== null && body.unit_price !== "") {
    const price = Number(body.unit_price);
    if (isNaN(price) || price < 0) {
      errors.unit_price = "Unit price must be a non-negative number";
    } else {
      updates.unitPrice = String(body.unit_price);
    }
  }

  if (body.fees !== undefined && body.fees !== null && body.fees !== "") {
    const feesNum = Number(body.fees);
    if (isNaN(feesNum) || feesNum < 0) {
      errors.fees = "Fees must be a non-negative number";
    } else {
      updates.fees = String(body.fees);
    }
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes?.trim() || null;
  }

  // For SELL action: validate that updated sell quantity doesn't exceed current holdings
  // We need to calculate holdings EXCLUDING this transaction to get available quantity
  if (existingTransaction.action === "SELL" && updates.quantity && !errors.quantity) {
    // Calculate current quantity excluding this transaction
    const allTransactions = await db
      .select({
        id: transactions.id,
        action: transactions.action,
        quantity: transactions.quantity,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.holdingId, existingTransaction.holdingId),
          isNull(transactions.deletedAt),
          ne(transactions.id, id) // Exclude the current transaction
        )
      )
      .orderBy(transactions.date);

    // Calculate quantity held without this transaction
    let quantityWithoutThis = 0;
    for (const txn of allTransactions) {
      const txnQuantity = Number(txn.quantity);
      switch (txn.action) {
        case "BUY":
          quantityWithoutThis += txnQuantity;
          break;
        case "SELL":
          quantityWithoutThis -= txnQuantity;
          break;
        case "SPLIT":
          quantityWithoutThis *= txnQuantity;
          break;
        case "DIVIDEND":
          // No effect
          break;
      }
    }

    const newSellQuantity = Number(updates.quantity);
    if (newSellQuantity > quantityWithoutThis) {
      errors.quantity = "Sell quantity exceeds holdings";
    }
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // If no updates provided, return the existing transaction unchanged
  if (Object.keys(updates).length === 0) {
    const [current] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return NextResponse.json(current);
  }

  // Add updatedAt timestamp
  updates.updatedAt = new Date();

  // Perform the update
  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .returning();

  return NextResponse.json(updated);
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

  // Verify the transaction exists and belongs to the user
  const [existingTransaction] = await db
    .select({
      id: transactions.id,
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

  if (!existingTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Soft delete: set deleted_at timestamp
  const [deleted] = await db
    .update(transactions)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(transactions.id, id))
    .returning();

  return NextResponse.json(deleted);
}
