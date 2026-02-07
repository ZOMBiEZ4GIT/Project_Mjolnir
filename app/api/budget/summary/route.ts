import { NextResponse } from "next/server";
import { and, lte, gte } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { calculateBudgetSummary } from "@/lib/budget/summary";
import { db } from "@/lib/db";
import { budgetPeriods } from "@/lib/db/schema";

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

  try {
    const summary = await calculateBudgetSummary(resolvedPeriodId);
    return NextResponse.json(summary);
  } catch (error) {
    // calculateBudgetSummary throws when period not found by ID
    if (
      error instanceof Error &&
      error.message.startsWith("Budget period not found")
    ) {
      return NextResponse.json(
        { error: "No budget period found", setupUrl: "/budget/setup" },
        { status: 404 }
      );
    }
    throw error;
  }
}, "fetching budget summary");
