import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmountCents: z.number().int().positive().optional(),
  currentAmountCents: z.number().int().min(0).optional(),
  monthlyContributionCents: z.number().int().min(0).optional(),
  saverId: z.string().uuid().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  priority: z.number().int().min(0).optional(),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a valid hex colour")
    .nullable()
    .optional(),
  icon: z.string().max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * PUT /api/budget/goals/[id]
 *
 * Updates a goal's fields by ID.
 * Setting status='completed' auto-sets completedAt to now().
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updateFields: Record<string, unknown> = {};
  const data = parsed.data;

  if (data.name !== undefined) updateFields.name = data.name;
  if (data.targetAmountCents !== undefined) updateFields.targetAmountCents = data.targetAmountCents;
  if (data.currentAmountCents !== undefined) updateFields.currentAmountCents = data.currentAmountCents;
  if (data.monthlyContributionCents !== undefined) updateFields.monthlyContributionCents = data.monthlyContributionCents;
  if (data.saverId !== undefined) updateFields.saverId = data.saverId;
  if (data.targetDate !== undefined) updateFields.targetDate = data.targetDate;
  if (data.priority !== undefined) updateFields.priority = data.priority;
  if (data.colour !== undefined) updateFields.colour = data.colour;
  if (data.icon !== undefined) updateFields.icon = data.icon;
  if (data.notes !== undefined) updateFields.notes = data.notes;

  if (data.status !== undefined) {
    updateFields.status = data.status;
    if (data.status === "completed") {
      updateFields.completedAt = new Date();
    }
  }

  // Auto-complete: if currentAmountCents is being updated and meets/exceeds target,
  // and no explicit status was provided, auto-mark as completed
  if (
    data.currentAmountCents !== undefined &&
    data.status === undefined
  ) {
    // We need the current target to check against — fetch the goal first
    const [existing] = await db
      .select({ targetAmountCents: goals.targetAmountCents, status: goals.status })
      .from(goals)
      .where(eq(goals.id, id));

    if (existing && existing.status === "active") {
      const target = Number(existing.targetAmountCents);
      if (data.currentAmountCents >= target) {
        updateFields.status = "completed";
        updateFields.completedAt = new Date();
      }
    }
  }

  updateFields.updatedAt = new Date();

  const [updated] = await db
    .update(goals)
    .set(updateFields)
    .where(eq(goals.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: `Goal with id '${id}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}, "updating goal");
