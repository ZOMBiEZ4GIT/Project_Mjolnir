import { db } from "@/lib/db";
import {
  budgetPeriods,
  budgetAllocations,
  budgetCategories,
  upTransactions,
} from "@/lib/db/schema";
import { and, eq, gte, lte, isNull, sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CategoryStatus = "under" | "warning" | "over";

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  colour: string;
  icon: string;
  budgetedCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  status: CategoryStatus;
}

export interface BudgetSummary {
  periodId: string;
  startDate: string;
  endDate: string;
  income: {
    expectedCents: number;
    actualCents: number;
  };
  categories: CategoryBreakdown[];
  totals: {
    budgetedCents: number;
    spentCents: number;
    unallocatedCents: number;
    savingsCents: number;
    savingsRate: number;
  };
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getCategoryStatus(percentUsed: number): CategoryStatus {
  if (percentUsed > 100) return "over";
  if (percentUsed >= 80) return "warning";
  return "under";
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

export async function calculateBudgetSummary(
  periodId: string
): Promise<BudgetSummary> {
  // Fetch period and allocations+categories concurrently
  const [periodRows, allocationRows] = await Promise.all([
    // 1. Budget period
    db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.id, periodId))
      .limit(1),

    // 2. Allocations joined with categories
    db
      .select({
        categoryId: budgetAllocations.categoryId,
        allocatedCents: budgetAllocations.allocatedCents,
        categoryName: budgetCategories.name,
        colour: budgetCategories.colour,
        icon: budgetCategories.icon,
        sortOrder: budgetCategories.sortOrder,
      })
      .from(budgetAllocations)
      .innerJoin(
        budgetCategories,
        eq(budgetAllocations.categoryId, budgetCategories.id)
      )
      .where(eq(budgetAllocations.budgetPeriodId, periodId)),
  ]);

  const period = periodRows[0];
  if (!period) {
    throw new Error(`Budget period not found: ${periodId}`);
  }

  const { startDate, endDate, expectedIncomeCents } = period;

  // Now fetch income and spending with the period date range
  const [actualIncomeRows, actualSpendingRows] = await Promise.all([
    // Income: sum of transactions where category = 'income'
    db
      .select({
        totalCents: sql<number>`COALESCE(SUM(${upTransactions.amountCents}), 0)`,
      })
      .from(upTransactions)
      .where(
        and(
          eq(upTransactions.mjolnirCategoryId, "income"),
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      ),

    // Spending per category: sum of debit transactions grouped by category
    db
      .select({
        categoryId: upTransactions.mjolnirCategoryId,
        totalCents: sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
      })
      .from(upTransactions)
      .where(
        and(
          sql`${upTransactions.amountCents} < 0`,
          gte(upTransactions.transactionDate, startDate),
          lte(upTransactions.transactionDate, endDate),
          eq(upTransactions.isTransfer, false),
          isNull(upTransactions.deletedAt)
        )
      )
      .groupBy(upTransactions.mjolnirCategoryId),
  ]);

  const actualIncomeCents = Number(actualIncomeRows[0]?.totalCents ?? 0);

  // Build a map of category spending
  const spendingMap = new Map<string, number>();
  for (const row of actualSpendingRows) {
    if (row.categoryId) {
      spendingMap.set(row.categoryId, Number(row.totalCents));
    }
  }

  // Build category breakdown sorted by sortOrder
  const sortedAllocations = allocationRows.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  let totalBudgetedCents = 0;
  let totalSpentCents = 0;

  const categories: CategoryBreakdown[] = sortedAllocations.map((alloc) => {
    const budgetedCents = Number(alloc.allocatedCents);
    const spentCents = spendingMap.get(alloc.categoryId) ?? 0;
    const remainingCents = budgetedCents - spentCents;
    const percentUsed = budgetedCents > 0 ? (spentCents / budgetedCents) * 100 : spentCents > 0 ? 100 : 0;

    totalBudgetedCents += budgetedCents;
    totalSpentCents += spentCents;

    return {
      categoryId: alloc.categoryId,
      categoryName: alloc.categoryName,
      colour: alloc.colour,
      icon: alloc.icon,
      budgetedCents,
      spentCents,
      remainingCents,
      percentUsed: Math.round(percentUsed * 10) / 10,
      status: getCategoryStatus(percentUsed),
    };
  });

  // Date calculations
  const totalDays = daysBetween(startDate, endDate) + 1; // inclusive
  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(
    0,
    Math.min(totalDays, daysBetween(startDate, today) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Savings
  const unallocatedCents = expectedIncomeCents - totalBudgetedCents;
  const savingsCents = actualIncomeCents - totalSpentCents;
  const savingsRate =
    actualIncomeCents > 0
      ? Math.round((savingsCents / actualIncomeCents) * 1000) / 10
      : 0;

  return {
    periodId,
    startDate,
    endDate,
    income: {
      expectedCents: expectedIncomeCents,
      actualCents: actualIncomeCents,
    },
    categories,
    totals: {
      budgetedCents: totalBudgetedCents,
      spentCents: totalSpentCents,
      unallocatedCents,
      savingsCents,
      savingsRate,
    },
    daysRemaining,
    daysElapsed,
    totalDays,
  };
}
