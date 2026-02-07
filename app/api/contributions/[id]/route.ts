import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contributions, holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

interface UpdateContributionBody {
  employer_contribution?: string | number;
  employee_contribution?: string | number;
  notes?: string;
}

/**
 * GET /api/contributions/:id
 *
 * Returns a single contribution by ID with holding name.
 * Ownership is validated via the parent holding's userId.
 *
 * Response: Contribution object
 *   { id, holdingId, date, employerContrib, employeeContrib, notes,
 *     createdAt, updatedAt, holdingName }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if contribution not found or doesn't belong to user
 */
export const GET = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Query with inner join to include holding info and validate ownership
  const result = await db
    .select({
      id: contributions.id,
      holdingId: contributions.holdingId,
      date: contributions.date,
      employerContrib: contributions.employerContrib,
      employeeContrib: contributions.employeeContrib,
      notes: contributions.notes,
      createdAt: contributions.createdAt,
      updatedAt: contributions.updatedAt,
      holdingName: holdings.name,
    })
    .from(contributions)
    .innerJoin(holdings, eq(contributions.holdingId, holdings.id))
    .where(
      and(
        eq(contributions.id, id),
        eq(holdings.userId, userId),
        isNull(contributions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (result.length === 0) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}, "fetching contribution");

/**
 * PATCH /api/contributions/:id
 *
 * Partially updates a contribution. Only contribution amounts and notes
 * can be changed; holding and date are immutable after creation.
 *
 * Request body (all optional):
 *   - employer_contribution: Numeric amount
 *   - employee_contribution: Numeric amount
 *   - notes: Free-text notes
 *
 * Response: Updated contribution object with holdingName
 *
 * Errors:
 *   - 400 with { errors } for validation failures or invalid JSON
 *   - 401 if not authenticated
 *   - 404 if contribution not found or doesn't belong to user
 */
export const PATCH = withAuth(async (request, context, userId) => {
  const { id } = await context.params;

  // Check if contribution exists and belongs to user
  const existing = await db
    .select({
      id: contributions.id,
      holdingId: contributions.holdingId,
      holdingName: holdings.name,
    })
    .from(contributions)
    .innerJoin(holdings, eq(contributions.holdingId, holdings.id))
    .where(
      and(
        eq(contributions.id, id),
        eq(holdings.userId, userId),
        isNull(contributions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  let body: UpdateContributionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate contribution amounts if provided
  if (body.employer_contribution !== undefined && body.employer_contribution !== "") {
    if (isNaN(Number(body.employer_contribution))) {
      errors.employer_contribution = "Employer contribution must be a number";
    }
  }

  if (body.employee_contribution !== undefined && body.employee_contribution !== "") {
    if (isNaN(Number(body.employee_contribution))) {
      errors.employee_contribution = "Employee contribution must be a number";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Build update object
  const updateData: Partial<{
    employerContrib: string;
    employeeContrib: string;
    notes: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (body.employer_contribution !== undefined) {
    updateData.employerContrib = String(body.employer_contribution || "0");
  }
  if (body.employee_contribution !== undefined) {
    updateData.employeeContrib = String(body.employee_contribution || "0");
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes?.trim() || null;
  }

  const [updated] = await db
    .update(contributions)
    .set(updateData)
    .where(eq(contributions.id, id))
    .returning();

  return NextResponse.json({
    ...updated,
    holdingName: existing[0].holdingName,
  });
}, "updating contribution");

/**
 * DELETE /api/contributions/:id
 *
 * Soft-deletes a contribution by setting `deletedAt` timestamp.
 *
 * Response: { success: true }
 *
 * Errors:
 *   - 401 if not authenticated
 *   - 404 if contribution not found or doesn't belong to user
 */
export const DELETE = withAuth(async (_request, context, userId) => {
  const { id } = await context.params;

  // Check if contribution exists and belongs to user
  const existing = await db
    .select({
      id: contributions.id,
    })
    .from(contributions)
    .innerJoin(holdings, eq(contributions.holdingId, holdings.id))
    .where(
      and(
        eq(contributions.id, id),
        eq(holdings.userId, userId),
        isNull(contributions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  // Soft delete by setting deletedAt timestamp
  await db
    .update(contributions)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contributions.id, id));

  return NextResponse.json({ success: true });
}, "deleting contribution");
