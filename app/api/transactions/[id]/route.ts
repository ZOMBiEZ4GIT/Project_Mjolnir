import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

interface UpdateTransactionBody {
  date?: string;
  quantity?: number | string;
  unit_price?: number | string;
  fees?: number | string;
  notes?: string;
}

/**
 * GET /api/transactions/:id
 *
 * Returns a single transaction by ID with nested holding info.
 * Ownership is validated via the parent holding's userId.
 *
 * Response: Transaction object with nested holding
 *   { id, holdingId, date, action, quantity, unitPrice, fees, currency,
 *     notes, createdAt, updatedAt, holding: { id, name, symbol, type, currency, exchange } }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if transaction not found or doesn't belong to user
 */
export const GET = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

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
}, "fetching transaction");

/**
 * PATCH /api/transactions/:id
 *
 * Partially updates a transaction. Only provided fields are changed.
 * Action and holding_id cannot be changed after creation.
 *
 * Request body (all optional):
 *   - date: YYYY-MM-DD format
 *   - quantity: Positive number
 *   - unit_price: Non-negative number
 *   - fees: Non-negative number
 *   - notes: Free-text notes
 *
 * Validation:
 *   - For SELL transactions: updated quantity must not exceed available holdings
 *     (calculated excluding the current transaction)
 *
 * Response: Updated Transaction object
 *
 * Errors:
 *   - 400 with { errors } for validation failures or invalid JSON
 *   - 401 if not authenticated
 *   - 404 if transaction not found or doesn't belong to user
 */
export const PATCH = withAuth(async (request, context, userId) => {
  const { id } = await context.params;

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
}, "updating transaction");

/**
 * DELETE /api/transactions/:id
 *
 * Soft-deletes a transaction by setting `deletedAt` timestamp.
 *
 * Response: The soft-deleted Transaction object (with deletedAt set)
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if transaction not found or doesn't belong to user
 */
export const DELETE = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

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
}, "deleting transaction");
