import { NextResponse } from "next/server";
import { and, lte, gte, eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import {
  aiRecommendations,
  budgetPeriods,
  budgetCategories,
  paydayConfig,
  upTransactions,
} from "@/lib/db/schema";
import { calculateBudgetSummary } from "@/lib/budget/summary";

/**
 * GET /api/budget/recommendations
 *
 * Returns the latest AI recommendation for a given period.
 * Accepts optional `period_id` query param; defaults to the current period.
 *
 * Response: Single recommendation object, or 404 if none exists.
 */
export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const periodId = searchParams.get("period_id");

  let resolvedPeriodId: string;

  if (periodId) {
    resolvedPeriodId = periodId;
  } else {
    // Find the current period by matching today's date
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select({ id: budgetPeriods.id })
      .from(budgetPeriods)
      .where(
        and(
          lte(budgetPeriods.startDate, today),
          gte(budgetPeriods.endDate, today)
        )
      )
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json(
        { error: "No budget period found", setupUrl: "/budget/setup" },
        { status: 404 }
      );
    }

    resolvedPeriodId = rows[0].id;
  }

  const rows = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.budgetPeriodId, resolvedPeriodId))
    .orderBy(desc(aiRecommendations.createdAt))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json(
      { error: "No recommendation found for this period" },
      { status: 404 }
    );
  }

  return NextResponse.json(rows[0]);
}, "fetching AI recommendation");

/**
 * POST /api/budget/recommendations
 *
 * Gathers spending data for the current budget period and sends it to the
 * n8n webhook for AI-powered recommendation generation.
 *
 * Returns 202 Accepted immediately — the recommendation arrives later via
 * the callback endpoint.
 */
export const POST = withAuth(async () => {
  const n8nBaseUrl = process.env.N8N_BASE_URL;
  const n8nApiKey = process.env.N8N_API_KEY;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!n8nBaseUrl || !n8nApiKey || !webhookSecret) {
    return NextResponse.json(
      { error: "AI recommendations not configured" },
      { status: 503 }
    );
  }

  // 1. Resolve the current budget period
  const today = new Date().toISOString().slice(0, 10);
  const periodRows = await db
    .select({ id: budgetPeriods.id })
    .from(budgetPeriods)
    .where(
      and(
        lte(budgetPeriods.startDate, today),
        gte(budgetPeriods.endDate, today)
      )
    )
    .limit(1);

  if (!periodRows[0]) {
    return NextResponse.json(
      { error: "No budget period found", setupUrl: "/budget/setup" },
      { status: 404 }
    );
  }

  const currentPeriodId = periodRows[0].id;

  // 2. Gather data concurrently
  const [summary, historicalSpending, paydayRows] = await Promise.all([
    // Current period summary (income, allocations, spending)
    calculateBudgetSummary(currentPeriodId),

    // 3-month average spending: get up to 3 previous periods and their spending
    getHistoricalCategorySpending(currentPeriodId),

    // Payday config
    db.select().from(paydayConfig).limit(1),
  ]);

  // 3. Build the payload for n8n
  const payload = {
    budgetPeriodId: currentPeriodId,
    income: summary.income,
    allocations: summary.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      allocatedCents: c.budgetedCents,
      spentCents: c.spentCents,
    })),
    historicalAverages: historicalSpending,
    savingsGoalPercentage: 30,
    paydayConfig: paydayRows[0]
      ? {
          paydayDay: paydayRows[0].paydayDay,
          adjustForWeekends: paydayRows[0].adjustForWeekends,
        }
      : { paydayDay: 15, adjustForWeekends: true },
    periodDates: {
      startDate: summary.startDate,
      endDate: summary.endDate,
      daysRemaining: summary.daysRemaining,
      daysElapsed: summary.daysElapsed,
      totalDays: summary.totalDays,
    },
  };

  // 4. Sign and send to n8n
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  // Fire-and-forget — don't await the n8n response
  fetch(`${n8nBaseUrl}/webhook/budget-recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Mjolnir-API-Key": n8nApiKey,
      "X-Mjolnir-Timestamp": timestamp,
      "X-Mjolnir-Signature": signature,
    },
    body,
  }).catch(() => {
    // Swallow — n8n will call back or time out
  });

  return NextResponse.json(
    { message: "Recommendation requested" },
    { status: 202 }
  );
}, "requesting AI recommendation");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the average spending per category across up to 3 previous budget periods.
 */
async function getHistoricalCategorySpending(currentPeriodId: string) {
  // Find up to 3 periods before the current one, ordered most recent first
  const previousPeriods = await db
    .select({
      id: budgetPeriods.id,
      startDate: budgetPeriods.startDate,
      endDate: budgetPeriods.endDate,
    })
    .from(budgetPeriods)
    .where(
      and(
        lte(
          budgetPeriods.startDate,
          sql`(SELECT start_date FROM budget_periods WHERE id = ${currentPeriodId})`
        ),
        sql`${budgetPeriods.id} != ${currentPeriodId}`
      )
    )
    .orderBy(desc(budgetPeriods.startDate))
    .limit(3);

  if (previousPeriods.length === 0) {
    return [];
  }

  // Query spending across all these periods at once
  const periodConditions = previousPeriods.map((p) =>
    and(
      gte(upTransactions.transactionDate, p.startDate),
      lte(upTransactions.transactionDate, p.endDate)
    )
  );

  // Build an OR of all period date ranges
  const spendingRows = await db
    .select({
      categoryId: upTransactions.mjolnirCategoryId,
      totalCents: sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
    })
    .from(upTransactions)
    .where(
      and(
        sql`${upTransactions.amountCents} < 0`,
        sql`(${periodConditions.map((c) => sql`(${c})`).reduce((a, b) => sql`${a} OR ${b}`)})`,
        eq(upTransactions.isTransfer, false),
        sql`${upTransactions.deletedAt} IS NULL`
      )
    )
    .groupBy(upTransactions.mjolnirCategoryId);

  const periodCount = previousPeriods.length;

  // Get category names for the response
  const categories = await db
    .select({ id: budgetCategories.id, name: budgetCategories.name })
    .from(budgetCategories);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return spendingRows
    .filter((r) => r.categoryId)
    .map((r) => ({
      categoryId: r.categoryId!,
      categoryName: categoryMap.get(r.categoryId!) ?? r.categoryId!,
      averageSpentCents: Math.round(Number(r.totalCents) / periodCount),
    }));
}
