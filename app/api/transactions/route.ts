import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { transactions, holdings, type NewTransaction } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { calculateQuantityHeld } from "@/lib/calculations/quantity";

// Valid values for validation
const transactionActions = ["BUY", "SELL", "DIVIDEND", "SPLIT"] as const;
const currencies = ["AUD", "NZD", "USD"] as const;
const tradeableTypes = ["stock", "etf", "crypto"] as const;

type TransactionAction = (typeof transactionActions)[number];
type Currency = (typeof currencies)[number];

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

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");
  const action = searchParams.get("action");

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
  if (action && transactionActions.includes(action as TransactionAction)) {
    baseConditions.push(eq(transactions.action, action as TransactionAction));
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

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  } else if (!transactionActions.includes(body.action as TransactionAction)) {
    errors.action = `Action must be one of: ${transactionActions.join(", ")}`;
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
  } else if (!currencies.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${currencies.join(", ")}`;
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
    } else if (!tradeableTypes.includes(holding.type as (typeof tradeableTypes)[number])) {
      errors.holding_id = `Transactions can only be added to tradeable holdings (${tradeableTypes.join(", ")})`;
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
}
