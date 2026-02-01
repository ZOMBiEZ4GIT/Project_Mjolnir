import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contributions, holdings, type NewContribution } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";

interface CreateContributionBody {
  holding_id?: string;
  date?: string;
  employer_contribution?: string | number;
  employee_contribution?: string | number;
  notes?: string;
}

// Normalize date to first of month (YYYY-MM-01)
function normalizeToFirstOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const holdingId = searchParams.get("holding_id");

  // Build conditions
  const conditions = [
    eq(holdings.userId, userId),
    isNull(contributions.deletedAt),
    isNull(holdings.deletedAt),
  ];

  if (holdingId) {
    conditions.push(eq(contributions.holdingId, holdingId));
  }

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
    .where(and(...conditions))
    .orderBy(desc(contributions.date));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateContributionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate required fields
  if (!body.holding_id) {
    errors.holding_id = "Holding ID is required";
  }

  if (!body.date) {
    errors.date = "Date is required";
  } else if (isNaN(Date.parse(body.date))) {
    errors.date = "Invalid date format";
  }

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

  // Return early if basic validation fails
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Validate holding exists, belongs to user, and is super type
  const holdingResult = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, body.holding_id!),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (holdingResult.length === 0) {
    return NextResponse.json(
      { errors: { holding_id: "Holding not found" } },
      { status: 400 }
    );
  }

  const holding = holdingResult[0];
  if (holding.type !== "super") {
    return NextResponse.json(
      { errors: { holding_id: "Contributions can only be added to super holdings" } },
      { status: 400 }
    );
  }

  // Normalize date to first of month
  const normalizedDate = normalizeToFirstOfMonth(body.date!);

  // Check for duplicate (same holding, same month)
  const existingContribution = await db
    .select()
    .from(contributions)
    .where(
      and(
        eq(contributions.holdingId, body.holding_id!),
        eq(contributions.date, normalizedDate),
        isNull(contributions.deletedAt)
      )
    );

  if (existingContribution.length > 0) {
    return NextResponse.json(
      { error: "Contribution already exists for this holding and month" },
      { status: 409 }
    );
  }

  // Create the contribution
  const newContribution: NewContribution = {
    holdingId: body.holding_id!,
    date: normalizedDate,
    employerContrib: body.employer_contribution ? String(body.employer_contribution) : "0",
    employeeContrib: body.employee_contribution ? String(body.employee_contribution) : "0",
    notes: body.notes?.trim() || null,
  };

  const [created] = await db.insert(contributions).values(newContribution).returning();

  // Return with holding info
  return NextResponse.json(
    {
      ...created,
      holdingName: holding.name,
    },
    { status: 201 }
  );
}
