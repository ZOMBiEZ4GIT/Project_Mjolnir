import { NextResponse } from "next/server";
import { withAuth } from "@/lib/utils/with-auth";
import { calculateBudgetSummary } from "@/lib/budget/summary";
import { ensureCurrentPeriodExists } from "@/lib/budget/payday";

export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const periodId = searchParams.get("period_id");

  let resolvedPeriodId: string;

  if (periodId) {
    resolvedPeriodId = periodId;
  } else {
    // Auto-generate the current period if it doesn't exist
    resolvedPeriodId = await ensureCurrentPeriodExists();
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
