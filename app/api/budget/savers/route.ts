import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgetSavers, budgetCategories } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const updateSaverSchema = z.object({
  saverKey: z.string().min(1, "saverKey is required"),
  monthlyBudgetCents: z.number().int().optional(),
  displayName: z.string().min(1).max(100).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a valid hex colour (e.g. #FF5733)")
    .optional(),
});

/**
 * GET /api/budget/savers
 *
 * Returns all active savers ordered by sortOrder, each with their linked categories.
 *
 * Response shape:
 * { savers: [{ id, saverKey, displayName, emoji, monthlyBudgetCents, saverType,
 *              sortOrder, colour, notes, categories: [{ id, categoryKey, displayName, monthlyBudgetCents }] }] }
 */
export const GET = withAuth(async () => {
  const savers = await db
    .select()
    .from(budgetSavers)
    .orderBy(asc(budgetSavers.sortOrder));

  const categories = await db
    .select()
    .from(budgetCategories)
    .orderBy(asc(budgetCategories.sortOrder));

  // Group categories by saverId
  const categoriesBySaverId = new Map<string, typeof categories>();
  for (const cat of categories) {
    if (!cat.saverId) continue;
    const existing = categoriesBySaverId.get(cat.saverId) ?? [];
    existing.push(cat);
    categoriesBySaverId.set(cat.saverId, existing);
  }

  const result = savers.map((saver) => ({
    id: saver.id,
    saverKey: saver.saverKey,
    displayName: saver.displayName,
    emoji: saver.emoji,
    monthlyBudgetCents: saver.monthlyBudgetCents,
    saverType: saver.saverType,
    sortOrder: saver.sortOrder,
    colour: saver.colour,
    notes: saver.notes,
    categories: (categoriesBySaverId.get(saver.id) ?? []).map((cat) => ({
      id: cat.id,
      categoryKey: cat.categoryKey,
      displayName: cat.name,
      monthlyBudgetCents: cat.monthlyBudgetCents,
    })),
  }));

  return NextResponse.json({ savers: result });
}, "fetching budget savers");

/**
 * PUT /api/budget/savers
 *
 * Updates a saver's fields by saverKey.
 *
 * Request body:
 *   - saverKey: (required) The saver to update
 *   - monthlyBudgetCents: (optional) New budget amount in cents
 *   - displayName: (optional) New display name
 *   - notes: (optional) Notes text (or null to clear)
 *   - isActive: (optional) Active status
 *   - colour: (optional) Hex colour
 *
 * Response: Updated saver object
 */
export const PUT = withAuth(async (request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateSaverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { saverKey, ...updates } = parsed.data;

  // Build the update object with only provided fields
  const updateFields: Record<string, unknown> = {};
  if (updates.monthlyBudgetCents !== undefined)
    updateFields.monthlyBudgetCents = updates.monthlyBudgetCents;
  if (updates.displayName !== undefined)
    updateFields.displayName = updates.displayName;
  if (updates.notes !== undefined) updateFields.notes = updates.notes;
  if (updates.isActive !== undefined) updateFields.isActive = updates.isActive;
  if (updates.colour !== undefined) updateFields.colour = updates.colour;
  updateFields.updatedAt = new Date();

  const [updated] = await db
    .update(budgetSavers)
    .set(updateFields)
    .where(eq(budgetSavers.saverKey, saverKey))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: `Saver with key '${saverKey}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}, "updating budget saver");
