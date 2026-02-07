import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { upTransactions, budgetCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const updateCategorySchema = z.object({
  category_id: z.string().min(1, "category_id is required"),
});

/**
 * PUT /api/budget/transactions/:id/category
 *
 * Updates the Mjolnir category for a specific UP transaction.
 * Used for manual category overrides when auto-categorisation is incorrect.
 *
 * Request body:
 *   - category_id: The Mjolnir budget category slug to assign
 *
 * Response: Updated transaction object
 *
 * Errors:
 *   - 400 for validation failures or invalid category_id
 *   - 404 if transaction not found
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  // Check if transaction exists
  const existing = await db
    .select({ id: upTransactions.id })
    .from(upTransactions)
    .where(eq(upTransactions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Transaction not found" },
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

  // Validate category exists
  const category = await db
    .select({ id: budgetCategories.id })
    .from(budgetCategories)
    .where(eq(budgetCategories.id, parsed.data.category_id))
    .limit(1);

  if (category.length === 0) {
    return NextResponse.json(
      { error: `Category '${parsed.data.category_id}' does not exist` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(upTransactions)
    .set({
      mjolnirCategoryId: parsed.data.category_id,
      updatedAt: new Date(),
    })
    .where(eq(upTransactions.id, id))
    .returning();

  return NextResponse.json(updated);
}, "updating transaction category");
