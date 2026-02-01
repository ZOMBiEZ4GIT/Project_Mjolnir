import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/queries/users";

const currencies = ["AUD", "NZD", "USD"] as const;
type Currency = (typeof currencies)[number];

interface PatchBody {
  displayCurrency?: string;
}

/**
 * GET /api/preferences
 * Returns current user preferences (creates default if none exist)
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getUserPreferences(userId);

  return NextResponse.json({
    displayCurrency: preferences.displayCurrency,
    updatedAt: preferences.updatedAt,
  });
}

/**
 * PATCH /api/preferences
 * Updates user preferences (currently only displayCurrency)
 */
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  // Validate displayCurrency if provided
  if (body.displayCurrency !== undefined) {
    if (!currencies.includes(body.displayCurrency as Currency)) {
      errors.displayCurrency = `Currency must be one of: ${currencies.join(", ")}`;
    }
  } else {
    errors.displayCurrency = "displayCurrency is required";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const updated = await updateUserPreferences(
    userId,
    body.displayCurrency as Currency
  );

  return NextResponse.json({
    displayCurrency: updated.displayCurrency,
    updatedAt: updated.updatedAt,
  });
}
