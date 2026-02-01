import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contributions, holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

interface UpdateContributionBody {
  employer_contribution?: string | number;
  employee_contribution?: string | number;
  notes?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}
