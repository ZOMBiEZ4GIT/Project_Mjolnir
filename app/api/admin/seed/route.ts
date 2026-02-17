import { NextResponse } from "next/server";
import { seedBudgetSavers } from "@/lib/db/seeds/budget-savers";
import { seedGoals } from "@/lib/db/seeds/goals";
import { withAuth } from "@/lib/utils/with-auth";

export const POST = withAuth(async () => {
  await seedBudgetSavers();
  await seedGoals();
  return NextResponse.json({ success: true, message: "Seed completed" });
}, "seeding database");
