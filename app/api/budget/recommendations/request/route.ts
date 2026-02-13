import { NextResponse } from "next/server";
import { and, eq, gte, lte, lt, isNull, asc, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import {
  budgetPeriods,
  budgetSavers,
  upTransactions,
  goals,
} from "@/lib/db/schema";
import { ensureCurrentPeriodExists } from "@/lib/budget/payday";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get the average spending per saver across up to 3 previous budget periods.
 */
async function getHistoricalSaverSpending(currentPeriodId: string) {
  // Find up to 3 periods before the current one
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

  // Build OR of all period date ranges
  const periodConditions = previousPeriods.map((p) =>
    and(
      gte(upTransactions.transactionDate, p.startDate),
      lte(upTransactions.transactionDate, p.endDate)
    )
  );

  const spendingRows = await db
    .select({
      saverKey: upTransactions.saverKey,
      totalCents:
        sql<number>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
    })
    .from(upTransactions)
    .where(
      and(
        sql`${upTransactions.amountCents} < 0`,
        sql`(${periodConditions
          .map((c) => sql`(${c})`)
          .reduce((a, b) => sql`${a} OR ${b}`)})`,
        eq(upTransactions.isTransfer, false),
        isNull(upTransactions.deletedAt)
      )
    )
    .groupBy(upTransactions.saverKey);

  const periodCount = previousPeriods.length;

  return spendingRows
    .filter((r) => r.saverKey)
    .map((r) => ({
      saverKey: r.saverKey!,
      averageSpentCents: Math.round(Number(r.totalCents) / periodCount),
    }));
}

// -----------------------------------------------------------------------------
// POST /api/budget/recommendations/request
// -----------------------------------------------------------------------------

/**
 * Builds the full context payload for the Claude recommendation flow
 * and sends it to n8n. Returns immediately — n8n processes async and
 * calls back via the callback endpoint.
 */
export const POST = withAuth(async () => {
  const webhookUrl = process.env.N8N_RECOMMENDATION_WEBHOOK_URL;
  const n8nApiKey = process.env.N8N_API_KEY;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return NextResponse.json(
      {
        error: "AI recommendations not configured",
        details:
          "N8N_RECOMMENDATION_WEBHOOK_URL environment variable is not set",
      },
      { status: 503 }
    );
  }

  if (!n8nApiKey || !webhookSecret) {
    return NextResponse.json(
      { error: "AI recommendations not configured" },
      { status: 503 }
    );
  }

  // 1. Resolve the current budget period
  const periodId = await ensureCurrentPeriodExists();
  const [period] = await db
    .select()
    .from(budgetPeriods)
    .where(eq(budgetPeriods.id, periodId))
    .limit(1);

  if (!period) {
    return NextResponse.json(
      { error: "No budget period found" },
      { status: 404 }
    );
  }

  const { startDate, endDate, expectedIncomeCents } = period;

  // Date calculations
  const totalDays = daysBetween(startDate, endDate) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const daysElapsed = Math.max(
    0,
    Math.min(totalDays, daysBetween(startDate, today) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // 2. Gather data concurrently
  const [
    allSavers,
    spendingBySaver,
    allGoals,
    topTagsRows,
    historicalAverages,
  ] = await Promise.all([
    // Active savers
    db
      .select()
      .from(budgetSavers)
      .where(eq(budgetSavers.isActive, true))
      .orderBy(asc(budgetSavers.sortOrder)),

    // Spending aggregated by saverKey for current period
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

    // All goals
    db
      .select({
        id: goals.id,
        name: goals.name,
        targetAmountCents: goals.targetAmountCents,
        currentAmountCents: goals.currentAmountCents,
        monthlyContributionCents: goals.monthlyContributionCents,
        status: goals.status,
      })
      .from(goals)
      .orderBy(asc(goals.priority)),

    // Top tags by spend in current period
    db
      .select({
        tag: sql<string>`jsonb_array_elements_text(${upTransactions.tags})`,
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
          isNull(upTransactions.deletedAt),
          sql`jsonb_array_length(COALESCE(${upTransactions.tags}, '[]'::jsonb)) > 0`
        )
      )
      .groupBy(sql`jsonb_array_elements_text(${upTransactions.tags})`)
      .orderBy(
        desc(
          sql`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`
        )
      )
      .limit(10),

    // Historical spending per saver (last 3 periods)
    getHistoricalSaverSpending(periodId),
  ]);

  // Build spending map
  const spendingMap = new Map<string, number>();
  for (const row of spendingBySaver) {
    if (row.saverKey) {
      spendingMap.set(row.saverKey, Number(row.totalCents));
    }
  }

  // 3. Build the payload
  const saverPerformance = allSavers
    .filter((s) => s.saverType === "spending")
    .map((s) => {
      const actualSpentCents = spendingMap.get(s.saverKey) ?? 0;
      const percentUsed =
        s.monthlyBudgetCents > 0
          ? Math.round((actualSpentCents / s.monthlyBudgetCents) * 100)
          : actualSpentCents > 0
            ? 100
            : 0;
      return {
        saverKey: s.saverKey,
        displayName: s.displayName,
        emoji: s.emoji,
        colour: s.colour,
        budgetCents: s.monthlyBudgetCents,
        actualSpentCents,
        percentUsed,
      };
    });

  const goalProgress = allGoals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmountCents: g.targetAmountCents,
    currentAmountCents: g.currentAmountCents,
    percentComplete:
      g.targetAmountCents > 0
        ? Math.round((g.currentAmountCents / g.targetAmountCents) * 100)
        : 0,
    monthlyContributionCents: g.monthlyContributionCents,
    status: g.status,
  }));

  const topTags = topTagsRows.map((r) => ({
    tag: r.tag,
    totalCents: Number(r.totalCents),
  }));

  const payload = {
    budgetPeriodId: periodId,
    period: {
      startDate,
      endDate,
      totalDays,
      daysElapsed,
      daysRemaining,
      expectedIncomeCents,
    },
    savers: saverPerformance,
    goals: goalProgress,
    topTags,
    historicalAverages,
  };

  // 4. Sign and send to n8n
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  // Fire-and-forget — n8n processes async and calls back
  fetch(webhookUrl, {
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

  return NextResponse.json({ success: true, message: "Recommendation requested" });
}, "requesting AI recommendation");
