import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgetCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255).optional(),
  icon: z.string().min(1, "Icon cannot be empty").max(255).optional(),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a valid hex colour (e.g. #FF5733)")
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * PUT /api/budget/categories/:id
 *
 * Updates a budget category's name, icon, colour, or sort_order.
 *
 * Request body (all optional):
 *   - name: New display name
 *   - icon: New Lucide icon name
 *   - colour: New hex colour
 *   - sortOrder: New sort order
 *
 * Response: Updated category object
 *
 * Errors:
 *   - 400 for validation failures
 *   - 404 if category not found
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  // Check if category exists
  const existing = await db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.id, id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Category not found" },
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

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Build update object with only provided fields
  const updateData: Partial<{
    name: string;
    icon: string;
    colour: string;
    sortOrder: number;
  }> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.colour !== undefined) updateData.colour = data.colour;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  // If no fields to update, return existing
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(existing[0]);
  }

  const [updated] = await db
    .update(budgetCategories)
    .set(updateData)
    .where(eq(budgetCategories.id, id))
    .returning();

  return NextResponse.json(updated);
}, "updating budget category");

/**
 * DELETE /api/budget/categories/:id
 *
 * Deletes a budget category. System categories (is_system=true) cannot be deleted.
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 400 if category is a system category
 *   - 404 if category not found
 */
export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;

  const existing = await db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.id, id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  if (existing[0].isSystem) {
    return NextResponse.json(
      { error: "System categories cannot be deleted" },
      { status: 400 }
    );
  }

  await db
    .delete(budgetCategories)
    .where(eq(budgetCategories.id, id));

  return NextResponse.json({ success: true });
}, "deleting budget category");
