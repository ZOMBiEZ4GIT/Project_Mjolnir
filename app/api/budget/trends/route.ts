import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { calculateBudgetSummary } from "@/lib/budget/summary";
import { db } from "@/lib/db";
import { budgetPeriods } from "@/lib/db/schema";

/**
 * GET /api/budget/trends
 *
 * Returns historical spending data across multiple budget periods for the trends chart.
 *
 * Query params:
 *   - periods: number of periods to include (default 6, max 24)
 *
 * Response: array of period summaries ordered oldest to newest.
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

  // Calculate summaries for all periods concurrently
  const summaries = await Promise.all(
    periods.map((period) => calculateBudgetSummary(period.id))
  );

  // Build response ordered oldest to newest
  const result = summaries
    .map((summary) => {
      const isProjected =
        summary.startDate <= today && summary.endDate >= today;

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
      };
    })
    .reverse(); // oldest to newest

  return NextResponse.json(result);
}, "fetching spending trends");
