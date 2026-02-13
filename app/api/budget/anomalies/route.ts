import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  budgetPeriods,
  budgetSavers,
  budgetCategories,
  upTransactions,
} from "@/lib/db/schema";
import { and, eq, gte, lte, lt, isNull, sql, desc, asc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { ensureCurrentPeriodExists } from "@/lib/budget/payday";
import {
  detectAnomalies,
  type PeriodTransaction,
  type CategoryAverage,
  type PeriodContext,
} from "@/lib/budget/anomalies";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

// -----------------------------------------------------------------------------
// GET /api/budget/anomalies?period_id=X
// -----------------------------------------------------------------------------

export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const periodId = searchParams.get("period_id");

  // Resolve the period
  const resolvedPeriodId = periodId ?? (await ensureCurrentPeriodExists());

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

  const { startDate, endDate } = period;

  // Date context
  const totalDays = daysBetween(startDate, endDate) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(
    0,
    Math.min(totalDays, daysBetween(startDate, today) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progressPercent =
    totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;

  // Fetch prior periods for historical averages (up to 6 previous periods)
  const priorPeriods = await db
    .select({
      id: budgetPeriods.id,
      startDate: budgetPeriods.startDate,
      endDate: budgetPeriods.endDate,
    })
    .from(budgetPeriods)
    .where(lt(budgetPeriods.startDate, startDate))
    .orderBy(desc(budgetPeriods.startDate))
    .limit(6);

  // Fetch all data in parallel
  const [
    currentTransactions,
    allSavers,
    allCategories,
    ...historicalSpending
  ] = await Promise.all([
    // Current period transactions
    db
      .select({
        id: upTransactions.id,
        description: upTransactions.description,
        amountCents: upTransactions.amountCents,
        transactionDate: upTransactions.transactionDate,
        saverKey: upTransactions.saverKey,
        categoryKey: upTransactions.categoryKey,
      })
      .from(upTransactions)
      .where(
        and(
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      ),

    // All active savers
    db
      .select()
      .from(budgetSavers)
      .where(eq(budgetSavers.isActive, true))
      .orderBy(asc(budgetSavers.sortOrder)),

    // All active categories
    db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.isActive, true)),

    // Historical spending per saver+category for each prior period
    ...priorPeriods.map((p) =>
      db
        .select({
          saverKey: upTransactions.saverKey,
          categoryKey: upTransactions.categoryKey,
          totalCents:
            sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
          txCount: sql<number>`COUNT(*)`,
        })
        .from(upTransactions)
        .where(
          and(
            lt(upTransactions.amountCents, sql`0`),
            gte(upTransactions.transactionDate, p.startDate),
            lte(upTransactions.transactionDate, p.endDate),
            eq(upTransactions.isTransfer, false),
            isNull(upTransactions.deletedAt)
          )
        )
        .groupBy(upTransactions.saverKey, upTransactions.categoryKey)
    ),
  ]);

  // Build category budget lookup: saverKey::categoryKey → budgetCents
  const saverMap = new Map(allSavers.map((s) => [s.id, s]));
  const categoryBudgetMap = new Map<string, number>();

  for (const cat of allCategories) {
    if (!cat.saverId) continue;
    const saver = saverMap.get(cat.saverId);
    if (!saver) continue;
    const key = `${saver.saverKey}::${cat.categoryKey ?? ""}`;
    categoryBudgetMap.set(key, cat.monthlyBudgetCents ?? 0);
  }

  // Build historical averages
  const numPriorPeriods = priorPeriods.length;
  const historicalTotals = new Map<string, { totalCents: number; txCount: number }>();

  for (const periodRows of historicalSpending) {
    for (const row of periodRows) {
      const key = `${row.saverKey ?? ""}::${row.categoryKey ?? ""}`;
      const existing = historicalTotals.get(key) ?? { totalCents: 0, txCount: 0 };
      existing.totalCents += Number(row.totalCents);
      existing.txCount += Number(row.txCount);
      historicalTotals.set(key, existing);
    }
  }

  const categoryAverages: CategoryAverage[] = [];
  if (numPriorPeriods > 0) {
    for (const [key, data] of historicalTotals) {
      const [saverKey, categoryKey] = key.split("::");
      categoryAverages.push({
        saverKey,
        categoryKey: categoryKey || null,
        avgTransactionCents:
          data.txCount > 0
            ? Math.round(data.totalCents / data.txCount)
            : 0,
        avgPeriodTotalCents: Math.round(data.totalCents / numPriorPeriods),
        budgetCents: categoryBudgetMap.get(key) ?? 0,
      });
    }
  }

  // Map current transactions to the expected shape
  const periodTransactions: PeriodTransaction[] = currentTransactions.map(
    (t) => ({
      id: t.id,
      description: t.description,
      amountCents: t.amountCents,
      transactionDate: t.transactionDate,
      saverKey: t.saverKey,
      categoryKey: t.categoryKey,
    })
  );

  const periodContext: PeriodContext = {
    progressPercent,
    daysRemaining,
    totalDays,
  };

  const anomalies = detectAnomalies(
    periodTransactions,
    categoryAverages,
    periodContext
  );

  return NextResponse.json({ anomalies });
}, "detecting budget anomalies");
