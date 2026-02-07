import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgetPeriods, budgetAllocations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const allocationSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  allocatedCents: z.number().int().min(0, "Allocated cents must be non-negative"),
});

const updatePeriodSchema = z.object({
  expectedIncomeCents: z.number().int().min(0, "Expected income must be non-negative").optional(),
  notes: z.string().nullable().optional(),
  allocations: z.array(allocationSchema).optional(),
});

/**
 * PUT /api/budget/periods/:id
 *
 * Updates a budget period's income, notes, and/or allocations.
 * When allocations are provided, existing allocations are replaced (delete + re-insert).
 *
 * Request body (all optional):
 *   - expectedIncomeCents: New expected income in cents
 *   - notes: New notes text (or null to clear)
 *   - allocations: Full replacement array of { categoryId, allocatedCents }
 *
 * Response: Updated period with allocations.
 * Includes a warning if allocations exceed expected income.
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  // Check if period exists
  const existing = await db
    .select()
    .from(budgetPeriods)
    .where(eq(budgetPeriods.id, id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Budget period not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updatePeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Build period update
  const updateData: Partial<{
    expectedIncomeCents: number;
    notes: string | null;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (data.expectedIncomeCents !== undefined) {
    updateData.expectedIncomeCents = data.expectedIncomeCents;
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes;
  }

  const [updatedPeriod] = await db
    .update(budgetPeriods)
    .set(updateData)
    .where(eq(budgetPeriods.id, id))
    .returning();

  // Replace allocations if provided
  let allocations: (typeof budgetAllocations.$inferSelect)[];
  if (data.allocations !== undefined) {
    // Delete existing allocations
    await db
      .delete(budgetAllocations)
      .where(eq(budgetAllocations.budgetPeriodId, id));

    // Insert new allocations
    if (data.allocations.length > 0) {
      allocations = await db
        .insert(budgetAllocations)
        .values(
          data.allocations.map((alloc) => ({
            budgetPeriodId: id,
            categoryId: alloc.categoryId,
            allocatedCents: alloc.allocatedCents,
          }))
        )
        .returning();
    } else {
      allocations = [];
    }
  } else {
    // Fetch current allocations
    allocations = await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.budgetPeriodId, id));
  }

  // Check if allocations exceed income (warn, not block)
  const totalAllocated = allocations.reduce(
    (sum, a) => sum + a.allocatedCents,
    0
  );
  const effectiveIncome =
    data.expectedIncomeCents ?? existing[0].expectedIncomeCents;
  const warning =
    totalAllocated > effectiveIncome
      ? "Total allocations exceed expected income"
      : undefined;

  return NextResponse.json({
    ...updatedPeriod,
    allocations,
    ...(warning ? { warning } : {}),
  });
}, "updating budget period");

/**
 * DELETE /api/budget/periods/:id
 *
 * Deletes a budget period. Allocations are cascade-deleted automatically.
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 404 if period not found
 */
export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;

  const existing = await db
    .select()
    .from(budgetPeriods)
    .where(eq(budgetPeriods.id, id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Budget period not found" },
      { status: 404 }
    );
  }

  await db
    .delete(budgetPeriods)
    .where(eq(budgetPeriods.id, id));

  return NextResponse.json({ success: true });
}, "deleting budget period");
