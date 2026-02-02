import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings, snapshots, type Holding } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { calculateCostBasis } from "@/lib/calculations/cost-basis";

// Valid values for validation
const currencies = ["AUD", "NZD", "USD"] as const;
const exchanges = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;

// Types that are tradeable (have cost basis)
const tradeableTypes = ["stock", "etf", "crypto"] as const;
// Snapshot types that use balance tracking
const snapshotTypes = ["super", "cash", "debt"] as const;

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

interface UpdateHoldingBody {
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
  isDormant?: boolean;
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
  const searchParams = request.nextUrl.searchParams;
  const includeCostBasis = searchParams.get("include_cost_basis") === "true";
  const includeLatestSnapshot = searchParams.get("include_latest_snapshot") === "true";

  const result = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (result.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const holding = result[0];

  // If neither cost basis nor snapshots requested, return just holding
  if (!includeCostBasis && !includeLatestSnapshot) {
    return NextResponse.json(holding);
  }

  const isTradeable = tradeableTypes.includes(holding.type as (typeof tradeableTypes)[number]);
  const isSnapshot = snapshotTypes.includes(holding.type as (typeof snapshotTypes)[number]);

  let quantity: number | null = null;
  let costBasis: number | null = null;
  let avgCost: number | null = null;
  let latestSnapshot: HoldingWithData["latestSnapshot"] = null;

  // Calculate cost basis for tradeable types if requested
  if (includeCostBasis && isTradeable) {
    const costBasisResult = await calculateCostBasis(holding.id);
    quantity = costBasisResult.quantity;
    costBasis = costBasisResult.costBasis;
    avgCost = costBasisResult.quantity > 0
      ? costBasisResult.costBasis / costBasisResult.quantity
      : null;
  }

  // Get latest snapshot for snapshot-type holdings if requested
  if (includeLatestSnapshot && isSnapshot) {
    const latestSnapshotResult = await db
      .select({
        id: snapshots.id,
        holdingId: snapshots.holdingId,
        date: snapshots.date,
        balance: snapshots.balance,
        currency: snapshots.currency,
      })
      .from(snapshots)
      .where(
        and(
          eq(snapshots.holdingId, holding.id),
          isNull(snapshots.deletedAt)
        )
      )
      .orderBy(desc(snapshots.date))
      .limit(1);

    latestSnapshot = latestSnapshotResult[0] || null;
  }

  const holdingWithData: HoldingWithData = {
    ...holding,
    quantity,
    costBasis,
    avgCost,
    latestSnapshot,
  };

  return NextResponse.json(holdingWithData);
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

  // First, check if the holding exists and belongs to the user
  const existing = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  let body: UpdateHoldingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate fields if provided
  if (body.name !== undefined && body.name.trim() === "") {
    errors.name = "Name cannot be empty";
  }

  if (body.currency !== undefined && !currencies.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${currencies.join(", ")}`;
  }

  if (body.exchange !== undefined && body.exchange !== null && body.exchange !== "") {
    if (!exchanges.includes(body.exchange as (typeof exchanges)[number])) {
      errors.exchange = `Exchange must be one of: ${exchanges.join(", ")}`;
    }
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Build update object
  const updateData: Partial<{
    name: string;
    symbol: string | null;
    currency: Currency;
    exchange: string | null;
    isDormant: boolean;
    notes: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) {
    updateData.name = body.name.trim();
  }
  if (body.symbol !== undefined) {
    updateData.symbol = body.symbol?.trim() || null;
  }
  if (body.currency !== undefined) {
    updateData.currency = body.currency as Currency;
  }
  if (body.exchange !== undefined) {
    updateData.exchange = body.exchange?.trim() || null;
  }
  if (body.isDormant !== undefined) {
    updateData.isDormant = body.isDormant;
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes?.trim() || null;
  }

  const [updated] = await db
    .update(holdings)
    .set(updateData)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId)
      )
    )
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

  // First, check if the holding exists and belongs to the user
  const existing = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  // Soft delete by setting deletedAt timestamp
  await db
    .update(holdings)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}
