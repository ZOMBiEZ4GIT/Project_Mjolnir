import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings, snapshots, contributions } from "@/lib/db/schema";
import { eq, isNull, and, inArray, desc, lt } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

// Valid snapshot types (non-tradeable holdings)
const snapshotTypes = ["super", "cash", "debt"] as const;

// Get first of current month
function getFirstOfCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Get first of previous month
function getFirstOfPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
}

// Validate that a month string is current or previous month only
function isValidMonth(month: string): boolean {
  const current = getFirstOfCurrentMonth();
  const previous = getFirstOfPreviousMonth();
  return month === current || month === previous;
}

// Format month for display (e.g., "February 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/**
 * GET /api/check-in/status
 *
 * Returns the check-in status for a given month, indicating which snapshot-type
 * holdings still need a balance update. Used by the check-in modal to determine
 * which fields to display and to pre-fill with previous values.
 *
 * Query parameters:
 *   - month: (optional) YYYY-MM-01 format. Defaults to current month.
 *     Must be current or previous month.
 *
 * Response:
 *   - needsCheckIn: Boolean, true if any holdings are missing snapshots
 *   - holdingsToUpdate: Count of holdings still needing a snapshot
 *   - totalSnapshotHoldings: Total count of snapshot-type holdings
 *   - currentMonth: Formatted month string (e.g. "February 2026")
 *   - holdings: Array of holdings missing snapshots for the month
 *   - latestContributions: Map of holdingId -> { employerContrib, employeeContrib }
 *     for active super holdings (used to pre-fill contribution fields)
 *   - previousBalances: Map of holdingId -> balance string from most recent
 *     prior snapshot (used to pre-fill balance fields)
 *
 * Errors:
 *   - 400 if month format is invalid or outside allowed range
 *   - 401 if not authenticated
 */
export const GET = withAuth(async (request, _context, userId) => {
  // Get month from query params, default to current month
  const searchParams = request.nextUrl.searchParams;
  const monthParam = searchParams.get("month");

  let targetMonth = getFirstOfCurrentMonth();

  if (monthParam) {
    // Validate month format and range
    if (!/^\d{4}-\d{2}-01$/.test(monthParam)) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM-01" },
        { status: 400 }
      );
    }
    if (!isValidMonth(monthParam)) {
      return NextResponse.json(
        { error: "Month must be current or previous month" },
        { status: 400 }
      );
    }
    targetMonth = monthParam;
  }

  const currentMonth = targetMonth;

  // Get all active snapshot-type holdings for the user
  const allSnapshotHoldings = await db
    .select({
      id: holdings.id,
      name: holdings.name,
      type: holdings.type,
      currency: holdings.currency,
      isDormant: holdings.isDormant,
    })
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        eq(holdings.isActive, true),
        isNull(holdings.deletedAt),
        inArray(holdings.type, [...snapshotTypes])
      )
    );

  if (allSnapshotHoldings.length === 0) {
    return NextResponse.json({
      needsCheckIn: false,
      holdingsToUpdate: 0,
      totalSnapshotHoldings: 0,
      currentMonth: formatMonthYear(currentMonth),
      holdings: [],
    });
  }

  // Get holding IDs that have snapshots for current month
  const holdingsWithSnapshot = await db
    .select({ holdingId: snapshots.holdingId })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.date, currentMonth),
        isNull(snapshots.deletedAt),
        inArray(
          snapshots.holdingId,
          allSnapshotHoldings.map((h) => h.id)
        )
      )
    );

  const holdingIdsWithSnapshot = new Set(
    holdingsWithSnapshot.map((s) => s.holdingId)
  );

  // Filter to holdings missing current month snapshot
  const holdingsMissingSnapshot = allSnapshotHoldings.filter(
    (h) => !holdingIdsWithSnapshot.has(h.id)
  );

  // Get latest contributions for active (non-dormant) super holdings
  const superHoldingIds = holdingsMissingSnapshot
    .filter((h) => h.type === "super" && !h.isDormant)
    .map((h) => h.id);

  const latestContributions: Record<string, { employerContrib: string; employeeContrib: string }> = {};

  if (superHoldingIds.length > 0) {
    // For each super holding, get the most recent contribution
    const allContribs = await db
      .select({
        holdingId: contributions.holdingId,
        date: contributions.date,
        employerContrib: contributions.employerContrib,
        employeeContrib: contributions.employeeContrib,
      })
      .from(contributions)
      .where(
        and(
          isNull(contributions.deletedAt),
          inArray(contributions.holdingId, superHoldingIds)
        )
      )
      .orderBy(desc(contributions.date));

    // Take the first (most recent) per holding
    for (const c of allContribs) {
      if (!latestContributions[c.holdingId]) {
        const employer = parseFloat(c.employerContrib);
        const employee = parseFloat(c.employeeContrib);
        if (employer > 0 || employee > 0) {
          latestContributions[c.holdingId] = {
            employerContrib: c.employerContrib,
            employeeContrib: c.employeeContrib,
          };
        }
      }
    }
  }

  // Get previous (most recent) snapshot balance for each holding
  const allHoldingIds = holdingsMissingSnapshot.map((h) => h.id);
  const previousBalances: Record<string, string> = {};

  if (allHoldingIds.length > 0) {
    const prevSnapshots = await db
      .select({
        holdingId: snapshots.holdingId,
        balance: snapshots.balance,
        date: snapshots.date,
      })
      .from(snapshots)
      .where(
        and(
          isNull(snapshots.deletedAt),
          inArray(snapshots.holdingId, allHoldingIds),
          lt(snapshots.date, currentMonth)
        )
      )
      .orderBy(desc(snapshots.date));

    // Take the first (most recent) per holding
    for (const s of prevSnapshots) {
      if (!previousBalances[s.holdingId]) {
        previousBalances[s.holdingId] = s.balance;
      }
    }
  }

  return NextResponse.json({
    needsCheckIn: holdingsMissingSnapshot.length > 0,
    holdingsToUpdate: holdingsMissingSnapshot.length,
    totalSnapshotHoldings: allSnapshotHoldings.length,
    currentMonth: formatMonthYear(currentMonth),
    holdings: holdingsMissingSnapshot,
    latestContributions,
    previousBalances,
  });
}, "fetching check-in status");
