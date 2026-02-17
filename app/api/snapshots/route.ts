import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { snapshots, holdings, type NewSnapshot } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import {
  SNAPSHOT_TYPES,
  CURRENCIES,
  type Currency,
  normalizeToFirstOfMonth,
  isValidSnapshotMonth,
} from "@/lib/constants";

interface CreateSnapshotBody {
  holding_id?: string;
  date?: string;
  balance?: string | number;
  currency?: string;
  notes?: string;
}

/**
 * GET /api/snapshots
 *
 * Returns snapshots for the authenticated user, ordered by date descending.
 * Joins with holdings to include holding name/type and enforce user ownership.
 *
 * Query parameters:
 *   - holding_id: Filter to a specific holding's snapshots
 *
 * Response: Array of snapshot objects
 *   { id, holdingId, date, balance, currency, notes, createdAt, updatedAt,
 *     holdingName, holdingType }
 *
 * Errors:
 *   - 401 if not authenticated
 */
export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");

  // Build conditions
  const conditions = [
    eq(holdings.userId, userId),
    isNull(snapshots.deletedAt),
    isNull(holdings.deletedAt),
  ];

  if (holdingId) {
    conditions.push(eq(snapshots.holdingId, holdingId));
  }

  // Query with inner join to include holding info and validate ownership
  const result = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      balance: snapshots.balance,
      currency: snapshots.currency,
      notes: snapshots.notes,
      createdAt: snapshots.createdAt,
      updatedAt: snapshots.updatedAt,
      holdingName: holdings.name,
      holdingType: holdings.type,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(and(...conditions))
    .orderBy(desc(snapshots.date));

  return NextResponse.json(result);
}, "fetching snapshots");

/**
 * POST /api/snapshots
 *
 * Creates a point-in-time balance snapshot for a non-tradeable holding.
 * Dates are normalized to the first of the month (YYYY-MM-01).
 *
 * Request body:
 *   - holding_id: (required) UUID of the parent holding
 *   - date: (required) Date string (normalized to YYYY-MM-01)
 *   - balance: (required) Numeric balance value
 *   - currency: (required) "AUD" | "NZD" | "USD"
 *   - notes: (optional) Free-text notes
 *
 * Validation:
 *   - Holding must exist, belong to user, and be a snapshot type (super/cash/debt)
 *   - Date must be current or previous month
 *   - No duplicate snapshot for the same holding + month (returns 409)
 *
 * Response: 201 with created snapshot + holdingName, holdingType
 *
 * Errors:
 *   - 400 with { errors } for validation failures
 *   - 401 if not authenticated
 *   - 409 if snapshot already exists for this holding and month
 */
export const POST = withAuth(async (request, _context, userId) => {
  let body: CreateSnapshotBody;
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
  } else if (isNaN(Date.parse(body.date))) {
    errors.date = "Invalid date format";
  } else if (!isValidSnapshotMonth(body.date)) {
    errors.date = "Date must be current or previous month";
  }

  if (body.balance === undefined || body.balance === null || body.balance === "") {
    errors.balance = "Balance is required";
  } else if (isNaN(Number(body.balance))) {
    errors.balance = "Balance must be a number";
  }

  if (!body.currency) {
    errors.currency = "Currency is required";
  } else if (!CURRENCIES.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${CURRENCIES.join(", ")}`;
  }

  // Return early if basic validation fails
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Validate holding exists, belongs to user, and is a snapshot type
  const holdingResult = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, body.holding_id!),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (holdingResult.length === 0) {
    return NextResponse.json(
      { errors: { holding_id: "Holding not found" } },
      { status: 400 }
    );
  }

  const holding = holdingResult[0];
  if (!SNAPSHOT_TYPES.includes(holding.type as (typeof SNAPSHOT_TYPES)[number])) {
    return NextResponse.json(
      { errors: { holding_id: "Holding must be of type super, cash, or debt" } },
      { status: 400 }
    );
  }

  // Normalize date to first of month
  const normalizedDate = normalizeToFirstOfMonth(body.date!);

  // Check for duplicate (same holding, same month)
  const existingSnapshot = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.holdingId, body.holding_id!),
        eq(snapshots.date, normalizedDate),
        isNull(snapshots.deletedAt)
      )
    );

  if (existingSnapshot.length > 0) {
    return NextResponse.json(
      { error: "Snapshot already exists for this holding and month" },
      { status: 409 }
    );
  }

  // Create the snapshot
  const newSnapshot: NewSnapshot = {
    holdingId: body.holding_id!,
    date: normalizedDate,
    balance: String(body.balance),
    currency: body.currency as Currency,
    notes: body.notes?.trim() || null,
  };

  const [created] = await db.insert(snapshots).values(newSnapshot).returning();

  // Return with holding info
  return NextResponse.json(
    {
      ...created,
      holdingName: holding.name,
      holdingType: holding.type,
    },
    { status: 201 }
  );
}, "creating snapshot");
