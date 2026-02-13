import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { goals, budgetSavers } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const createGoalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  targetAmountCents: z.number().int().positive("Target amount must be positive"),
  monthlyContributionCents: z.number().int().min(0),
  saverId: z.string().uuid().optional(),
  targetDate: z.string().optional(),
  priority: z.number().int().min(0).optional(),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a valid hex colour")
    .optional(),
  icon: z.string().max(10).optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/budget/goals
 *
 * Returns all goals ordered by priority, with linked saver info.
 *
 * Response shape:
 * { goals: [{ id, name, saverId, saverKey, saverDisplayName, targetAmountCents,
 *             currentAmountCents, monthlyContributionCents, targetDate, status,
 *             priority, colour, icon, notes, completedAt, percentComplete }] }
 */
export const GET = withAuth(async () => {
  const allGoals = await db
    .select({
      id: goals.id,
      name: goals.name,
      saverId: goals.saverId,
      saverKey: budgetSavers.saverKey,
      saverDisplayName: budgetSavers.displayName,
      targetAmountCents: goals.targetAmountCents,
      currentAmountCents: goals.currentAmountCents,
      monthlyContributionCents: goals.monthlyContributionCents,
      targetDate: goals.targetDate,
      status: goals.status,
      priority: goals.priority,
      colour: goals.colour,
      icon: goals.icon,
      notes: goals.notes,
      completedAt: goals.completedAt,
    })
    .from(goals)
    .leftJoin(budgetSavers, eq(goals.saverId, budgetSavers.id))
    .orderBy(asc(goals.priority));

  const result = allGoals.map((goal) => ({
    ...goal,
    percentComplete:
      goal.targetAmountCents > 0
        ? Math.round((goal.currentAmountCents / goal.targetAmountCents) * 100)
        : 0,
  }));

  return NextResponse.json({ goals: result });
}, "fetching goals");

/**
 * POST /api/budget/goals
 *
 * Creates a new goal.
 *
 * Required fields: name, targetAmountCents, monthlyContributionCents
 * Optional: saverId, targetDate, priority, colour, icon, notes
 */
export const POST = withAuth(async (request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(goals)
    .values({
      name: parsed.data.name,
      targetAmountCents: parsed.data.targetAmountCents,
      monthlyContributionCents: parsed.data.monthlyContributionCents,
      saverId: parsed.data.saverId,
      targetDate: parsed.data.targetDate,
      priority: parsed.data.priority ?? 0,
      colour: parsed.data.colour,
      icon: parsed.data.icon,
      notes: parsed.data.notes,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}, "creating goal");
