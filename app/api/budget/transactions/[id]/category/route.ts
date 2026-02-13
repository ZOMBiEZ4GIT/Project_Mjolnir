import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  upTransactions,
  budgetCategories,
  budgetSavers,
  classificationCorrections,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const updateClassificationSchema = z.object({
  category_id: z.string().min(1, "category_id is required"),
  saverKey: z.string().min(1).optional(),
  categoryKey: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * PUT /api/budget/transactions/:id/category
 *
 * Updates the classification for a specific UP transaction.
 * Supports updating Mjolnir category, saver key, category key, and tags.
 *
 * Request body:
 *   - category_id: The Mjolnir budget category slug to assign (required)
 *   - saverKey: (optional) The saver key to assign
 *   - categoryKey: (optional) The category key to assign
 *   - tags: (optional) Array of tag strings
 *
 * Response: Updated transaction object
 *
 * Errors:
 *   - 400 for validation failures or invalid category_id/saverKey
 *   - 404 if transaction not found
 */
export const PUT = withAuth(async (request, context) => {
  const { id } = await context.params;

  // Fetch existing transaction (including current classification for correction tracking)
  const existing = await db
    .select({
      id: upTransactions.id,
      description: upTransactions.description,
      saverKey: upTransactions.saverKey,
      categoryKey: upTransactions.categoryKey,
    })
    .from(upTransactions)
    .where(eq(upTransactions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  const originalTx = existing[0];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateClassificationSchema.safeParse(body);
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

  // Validate saver exists if provided
  if (parsed.data.saverKey) {
    const saver = await db
      .select({ saverKey: budgetSavers.saverKey })
      .from(budgetSavers)
      .where(eq(budgetSavers.saverKey, parsed.data.saverKey))
      .limit(1);

    if (saver.length === 0) {
      return NextResponse.json(
        { error: `Saver '${parsed.data.saverKey}' does not exist` },
        { status: 400 }
      );
    }
  }

  // Build update fields
  const updateFields: Record<string, unknown> = {
    mjolnirCategoryId: parsed.data.category_id,
    updatedAt: new Date(),
  };

  if (parsed.data.saverKey !== undefined) {
    updateFields.saverKey = parsed.data.saverKey;
  }
  if (parsed.data.categoryKey !== undefined) {
    updateFields.categoryKey = parsed.data.categoryKey;
  }
  if (parsed.data.tags !== undefined) {
    updateFields.tags = parsed.data.tags;
  }

  const [updated] = await db
    .update(upTransactions)
    .set(updateFields)
    .where(eq(upTransactions.id, id))
    .returning();

  // Track the correction if saver or category actually changed
  const newSaverKey = parsed.data.saverKey ?? originalTx.saverKey;
  const newCategoryKey = parsed.data.categoryKey ?? originalTx.categoryKey;
  const saverChanged = newSaverKey !== originalTx.saverKey;
  const categoryChanged = newCategoryKey !== originalTx.categoryKey;

  if ((saverChanged || categoryChanged) && newSaverKey && newCategoryKey) {
    await db.insert(classificationCorrections).values({
      transactionId: id,
      originalSaverKey: originalTx.saverKey,
      originalCategoryKey: originalTx.categoryKey,
      correctedSaverKey: newSaverKey,
      correctedCategoryKey: newCategoryKey,
      merchantDescription: originalTx.description,
    });
  }

  return NextResponse.json(updated);
}, "updating transaction classification");
