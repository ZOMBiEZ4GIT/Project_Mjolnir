import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upTransactions, budgetPeriods } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/budget/tags
 *
 * Aggregates tags from up_transactions for a given budget period.
 * Unnests the JSONB tags array and groups by tag value.
 *
 * Query params:
 *   - period_id: Budget period ID (default: most recent period)
 *
 * Response: { tags: [{ tag, count, totalCents, avgCents }] }
 */
export const GET = withAuth(async (request) => {
  const url = new URL(request.url);
  const periodId = url.searchParams.get("period_id");

  // Resolve the budget period
  let startDate: string;
  let endDate: string;

  if (periodId) {
    const [period] = await db
      .select({ startDate: budgetPeriods.startDate, endDate: budgetPeriods.endDate })
      .from(budgetPeriods)
      .where(eq(budgetPeriods.id, periodId))
      .limit(1);

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }
    startDate = period.startDate;
    endDate = period.endDate;
  } else {
    // Default to most recent period
    const [latest] = await db
      .select({ startDate: budgetPeriods.startDate, endDate: budgetPeriods.endDate })
      .from(budgetPeriods)
      .orderBy(desc(budgetPeriods.startDate))
      .limit(1);

    if (!latest) {
      return NextResponse.json({ tags: [] });
    }
    startDate = latest.startDate;
    endDate = latest.endDate;
  }

  // Unnest JSONB tags array, aggregate by tag value
  // Only include spending transactions (negative amountCents) that aren't transfers/deleted
  const results = await db.execute(sql`
    SELECT
      tag::text AS tag,
      COUNT(*)::int AS count,
      SUM(ABS(${upTransactions.amountCents}))::int AS "totalCents",
      (SUM(ABS(${upTransactions.amountCents})) / COUNT(*))::int AS "avgCents"
    FROM ${upTransactions},
      jsonb_array_elements_text(${upTransactions.tags}) AS tag
    WHERE ${upTransactions.deletedAt} IS NULL
      AND ${upTransactions.isTransfer} = false
      AND ${upTransactions.amountCents} < 0
      AND ${upTransactions.transactionDate} >= ${startDate}
      AND ${upTransactions.transactionDate} <= ${endDate}
      AND ${upTransactions.tags} IS NOT NULL
      AND jsonb_array_length(${upTransactions.tags}) > 0
    GROUP BY tag
    ORDER BY "totalCents" DESC
  `);

  return NextResponse.json({ tags: results.rows });
}, "aggregating budget tags");
