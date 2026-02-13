import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  budgetPeriods,
  budgetSavers,
  budgetCategories,
  upTransactions,
  goals,
} from "@/lib/db/schema";
import { and, eq, gte, lte, lt, isNull, sql, asc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { ensureCurrentPeriodExists } from "@/lib/budget/payday";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PaceStatus = "under" | "on" | "over";

interface CategorySummary {
  categoryKey: string | null;
  displayName: string;
  budgetCents: number;
  actualCents: number;
}

interface SaverSummary {
  saverKey: string;
  displayName: string;
  emoji: string;
  colour: string;
  budgetCents: number;
  actualCents: number;
  percentUsed: number;
  paceStatus: PaceStatus;
  projectedEndCents: number;
  categories: CategorySummary[];
}

interface GoalSummary {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents: number;
  targetDate: string | null;
  status: string;
  percentComplete: number;
  colour: string | null;
  icon: string | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function getPaceStatus(
  percentUsed: number,
  progressPercent: number
): PaceStatus {
  if (percentUsed > progressPercent) return "over";
  if (percentUsed >= progressPercent * 0.85) return "on";
  return "under";
}

// -----------------------------------------------------------------------------
// GET /api/budget/summary
// -----------------------------------------------------------------------------

export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const periodId = searchParams.get("period_id");

  // Resolve the period ID (auto-create current period if needed)
  let resolvedPeriodId: string;
  if (periodId) {
    resolvedPeriodId = periodId;
  } else {
    resolvedPeriodId = await ensureCurrentPeriodExists();
  }

  // Fetch the period
  const [period] = await db
    .select()
    .from(budgetPeriods)
    .where(eq(budgetPeriods.id, resolvedPeriodId))
    .limit(1);

  if (!period) {
    return NextResponse.json(
      { error: "No budget period found" },
      { status: 404 }
    );
  }

  const { startDate, endDate, expectedIncomeCents } = period;

  // Date calculations
  const totalDays = daysBetween(startDate, endDate) + 1; // inclusive
  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(
    0,
    Math.min(totalDays, daysBetween(startDate, today) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progressPercent =
    totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;

  // Fetch all data in parallel
  const [
    allSavers,
    allCategories,
    incomeRows,
    spendingBySaver,
    spendingByCategory,
    allGoals,
  ] = await Promise.all([
    // 1. All active savers ordered by sortOrder
    db
      .select()
      .from(budgetSavers)
      .where(eq(budgetSavers.isActive, true))
      .orderBy(asc(budgetSavers.sortOrder)),

    // 2. All categories linked to savers
    db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.isActive, true))
      .orderBy(asc(budgetCategories.sortOrder)),

    // 3. Actual income: sum of positive-amount transactions in the period
    db
      .select({
        totalCents:
          sql<number>`COALESCE(SUM(${upTransactions.amountCents}), 0)`,
      })
      .from(upTransactions)
      .where(
        and(
          sql`${upTransactions.amountCents} > 0`,
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      ),

    // 4. Spending aggregated by saverKey
    db
      .select({
        saverKey: upTransactions.saverKey,
        totalCents:
          sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
      })
      .from(upTransactions)
      .where(
        and(
          lt(upTransactions.amountCents, sql`0`),
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      )
      .groupBy(upTransactions.saverKey),

    // 5. Spending aggregated by saverKey + categoryKey
    db
      .select({
        saverKey: upTransactions.saverKey,
        categoryKey: upTransactions.categoryKey,
        totalCents:
          sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
      })
      .from(upTransactions)
      .where(
        and(
          lt(upTransactions.amountCents, sql`0`),
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      )
      .groupBy(upTransactions.saverKey, upTransactions.categoryKey),

    // 6. All goals for the goals tracker widget
    db
      .select({
        id: goals.id,
        name: goals.name,
        targetAmountCents: goals.targetAmountCents,
        currentAmountCents: goals.currentAmountCents,
        monthlyContributionCents: goals.monthlyContributionCents,
        targetDate: goals.targetDate,
        status: goals.status,
        colour: goals.colour,
        icon: goals.icon,
      })
      .from(goals)
      .orderBy(asc(goals.priority)),
  ]);

  // Build spending maps
  const spendingBySaverMap = new Map<string, number>();
  for (const row of spendingBySaver) {
    if (row.saverKey) {
      spendingBySaverMap.set(row.saverKey, Number(row.totalCents));
    }
  }

  const spendingByCategoryMap = new Map<string, number>();
  for (const row of spendingByCategory) {
    const key = `${row.saverKey ?? ""}::${row.categoryKey ?? ""}`;
    spendingByCategoryMap.set(key, Number(row.totalCents));
  }

  // Group categories by saverId
  const categoriesBySaverId = new Map<
    string,
    (typeof allCategories)[number][]
  >();
  for (const cat of allCategories) {
    if (!cat.saverId) continue;
    const existing = categoriesBySaverId.get(cat.saverId) ?? [];
    existing.push(cat);
    categoriesBySaverId.set(cat.saverId, existing);
  }

  // Build spending savers array (only saverType='spending')
  const spendingSavers: SaverSummary[] = [];
  let totalSpentCents = 0;
  let totalBudgetedCents = 0;

  for (const saver of allSavers) {
    if (saver.saverType !== "spending") continue;

    const budgetCents = saver.monthlyBudgetCents;
    const actualCents = spendingBySaverMap.get(saver.saverKey) ?? 0;
    const percentUsed =
      budgetCents > 0
        ? Math.round((actualCents / budgetCents) * 100)
        : actualCents > 0
          ? 100
          : 0;
    const paceStatus = getPaceStatus(percentUsed, progressPercent);
    const projectedEndCents =
      daysElapsed > 0
        ? Math.round((actualCents / daysElapsed) * totalDays)
        : 0;

    // Build categories for this saver
    const saverCategories = categoriesBySaverId.get(saver.id) ?? [];
    const categories: CategorySummary[] = saverCategories.map((cat) => {
      const catActualCents =
        spendingByCategoryMap.get(`${saver.saverKey}::${cat.categoryKey}`) ?? 0;
      return {
        categoryKey: cat.categoryKey,
        displayName: cat.name,
        budgetCents: cat.monthlyBudgetCents ?? 0,
        actualCents: catActualCents,
      };
    });

    spendingSavers.push({
      saverKey: saver.saverKey,
      displayName: saver.displayName,
      emoji: saver.emoji,
      colour: saver.colour,
      budgetCents,
      actualCents,
      percentUsed,
      paceStatus,
      projectedEndCents,
      categories,
    });

    totalSpentCents += actualCents;
    totalBudgetedCents += budgetCents;
  }

  // Build savings goals array
  const savingsGoals: GoalSummary[] = allGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    targetAmountCents: goal.targetAmountCents,
    currentAmountCents: goal.currentAmountCents,
    monthlyContributionCents: goal.monthlyContributionCents,
    targetDate: goal.targetDate,
    status: goal.status,
    percentComplete:
      goal.targetAmountCents > 0
        ? Math.round(
            (goal.currentAmountCents / goal.targetAmountCents) * 100
          )
        : 0,
    colour: goal.colour,
    icon: goal.icon,
  }));

  const actualIncomeCents = Number(incomeRows[0]?.totalCents ?? 0);

  return NextResponse.json({
    period: {
      startDate,
      endDate,
      totalDays,
      daysElapsed,
      daysRemaining,
      progressPercent,
    },
    income: {
      expectedCents: expectedIncomeCents,
      actualCents: actualIncomeCents,
    },
    spendingSavers,
    totalSpentCents,
    totalBudgetedCents,
    savingsGoals,
  });
}, "fetching budget summary");
