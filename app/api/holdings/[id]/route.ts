import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Valid values for validation
const currencies = ["AUD", "NZD", "USD"] as const;
const exchanges = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;

type Currency = (typeof currencies)[number];

interface UpdateHoldingBody {
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
  isDormant?: boolean;
  notes?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session;
  const { id } = await params;

  const result = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (result.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session;

  const { id } = await params;

  // First, check if the holding exists and belongs to the user
  const existing = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  let body: UpdateHoldingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  // Validate fields if provided
  if (body.name !== undefined && body.name.trim() === "") {
    errors.name = "Name cannot be empty";
  }

  if (body.currency !== undefined && !currencies.includes(body.currency as Currency)) {
    errors.currency = `Currency must be one of: ${currencies.join(", ")}`;
  }

  if (body.exchange !== undefined && body.exchange !== null && body.exchange !== "") {
    if (!exchanges.includes(body.exchange as (typeof exchanges)[number])) {
      errors.exchange = `Exchange must be one of: ${exchanges.join(", ")}`;
    }
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Build update object
  const updateData: Partial<{
    name: string;
    symbol: string | null;
    currency: Currency;
    exchange: string | null;
    isDormant: boolean;
    notes: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) {
    updateData.name = body.name.trim();
  }
  if (body.symbol !== undefined) {
    updateData.symbol = body.symbol?.trim() || null;
  }
  if (body.currency !== undefined) {
    updateData.currency = body.currency as Currency;
  }
  if (body.exchange !== undefined) {
    updateData.exchange = body.exchange?.trim() || null;
  }
  if (body.isDormant !== undefined) {
    updateData.isDormant = body.isDormant;
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes?.trim() || null;
  }

  const [updated] = await db
    .update(holdings)
    .set(updateData)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId)
      )
    )
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session;
  const { id } = await params;

  // First, check if the holding exists and belongs to the user
  const existing = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  if (existing.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  // Soft delete by setting deletedAt timestamp
  await db
    .update(holdings)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(holdings.id, id),
        eq(holdings.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}
