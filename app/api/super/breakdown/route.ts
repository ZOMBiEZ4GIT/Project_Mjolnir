import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots, contributions, holdings } from "@/lib/db/schema";
import { eq, and, isNull, desc, gte, lte } from "drizzle-orm";

interface MonthlyBreakdown {
  date: string;
  employerContrib: number;
  employeeContrib: number;
  investmentReturns: number;
  balance: number;
  holdingId?: string;
  holdingName?: string;
}

/**
 * GET /api/super/breakdown
 *
 * Returns super fund growth breakdown data for the authenticated user.
 *
 * Query parameters:
 *   - holdingId: Optional UUID of a specific super holding
 *   - months: Number of months of history (default 12, max 60)
 *
 * Response:
 *   - breakdown: Array of monthly data with contributions and investment returns
 *   - holdings: Array of super holdings included in the breakdown
 *   - generatedAt: Timestamp when calculation was performed
 *
 * The investment returns are calculated as:
 *   investment_returns = (new_balance - old_balance) - employer_contrib - employee_contrib
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const holdingIdParam = searchParams.get("holdingId");
  const monthsParam = searchParams.get("months");

  // Parse months parameter with validation
  let months = 12;
  if (monthsParam) {
    const parsed = parseInt(monthsParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "Invalid months parameter. Must be a positive integer." },
        { status: 400 }
      );
    }
    months = Math.min(parsed, 60);
  }

  // Calculate date range
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - months);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  try {
    // Build conditions for super holdings query
    const holdingConditions = [
      eq(holdings.userId, userId),
      eq(holdings.type, "super"),
      isNull(holdings.deletedAt),
    ];

    if (holdingIdParam) {
      holdingConditions.push(eq(holdings.id, holdingIdParam));
    }

    // Get super holdings
    const superHoldings = await db
      .select({
        id: holdings.id,
        name: holdings.name,
        currency: holdings.currency,
        isDormant: holdings.isDormant,
      })
      .from(holdings)
      .where(and(...holdingConditions));

    if (superHoldings.length === 0) {
      return NextResponse.json({
        breakdown: [],
        holdings: [],
        generatedAt: new Date().toISOString(),
      });
    }

    const holdingIds = superHoldings.map((h) => h.id);

    // Get snapshots for all super holdings in date range
    const snapshotData = await db
      .select({
        id: snapshots.id,
        holdingId: snapshots.holdingId,
        date: snapshots.date,
        balance: snapshots.balance,
      })
      .from(snapshots)
      .where(
        and(
          isNull(snapshots.deletedAt),
          gte(snapshots.date, startDateStr),
          lte(snapshots.date, endDateStr)
        )
      )
      .orderBy(desc(snapshots.date));

    // Filter to only our holdings
    const filteredSnapshots = snapshotData.filter((s) =>
      holdingIds.includes(s.holdingId)
    );

    // Get contributions for all super holdings in date range
    const contributionData = await db
      .select({
        id: contributions.id,
        holdingId: contributions.holdingId,
        date: contributions.date,
        employerContrib: contributions.employerContrib,
        employeeContrib: contributions.employeeContrib,
      })
      .from(contributions)
      .where(
        and(
          isNull(contributions.deletedAt),
          gte(contributions.date, startDateStr),
          lte(contributions.date, endDateStr)
        )
      )
      .orderBy(desc(contributions.date));

    // Filter to only our holdings
    const filteredContributions = contributionData.filter((c) =>
      holdingIds.includes(c.holdingId)
    );

    // Build a map of snapshots by holding and date for easy lookup
    const snapshotMap = new Map<string, Map<string, number>>();
    for (const snapshot of filteredSnapshots) {
      if (!snapshotMap.has(snapshot.holdingId)) {
        snapshotMap.set(snapshot.holdingId, new Map());
      }
      snapshotMap
        .get(snapshot.holdingId)!
        .set(snapshot.date, Number(snapshot.balance));
    }

    // Build a map of contributions by holding and date
    const contributionMap = new Map<
      string,
      Map<string, { employer: number; employee: number }>
    >();
    for (const contrib of filteredContributions) {
      if (!contributionMap.has(contrib.holdingId)) {
        contributionMap.set(contrib.holdingId, new Map());
      }
      contributionMap.get(contrib.holdingId)!.set(contrib.date, {
        employer: Number(contrib.employerContrib),
        employee: Number(contrib.employeeContrib),
      });
    }

    // Generate monthly breakdown
    const breakdown: MonthlyBreakdown[] = [];

    // If specific holding, calculate per-holding breakdown
    if (holdingIdParam) {
      const holding = superHoldings[0];
      const holdingSnapshots = snapshotMap.get(holding.id) || new Map();
      const holdingContribs = contributionMap.get(holding.id) || new Map();

      // Get all snapshot dates for this holding, sorted chronologically
      const dates = Array.from(holdingSnapshots.keys()).sort();

      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const balance = holdingSnapshots.get(date) || 0;
        const contrib = holdingContribs.get(date) || { employer: 0, employee: 0 };

        // Calculate investment returns (need previous balance)
        let investmentReturns = 0;
        if (i > 0) {
          const prevDate = dates[i - 1];
          const prevBalance = holdingSnapshots.get(prevDate) || 0;
          const balanceChange = balance - prevBalance;
          const totalContrib = contrib.employer + contrib.employee;
          investmentReturns = balanceChange - totalContrib;
        }

        breakdown.push({
          date,
          employerContrib: contrib.employer,
          employeeContrib: contrib.employee,
          investmentReturns,
          balance,
          holdingId: holding.id,
          holdingName: holding.name,
        });
      }
    } else {
      // Aggregate across all super holdings
      // Get unique dates across all holdings
      const allDates = new Set<string>();
      for (const holdingId of holdingIds) {
        const holdingSnapshots = snapshotMap.get(holdingId);
        if (holdingSnapshots) {
          for (const date of holdingSnapshots.keys()) {
            allDates.add(date);
          }
        }
      }

      const sortedDates = Array.from(allDates).sort();

      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];

        let totalEmployer = 0;
        let totalEmployee = 0;
        let totalInvestmentReturns = 0;
        let totalBalance = 0;

        for (const holdingId of holdingIds) {
          const holdingSnapshots = snapshotMap.get(holdingId) || new Map();
          const holdingContribs = contributionMap.get(holdingId) || new Map();

          const balance = holdingSnapshots.get(date) || 0;
          const contrib = holdingContribs.get(date) || {
            employer: 0,
            employee: 0,
          };

          totalEmployer += contrib.employer;
          totalEmployee += contrib.employee;
          totalBalance += balance;

          // Calculate investment returns for this holding
          // Find the previous date for this specific holding
          const holdingDates = Array.from(holdingSnapshots.keys()).sort();
          const currentIndex = holdingDates.indexOf(date);
          if (currentIndex > 0) {
            const prevDate = holdingDates[currentIndex - 1];
            const prevBalance = holdingSnapshots.get(prevDate) || 0;
            const balanceChange = balance - prevBalance;
            const totalContrib = contrib.employer + contrib.employee;
            totalInvestmentReturns += balanceChange - totalContrib;
          }
        }

        breakdown.push({
          date,
          employerContrib: totalEmployer,
          employeeContrib: totalEmployee,
          investmentReturns: totalInvestmentReturns,
          balance: totalBalance,
        });
      }
    }

    return NextResponse.json({
      breakdown,
      holdings: superHoldings.map((h) => ({
        id: h.id,
        name: h.name,
        currency: h.currency,
        isDormant: h.isDormant,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating super breakdown:", error);
    return NextResponse.json(
      { error: "Failed to calculate super breakdown" },
      { status: 500 }
    );
  }
}
