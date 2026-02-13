import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { and, eq, gte, lte, isNull, sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/budget/challenge-comparison
 *
 * Returns aggregated supplement spending for the BFT challenge period
 * (Feb-Apr 2026) vs post-challenge period (May 2026+).
 *
 * Response: {
 *   during: { totalCents, months, avgMonthlyCents, categories: [...] },
 *   after:  { totalCents, months, avgMonthlyCents, categories: [...] },
 *   hasDuringData: boolean,
 *   hasAfterData: boolean,
 * }
 */

const CHALLENGE_START = "2026-02-01";
const CHALLENGE_END = "2026-04-30";
const POST_CHALLENGE_START = "2026-05-01";

async function aggregateByCategory(fromDate: string, toDate?: string) {
  const conditions = [
    isNull(upTransactions.deletedAt),
    eq(upTransactions.isTransfer, false),
    eq(upTransactions.saverKey, "supplements"),
    gte(upTransactions.transactionDate, fromDate),
  ];

  if (toDate) {
    conditions.push(lte(upTransactions.transactionDate, toDate));
  }

  const rows = await db
    .select({
      categoryKey: upTransactions.categoryKey,
      totalCents: sql<string>`COALESCE(SUM(ABS(${upTransactions.amountCents})), 0)`,
      txnCount: sql<string>`COUNT(*)`,
    })
    .from(upTransactions)
    .where(and(...conditions))
    .groupBy(upTransactions.categoryKey);

  return rows.map((r) => ({
    categoryKey: r.categoryKey ?? "uncategorised",
    totalCents: Number(r.totalCents),
    txnCount: Number(r.txnCount),
  }));
}

function countMonths(fromDate: string, toDate: string): number {
  const from = new Date(fromDate + "T00:00:00");
  const to = new Date(toDate + "T00:00:00");
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1;
  return Math.max(1, months);
}

export const GET = withAuth(async () => {
  const today = new Date().toISOString().split("T")[0];

  // During challenge: Feb 1 - Apr 30 2026
  const duringCategories = await aggregateByCategory(
    CHALLENGE_START,
    CHALLENGE_END
  );
  const duringTotal = duringCategories.reduce(
    (sum, c) => sum + c.totalCents,
    0
  );
  const duringMonths = countMonths(
    CHALLENGE_START,
    today < CHALLENGE_END ? today : CHALLENGE_END
  );

  // After challenge: May 1 2026+
  const afterCategories = await aggregateByCategory(POST_CHALLENGE_START);
  const afterTotal = afterCategories.reduce(
    (sum, c) => sum + c.totalCents,
    0
  );
  const afterMonths = today >= POST_CHALLENGE_START
    ? countMonths(POST_CHALLENGE_START, today)
    : 0;

  return NextResponse.json({
    during: {
      totalCents: duringTotal,
      months: duringMonths,
      avgMonthlyCents: duringMonths > 0 ? Math.round(duringTotal / duringMonths) : 0,
      categories: duringCategories,
    },
    after: {
      totalCents: afterTotal,
      months: afterMonths,
      avgMonthlyCents: afterMonths > 0 ? Math.round(afterTotal / afterMonths) : 0,
      categories: afterCategories,
    },
    hasDuringData: duringTotal > 0,
    hasAfterData: afterTotal > 0,
    challengeEndDate: CHALLENGE_END,
  });
}, "fetching challenge comparison data");
