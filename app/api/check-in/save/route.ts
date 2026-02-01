import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots, contributions, holdings, type NewSnapshot, type NewContribution } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// Valid snapshot types (non-tradeable holdings)
const snapshotTypes = ["super", "cash", "debt"] as const;

type Currency = "AUD" | "NZD" | "USD";

// Entry for a super holding with optional contributions
interface SuperEntry {
  holdingId: string;
  balance: string;
  employerContrib?: string;
  employeeContrib?: string;
}

// Entry for cash or debt holding (balance only)
interface BalanceEntry {
  holdingId: string;
  balance: string;
}

interface CheckInSaveBody {
  month: string; // YYYY-MM-01 format
  super?: SuperEntry[];
  cash?: BalanceEntry[];
  debt?: BalanceEntry[];
}

// Normalize date to first of month (YYYY-MM-01)
function normalizeToFirstOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// Check if date is current or previous month
function isValidSnapshotMonth(dateStr: string): boolean {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const snapshotDate = new Date(dateStr);
  const snapshotMonth = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), 1);

  return snapshotMonth.getTime() === currentMonth.getTime() ||
         snapshotMonth.getTime() === previousMonth.getTime();
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CheckInSaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate month
  if (!body.month) {
    errors.month = "Month is required";
  } else if (isNaN(Date.parse(body.month))) {
    errors.month = "Invalid date format";
  } else if (!isValidSnapshotMonth(body.month)) {
    errors.month = "Date must be current or previous month";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const normalizedDate = normalizeToFirstOfMonth(body.month);

  // Collect all holding IDs to validate
  const allHoldingIds = [
    ...(body.super?.map(s => s.holdingId) || []),
    ...(body.cash?.map(c => c.holdingId) || []),
    ...(body.debt?.map(d => d.holdingId) || []),
  ];

  if (allHoldingIds.length === 0) {
    return NextResponse.json(
      { error: "No entries provided" },
      { status: 400 }
    );
  }

  // Validate all holdings exist and belong to user
  const holdingsResult = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  const holdingsMap = new Map(holdingsResult.map(h => [h.id, h]));

  // Validate each holding
  for (const holdingId of allHoldingIds) {
    const holding = holdingsMap.get(holdingId);
    if (!holding) {
      errors[holdingId] = "Holding not found";
    } else if (!snapshotTypes.includes(holding.type as (typeof snapshotTypes)[number])) {
      errors[holdingId] = "Invalid holding type for snapshot";
    }
  }

  // Validate balance entries
  const validateBalanceEntry = (entry: BalanceEntry | SuperEntry, type: string) => {
    if (!entry.balance || entry.balance.trim() === "") {
      errors[entry.holdingId] = `${type} balance is required`;
    } else if (isNaN(Number(entry.balance))) {
      errors[entry.holdingId] = `${type} balance must be a number`;
    }
  };

  body.super?.forEach(entry => validateBalanceEntry(entry, "Super"));
  body.cash?.forEach(entry => validateBalanceEntry(entry, "Cash"));
  body.debt?.forEach(entry => validateBalanceEntry(entry, "Debt"));

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Check for existing snapshots (conflict detection)
  const existingSnapshots = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.date, normalizedDate),
        isNull(snapshots.deletedAt)
      )
    );

  const existingSnapshotHoldings = new Set(existingSnapshots.map(s => s.holdingId));

  // Filter out holdings that already have snapshots for this month
  const conflictHoldings: string[] = [];
  for (const holdingId of allHoldingIds) {
    if (existingSnapshotHoldings.has(holdingId)) {
      conflictHoldings.push(holdingId);
    }
  }

  if (conflictHoldings.length > 0) {
    return NextResponse.json(
      {
        error: "Some holdings already have snapshots for this month",
        conflictHoldings
      },
      { status: 409 }
    );
  }

  // Prepare snapshots to insert
  const snapshotsToInsert: NewSnapshot[] = [];
  const contributionsToInsert: NewContribution[] = [];

  // Process super entries
  for (const entry of body.super || []) {
    const holding = holdingsMap.get(entry.holdingId)!;

    snapshotsToInsert.push({
      holdingId: entry.holdingId,
      date: normalizedDate,
      balance: entry.balance,
      currency: holding.currency as Currency,
      notes: null,
    });

    // Add contribution if provided (only for non-dormant super)
    if (!holding.isDormant && (entry.employerContrib || entry.employeeContrib)) {
      contributionsToInsert.push({
        holdingId: entry.holdingId,
        date: normalizedDate,
        employerContrib: entry.employerContrib || "0",
        employeeContrib: entry.employeeContrib || "0",
        notes: null,
      });
    }
  }

  // Process cash entries
  for (const entry of body.cash || []) {
    const holding = holdingsMap.get(entry.holdingId)!;

    snapshotsToInsert.push({
      holdingId: entry.holdingId,
      date: normalizedDate,
      balance: entry.balance,
      currency: holding.currency as Currency,
      notes: null,
    });
  }

  // Process debt entries
  for (const entry of body.debt || []) {
    const holding = holdingsMap.get(entry.holdingId)!;

    snapshotsToInsert.push({
      holdingId: entry.holdingId,
      date: normalizedDate,
      balance: entry.balance,
      currency: holding.currency as Currency,
      notes: null,
    });
  }

  // Insert all snapshots
  const createdSnapshots = await db.insert(snapshots).values(snapshotsToInsert).returning();

  // Insert contributions if any
  let createdContributions: typeof contributions.$inferSelect[] = [];
  if (contributionsToInsert.length > 0) {
    createdContributions = await db.insert(contributions).values(contributionsToInsert).returning();
  }

  return NextResponse.json(
    {
      success: true,
      snapshotsCreated: createdSnapshots.length,
      contributionsCreated: createdContributions.length,
    },
    { status: 201 }
  );
}
