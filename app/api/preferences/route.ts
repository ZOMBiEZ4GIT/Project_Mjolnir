import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/queries/users";

const currencies = ["AUD", "NZD", "USD"] as const;
type Currency = (typeof currencies)[number];

interface PatchBody {
  displayCurrency?: string;
  showNativeCurrency?: boolean;
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
    showNativeCurrency: preferences.showNativeCurrency,
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
  }

  // Validate showNativeCurrency if provided
  if (body.showNativeCurrency !== undefined) {
    if (typeof body.showNativeCurrency !== "boolean") {
      errors.showNativeCurrency = "showNativeCurrency must be a boolean";
    }
  }

  // Require at least one field to update
  if (body.displayCurrency === undefined && body.showNativeCurrency === undefined) {
    errors.general = "At least one of displayCurrency or showNativeCurrency is required";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const updated = await updateUserPreferences(userId, {
    displayCurrency: body.displayCurrency as Currency | undefined,
    showNativeCurrency: body.showNativeCurrency,
  });

  return NextResponse.json({
    displayCurrency: updated.displayCurrency,
    showNativeCurrency: updated.showNativeCurrency,
    updatedAt: updated.updatedAt,
  });
}
