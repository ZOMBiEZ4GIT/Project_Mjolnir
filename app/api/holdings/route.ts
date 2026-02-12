import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { holdings, snapshots, type NewHolding, type Holding } from "@/lib/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { calculateCostBasis } from "@/lib/calculations/cost-basis";
import { withAuth } from "@/lib/utils/with-auth";

// Valid holding types
const holdingTypes = ["stock", "etf", "crypto", "super", "cash", "debt"] as const;
const currencies = ["AUD", "NZD", "USD"] as const;
const exchanges = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;

// Types that require a symbol
const tradeableTypes = ["stock", "etf", "crypto"] as const;
// Types that require an exchange
const exchangeRequiredTypes = ["stock", "etf"] as const;
// Snapshot types that use balance tracking
const snapshotTypes = ["super", "cash", "debt"] as const;

type HoldingType = (typeof holdingTypes)[number];
type Currency = (typeof currencies)[number];

// Extended holding type with cost basis and snapshot data
interface HoldingWithData extends Holding {
  // Cost basis data (for tradeable holdings)
  quantity: number | null;
  costBasis: number | null;
  avgCost: number | null;
  // Snapshot data (for snapshot holdings)
  latestSnapshot: {
    id: string;
    holdingId: string;
    date: string;
    balance: string;
    currency: string;
  } | null;
}

interface CreateHoldingBody {
  type?: string;
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
  isDormant?: boolean;
  notes?: string;
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session;

  const searchParams = request.nextUrl.searchParams;
  const includeDormant = searchParams.get("include_dormant") === "true";
  const includeCostBasis = searchParams.get("include_cost_basis") === "true";
  const includeLatestSnapshot = searchParams.get("include_latest_snapshot") === "true";

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

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session;

  let body: CreateHoldingBody;
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
  if (!body.type) {
    errors.type = "Type is required";
  } else if (!holdingTypes.includes(body.type as HoldingType)) {
    errors.type = `Type must be one of: ${holdingTypes.join(", ")}`;
  }

  if (!body.name || body.name.trim() === "") {
    errors.name = "Name is required";
  }

  if (!body.currency) {
    errors.currency = "Currency is required";
  } else if (!currencies.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${currencies.join(", ")}`;
  }

  // Validate symbol is required for tradeable types
  const isTradeable = tradeableTypes.includes(body.type as (typeof tradeableTypes)[number]);
  if (isTradeable && (!body.symbol || body.symbol.trim() === "")) {
    errors.symbol = "Symbol is required for stock, etf, and crypto holdings";
  }

  // Validate exchange is required for stock/etf types
  const requiresExchange = exchangeRequiredTypes.includes(body.type as (typeof exchangeRequiredTypes)[number]);
  if (requiresExchange) {
    if (!body.exchange) {
      errors.exchange = "Exchange is required for stock and etf holdings";
    } else if (!exchanges.includes(body.exchange as (typeof exchanges)[number])) {
      errors.exchange = `Exchange must be one of: ${exchanges.join(", ")}`;
    }
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Create the holding
  const newHolding: NewHolding = {
    userId,
    type: body.type as HoldingType,
    name: body.name!.trim(),
    currency: body.currency as Currency,
    symbol: isTradeable ? body.symbol!.trim() : null,
    exchange: requiresExchange ? body.exchange : null,
    isDormant: body.isDormant ?? false,
    notes: body.notes?.trim() || null,
  };

  const [created] = await db.insert(holdings).values(newHolding).returning();

  return NextResponse.json(created, { status: 201 });
}, "creating holding");
