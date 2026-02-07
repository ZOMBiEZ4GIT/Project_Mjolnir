import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgetCategories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { seedBudgetCategories } from "@/lib/db/seed-categories";

const createCategorySchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .max(255)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1, "Name is required").max(255),
  icon: z.string().min(1, "Icon is required").max(255),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a valid hex colour (e.g. #FF5733)"),
  sortOrder: z.number().int().min(0).optional(),
  isIncome: z.boolean().optional(),
});

/**
 * GET /api/budget/categories
 *
 * Returns all budget categories sorted by sort_order.
 * If no categories exist, seeds default categories first.
 */
export const GET = withAuth(async () => {
  let categories = await db
    .select()
    .from(budgetCategories)
    .orderBy(asc(budgetCategories.sortOrder));

  // Auto-seed defaults if no categories exist
  if (categories.length === 0) {
    await seedBudgetCategories();
    categories = await db
      .select()
      .from(budgetCategories)
      .orderBy(asc(budgetCategories.sortOrder));
  }

  return NextResponse.json(categories);
}, "fetching budget categories");

/**
 * POST /api/budget/categories
 *
 * Creates a custom budget category.
 *
 * Request body:
 *   - id: (required) Lowercase slug e.g. "subscriptions"
 *   - name: (required) Display name
 *   - icon: (required) Lucide icon name
 *   - colour: (required) Hex colour e.g. "#FF5733"
 *   - sortOrder: (optional) Integer for ordering
 *   - isIncome: (optional) Boolean, default false
 *
 * Response: 201 with the created category
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

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Determine sort_order if not provided — place after existing categories
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const existing = await db
      .select({ sortOrder: budgetCategories.sortOrder })
      .from(budgetCategories)
      .orderBy(asc(budgetCategories.sortOrder));
    sortOrder = existing.length > 0
      ? existing[existing.length - 1].sortOrder + 1
      : 1;
  }

  const [created] = await db
    .insert(budgetCategories)
    .values({
      id: data.id,
      name: data.name,
      icon: data.icon,
      colour: data.colour,
      sortOrder,
      isIncome: data.isIncome ?? false,
      isSystem: false, // Custom categories are never system categories
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}, "creating budget category");
