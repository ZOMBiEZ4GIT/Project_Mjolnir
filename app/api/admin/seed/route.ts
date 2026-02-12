import { NextResponse } from "next/server";
import { seedBudgetSavers } from "@/lib/db/seeds/budget-savers";
import { seedGoals } from "@/lib/db/seeds/goals";

export async function POST() {
  try {
    await seedBudgetSavers();
    await seedGoals();
    return NextResponse.json({ success: true, message: "Seed completed" });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
