import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgetPeriods, budgetAllocations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

const allocationSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  allocatedCents: z.number().int().min(0, "Allocated cents must be non-negative"),
});

const createPeriodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  expectedIncomeCents: z.number().int().min(0, "Expected income must be non-negative"),
  notes: z.string().nullable().optional(),
  allocations: z.array(allocationSchema).optional(),
});

/**
 * GET /api/budget/periods
 *
 * Returns all budget periods with their allocations, ordered by start_date desc.
 */
export const GET = withAuth(async () => {
  const periods = await db
    .select()
    .from(budgetPeriods)
    .orderBy(desc(budgetPeriods.startDate));

  // Fetch allocations for all periods
  const periodIds = periods.map((p) => p.id);

  if (periodIds.length === 0) {
    return NextResponse.json([]);
  }

  const allAllocations = await db
    .select()
    .from(budgetAllocations);

  // Group allocations by period
  const allocationsByPeriod = new Map<string, typeof allAllocations>();
  for (const alloc of allAllocations) {
    const existing = allocationsByPeriod.get(alloc.budgetPeriodId) ?? [];
    existing.push(alloc);
    allocationsByPeriod.set(alloc.budgetPeriodId, existing);
  }

  const result = periods.map((period) => ({
    ...period,
    allocations: allocationsByPeriod.get(period.id) ?? [],
  }));

  return NextResponse.json(result);
}, "fetching budget periods");

/**
 * POST /api/budget/periods
 *
 * Creates a new budget period with optional allocations.
 *
 * Request body:
 *   - startDate: (required) YYYY-MM-DD
 *   - endDate: (required) YYYY-MM-DD
 *   - expectedIncomeCents: (required) Integer cents
 *   - notes: (optional) Text
 *   - allocations: (optional) Array of { categoryId, allocatedCents }
 *
 * Response: 201 with the created period and its allocations.
 * Includes a warning if allocations exceed expected income.
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

  const parsed = createPeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Create the period
  const [period] = await db
    .insert(budgetPeriods)
    .values({
      startDate: data.startDate,
      endDate: data.endDate,
      expectedIncomeCents: data.expectedIncomeCents,
      notes: data.notes ?? null,
    })
    .returning();

  // Create allocations if provided
  let allocations: (typeof budgetAllocations.$inferSelect)[] = [];
  if (data.allocations && data.allocations.length > 0) {
    allocations = await db
      .insert(budgetAllocations)
      .values(
        data.allocations.map((alloc) => ({
          budgetPeriodId: period.id,
          categoryId: alloc.categoryId,
          allocatedCents: alloc.allocatedCents,
        }))
      )
      .returning();
  }

  // Check if allocations exceed income (warn, not block)
  const totalAllocated = allocations.reduce(
    (sum, a) => sum + a.allocatedCents,
    0
  );
  const warning =
    totalAllocated > data.expectedIncomeCents
      ? "Total allocations exceed expected income"
      : undefined;

  return NextResponse.json(
    {
      ...period,
      allocations,
      ...(warning ? { warning } : {}),
    },
    { status: 201 }
  );
}, "creating budget period");
