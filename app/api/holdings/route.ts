import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings, snapshots, type NewHolding, type Holding } from "@/lib/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { calculateCostBasis } from "@/lib/calculations/cost-basis";

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
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // If neither cost basis nor snapshots requested, return just holdings
  if (!includeCostBasis && !includeLatestSnapshot) {
    return NextResponse.json(result);
  }

  // Get latest snapshots for snapshot-type holdings if requested
  let snapshotMap = new Map<string, {
    id: string;
    holdingId: string;
    date: string;
    balance: string;
    currency: string;
  }>();

  if (includeLatestSnapshot) {
    const snapshotHoldingIds = result
      .filter((h) => snapshotTypes.includes(h.type as (typeof snapshotTypes)[number]))
      .map((h) => h.id);

    if (snapshotHoldingIds.length > 0) {
      // Use a subquery to find the max date for each holding
      const latestDates = db
        .select({
          holdingId: snapshots.holdingId,
          maxDate: sql<string>`MAX(${snapshots.date})`.as("max_date"),
        })
        .from(snapshots)
        .where(
          and(
            sql`${snapshots.holdingId} IN (${sql.join(
              snapshotHoldingIds.map((id) => sql`${id}`),
              sql`, `
            )})`,
            isNull(snapshots.deletedAt)
          )
        )
        .groupBy(snapshots.holdingId)
        .as("latest_dates");

      const latestSnapshots = await db
        .select({
          id: snapshots.id,
          holdingId: snapshots.holdingId,
          date: snapshots.date,
          balance: snapshots.balance,
          currency: snapshots.currency,
        })
        .from(snapshots)
        .innerJoin(
          latestDates,
          and(
            eq(snapshots.holdingId, latestDates.holdingId),
            eq(snapshots.date, latestDates.maxDate)
          )
        )
        .where(isNull(snapshots.deletedAt));

      snapshotMap = new Map(
        latestSnapshots.map((s) => [s.holdingId, s])
      );
    }
  }

  // Build the response with cost basis and/or snapshots
  const holdingsWithData: HoldingWithData[] = await Promise.all(
    result.map(async (holding) => {
      const isTradeable = tradeableTypes.includes(holding.type as (typeof tradeableTypes)[number]);
      const isSnapshot = snapshotTypes.includes(holding.type as (typeof snapshotTypes)[number]);

      let quantity: number | null = null;
      let costBasis: number | null = null;
      let avgCost: number | null = null;

      // Calculate cost basis for tradeable types if requested
      if (includeCostBasis && isTradeable) {
        const costBasisResult = await calculateCostBasis(holding.id);
        quantity = costBasisResult.quantity;
        costBasis = costBasisResult.costBasis;
        avgCost = costBasisResult.quantity > 0
          ? costBasisResult.costBasis / costBasisResult.quantity
          : null;
      }

      return {
        ...holding,
        quantity,
        costBasis,
        avgCost,
        latestSnapshot: isSnapshot ? snapshotMap.get(holding.id) || null : null,
      };
    })
  );

  return NextResponse.json(holdingsWithData);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
