import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { calculateBudgetSummary } from "@/lib/budget/summary";
import { db } from "@/lib/db";
import {
  budgetPeriods,
  budgetSavers,
  upTransactions,
} from "@/lib/db/schema";

/**
 * GET /api/budget/trends
 *
 * Returns historical spending data across multiple budget periods for the trends chart.
 *
 * Query params:
 *   - periods: number of periods to include (default 6, max 24)
 *
 * Response: array of period summaries ordered oldest to newest.
 * Each period includes both category-level and saver-level spending data.
 */
export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const periodsParam = searchParams.get("periods");
  const periodsCount = Math.min(
    Math.max(1, parseInt(periodsParam || "6", 10) || 6),
    24
  );

  // Fetch the N most recent periods ordered newest first
  const periods = await db
    .select({
      id: budgetPeriods.id,
      startDate: budgetPeriods.startDate,
      endDate: budgetPeriods.endDate,
    })
    .from(budgetPeriods)
    .orderBy(desc(budgetPeriods.startDate))
    .limit(periodsCount);

  if (periods.length === 0) {
    return NextResponse.json([]);
  }

  // Determine which period is current (today falls within it)
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all spending savers for the saver metadata (colour, emoji, budget)
  const allSavers = await db
    .select()
    .from(budgetSavers)
    .where(eq(budgetSavers.isActive, true))
    .orderBy(asc(budgetSavers.sortOrder));

  const spendingSavers = allSavers.filter((s) => s.saverType === "spending");

  // Calculate category summaries and saver spending for all periods concurrently
  const [summaries, ...saverSpendingResults] = await Promise.all([
    Promise.all(periods.map((period) => calculateBudgetSummary(period.id))),
    ...periods.map((period) =>
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
            gte(upTransactions.transactionDate, period.startDate),
            lte(upTransactions.transactionDate, period.endDate),
            eq(upTransactions.isTransfer, false),
            isNull(upTransactions.deletedAt)
          )
        )
        .groupBy(upTransactions.saverKey)
    ),
  ]);

  // Build response ordered oldest to newest
  const result = summaries
    .map((summary, index) => {
      const isProjected =
        summary.startDate <= today && summary.endDate >= today;

      // Build saver spending map for this period
      const saverSpendingRows = saverSpendingResults[index] ?? [];
      const saverSpendingMap = new Map<string, number>();
      for (const row of saverSpendingRows) {
        if (row.saverKey) {
          saverSpendingMap.set(row.saverKey, Number(row.totalCents));
        }
      }

      // Build saver entries (only spending savers)
      const savers = spendingSavers.map((s) => ({
        saverKey: s.saverKey,
        displayName: s.displayName,
        emoji: s.emoji,
        colour: s.colour,
        budgetCents: s.monthlyBudgetCents,
        spentCents: saverSpendingMap.get(s.saverKey) ?? 0,
      }));

      return {
        periodId: summary.periodId,
        startDate: summary.startDate,
        endDate: summary.endDate,
        totalSpentCents: summary.totals.spentCents,
        totalIncomeCents: summary.income.actualCents,
        savingsRate: summary.totals.savingsRate,
        isProjected,
        categories: summary.categories.map((cat) => ({
          categoryId: cat.categoryId,
          name: cat.categoryName,
          colour: cat.colour,
          spentCents: cat.spentCents,
        })),
        savers,
      };
    })
    .reverse(); // oldest to newest

  return NextResponse.json(result);
}, "fetching spending trends");
