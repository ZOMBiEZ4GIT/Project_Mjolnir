import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, holdings, type NewTransaction } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { calculateQuantityHeld } from "@/lib/calculations/quantity";
import { withAuth } from "@/lib/utils/with-auth";
import {
  TRANSACTION_ACTIONS,
  CURRENCIES,
  TRADEABLE_TYPES,
  type TransactionAction,
  type Currency,
} from "@/lib/constants";

interface CreateTransactionBody {
  holding_id?: string;
  date?: string;
  action?: string;
  quantity?: number | string;
  unit_price?: number | string;
  fees?: number | string;
  currency?: string;
  notes?: string;
}

/**
 * GET /api/transactions
 *
 * Returns transactions for the authenticated user, ordered by date descending.
 * Joins with holdings to include holding info and enforce user ownership.
 *
 * Query parameters:
 *   - holding_id: Filter to a specific holding's transactions
 *   - action: Filter by action type ("BUY" | "SELL" | "DIVIDEND" | "SPLIT")
 *   - currency: Filter by currency ("AUD" | "NZD" | "USD")
 *
 * Response: Array of transaction objects with nested holding info
 *   { id, holdingId, date, action, quantity, unitPrice, fees, currency,
 *     notes, createdAt, updatedAt, holding: { id, name, symbol, type, currency, exchange } }
 *
 * Errors:
 *   - 401 if not authenticated
 */
export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");
  const action = searchParams.get("action");
  const currency = searchParams.get("currency");

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

  // Filter by action type if provided and valid
  if (action && TRANSACTION_ACTIONS.includes(action as TransactionAction)) {
    baseConditions.push(eq(transactions.action, action as TransactionAction));
  }

  // Filter by currency if provided and valid
  if (currency && CURRENCIES.includes(currency as Currency)) {
    baseConditions.push(eq(transactions.currency, currency as Currency));
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
}, "fetching transactions");

/**
 * POST /api/transactions
 *
 * Creates a new BUY/SELL/DIVIDEND/SPLIT transaction for a tradeable holding.
 *
 * Request body:
 *   - holding_id: (required) UUID of the parent holding
 *   - date: (required) YYYY-MM-DD format
 *   - action: (required) "BUY" | "SELL" | "DIVIDEND" | "SPLIT"
 *   - quantity: (required) Positive number
 *   - unit_price: (required) Non-negative number
 *   - currency: (required) "AUD" | "NZD" | "USD"
 *   - fees: (optional) Non-negative number (defaults to 0)
 *   - notes: (optional) Free-text notes
 *
 * Validation:
 *   - Holding must exist, belong to user, and be a tradeable type
 *   - For SELL: quantity must not exceed current quantity held
 *
 * Response: 201 with the created Transaction object
 *
 * Errors:
 *   - 400 with { errors } for validation failures or invalid JSON
 *   - 401 if not authenticated
 */
export const POST = withAuth(async (request, _context, userId) => {
  let body: CreateTransactionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate required fields
  if (!body.holding_id) {
    errors.holding_id = "Holding ID is required";
  }

  if (!body.date) {
    errors.date = "Date is required";
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      errors.date = "Date must be in YYYY-MM-DD format";
    } else {
      const parsedDate = new Date(body.date);
      if (isNaN(parsedDate.getTime())) {
        errors.date = "Invalid date";
      }
    }
  }

  if (!body.action) {
    errors.action = "Action is required";
  } else if (!TRANSACTION_ACTIONS.includes(body.action as TransactionAction)) {
    errors.action = `Action must be one of: ${TRANSACTION_ACTIONS.join(", ")}`;
  }

  if (body.quantity === undefined || body.quantity === null || body.quantity === "") {
    errors.quantity = "Quantity is required";
  } else {
    const qty = Number(body.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = "Quantity must be a positive number";
    }
  }

  if (body.unit_price === undefined || body.unit_price === null || body.unit_price === "") {
    errors.unit_price = "Unit price is required";
  } else {
    const price = Number(body.unit_price);
    if (isNaN(price) || price < 0) {
      errors.unit_price = "Unit price must be a non-negative number";
    }
  }

  if (!body.currency) {
    errors.currency = "Currency is required";
  } else if (!CURRENCIES.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${CURRENCIES.join(", ")}`;
  }

  // Validate fees if provided
  if (body.fees !== undefined && body.fees !== null && body.fees !== "") {
    const feesNum = Number(body.fees);
    if (isNaN(feesNum) || feesNum < 0) {
      errors.fees = "Fees must be a non-negative number";
    }
  }

  // If we have a holding_id, validate it exists and is tradeable
  if (body.holding_id && !errors.holding_id) {
    const [holding] = await db
      .select()
      .from(holdings)
      .where(
        and(
          eq(holdings.id, body.holding_id),
          eq(holdings.userId, userId),
          isNull(holdings.deletedAt)
        )
      );

    if (!holding) {
      errors.holding_id = "Holding not found";
    } else if (!TRADEABLE_TYPES.includes(holding.type as (typeof TRADEABLE_TYPES)[number])) {
      errors.holding_id = `Transactions can only be added to tradeable holdings (${TRADEABLE_TYPES.join(", ")})`;
    }
  }

  // For SELL action: validate that sell quantity doesn't exceed current holdings
  if (
    body.action === "SELL" &&
    body.holding_id &&
    !errors.holding_id &&
    !errors.quantity
  ) {
    const currentQuantity = await calculateQuantityHeld(body.holding_id);
    const sellQuantity = Number(body.quantity);

    if (sellQuantity > currentQuantity) {
      errors.quantity = "Sell quantity exceeds holdings";
    }
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Create the transaction
  const newTransaction: NewTransaction = {
    holdingId: body.holding_id!,
    date: body.date!,
    action: body.action as TransactionAction,
    quantity: String(body.quantity),
    unitPrice: String(body.unit_price),
    fees: body.fees !== undefined && body.fees !== null && body.fees !== ""
      ? String(body.fees)
      : "0",
    currency: body.currency as Currency,
    notes: body.notes?.trim() || null,
  };

  const [created] = await db.insert(transactions).values(newTransaction).returning();

  return NextResponse.json(created, { status: 201 });
}, "creating transaction");
