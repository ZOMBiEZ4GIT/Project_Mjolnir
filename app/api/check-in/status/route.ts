import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings, snapshots } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";

// Valid snapshot types (non-tradeable holdings)
const snapshotTypes = ["super", "cash", "debt"] as const;

// Get first of current month
function getFirstOfCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Format month for display (e.g., "February 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentMonth = getFirstOfCurrentMonth();

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

  return NextResponse.json({
    needsCheckIn: holdingsMissingSnapshot.length > 0,
    holdingsToUpdate: holdingsMissingSnapshot.length,
    totalSnapshotHoldings: allSnapshotHoldings.length,
    currentMonth: formatMonthYear(currentMonth),
    holdings: holdingsMissingSnapshot,
  });
}
