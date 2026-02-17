import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings, snapshots } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { calculateCostBasis } from "@/lib/calculations/cost-basis";
import { withAuth } from "@/lib/utils/with-auth";
import {
  CURRENCIES,
  EXCHANGES,
  TRADEABLE_TYPES,
  SNAPSHOT_TYPES,
  type Currency,
  type HoldingWithData,
} from "@/lib/constants";

interface UpdateHoldingBody {
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
  isDormant?: boolean;
  notes?: string;
}

/**
 * GET /api/holdings/:id
 *
 * Returns a single holding by ID, scoped to the authenticated user.
 *
 * Query parameters:
 *   - include_cost_basis: If "true", returns quantity, costBasis, avgCost
 *     for tradeable holdings (stock, etf, crypto)
 *   - include_latest_snapshot: If "true", returns the most recent snapshot
 *     for snapshot-type holdings (super, cash, debt)
 *
 * Response: Holding object, optionally extended with cost basis / snapshot data
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if holding not found or doesn't belong to user
 */
export const GET = withAuth(async (request, context, userId) => {
  const { id } = await context.params;
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

  const isTradeable = TRADEABLE_TYPES.includes(holding.type as (typeof TRADEABLE_TYPES)[number]);
  const isSnapshot = SNAPSHOT_TYPES.includes(holding.type as (typeof SNAPSHOT_TYPES)[number]);

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
}, "fetching holding");

/**
 * PATCH /api/holdings/:id
 *
 * Partially updates a holding. Only provided fields are changed.
 *
 * Request body (all optional):
 *   - name: New display name
 *   - symbol: New ticker symbol
 *   - currency: "AUD" | "NZD" | "USD"
 *   - exchange: "ASX" | "NZX" | "NYSE" | "NASDAQ" (or null to clear)
 *   - isDormant: Boolean
 *   - notes: Free-text notes (or null to clear)
 *
 * Response: Updated Holding object
 *
 * Errors:
 *   - 400 with { errors } for validation failures or invalid JSON
 *   - 401 if not authenticated
 *   - 404 if holding not found or doesn't belong to user
 */
export const PATCH = withAuth(async (request, context, userId) => {
  const { id } = await context.params;

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

  if (body.currency !== undefined && !CURRENCIES.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${CURRENCIES.join(", ")}`;
  }

  if (body.exchange !== undefined && body.exchange !== null && body.exchange !== "") {
    if (!EXCHANGES.includes(body.exchange as (typeof EXCHANGES)[number])) {
      errors.exchange = `Exchange must be one of: ${EXCHANGES.join(", ")}`;
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
}, "updating holding");

/**
 * DELETE /api/holdings/:id
 *
 * Soft-deletes a holding by setting `deletedAt` timestamp. The holding
 * and its associated data remain in the database but are excluded from
 * all queries.
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if holding not found or doesn't belong to user
 */
export const DELETE = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

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
}, "deleting holding");
