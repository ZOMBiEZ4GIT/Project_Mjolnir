import { NextResponse } from "next/server";
import { and, lte, gte, eq, desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { aiRecommendations, budgetPeriods } from "@/lib/db/schema";

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
