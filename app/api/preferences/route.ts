import { NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/queries/users";
import { withAuth } from "@/lib/utils/with-auth";

const currencies = ["AUD", "NZD", "USD"] as const;
type Currency = (typeof currencies)[number];

interface PatchBody {
  displayCurrency?: string;
  showNativeCurrency?: boolean;
  emailReminders?: boolean;
  reminderDay?: number;
}

/**
 * GET /api/preferences
 * Returns current user preferences (creates default if none exist)
 */
export const GET = withAuth(async (_request, _context, userId) => {
  const preferences = await getUserPreferences(userId);

  return NextResponse.json({
    displayCurrency: preferences.displayCurrency,
    showNativeCurrency: preferences.showNativeCurrency,
    emailReminders: preferences.emailReminders,
    reminderDay: preferences.reminderDay,
    updatedAt: preferences.updatedAt,
  });
}, "fetching preferences");

/**
 * PATCH /api/preferences
 * Updates user preferences (currently only displayCurrency)
 */
export const PATCH = withAuth(async (request, _context, userId) => {
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

  // Validate emailReminders if provided
  if (body.emailReminders !== undefined) {
    if (typeof body.emailReminders !== "boolean") {
      errors.emailReminders = "emailReminders must be a boolean";
    }
  }

  // Validate reminderDay if provided (must be 1-28)
  if (body.reminderDay !== undefined) {
    if (typeof body.reminderDay !== "number" || !Number.isInteger(body.reminderDay)) {
      errors.reminderDay = "reminderDay must be an integer";
    } else if (body.reminderDay < 1 || body.reminderDay > 28) {
      errors.reminderDay = "reminderDay must be between 1 and 28";
    }
  }

  // Require at least one field to update
  if (
    body.displayCurrency === undefined &&
    body.showNativeCurrency === undefined &&
    body.emailReminders === undefined &&
    body.reminderDay === undefined
  ) {
    errors.general = "At least one preference field is required";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const updated = await updateUserPreferences(userId, {
    displayCurrency: body.displayCurrency as Currency | undefined,
    showNativeCurrency: body.showNativeCurrency,
    emailReminders: body.emailReminders,
    reminderDay: body.reminderDay,
  });

  return NextResponse.json({
    displayCurrency: updated.displayCurrency,
    showNativeCurrency: updated.showNativeCurrency,
    emailReminders: updated.emailReminders,
    reminderDay: updated.reminderDay,
    updatedAt: updated.updatedAt,
  });
}, "updating preferences");
