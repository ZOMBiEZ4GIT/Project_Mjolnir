import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { paydayConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import {
  calculateBudgetPeriod,
  type PaydaySettings,
} from "@/lib/budget/payday";

const updatePaydaySchema = z.object({
  paydayDay: z.number().int().min(1).max(28),
  adjustForWeekends: z.boolean(),
  incomeSourcePattern: z.string().max(255).nullable().optional(),
});

const DEFAULT_PAYDAY_DAY = 15;
const DEFAULT_ADJUST_FOR_WEEKENDS = true;

function buildResponse(config: {
  id: string;
  paydayDay: number;
  adjustForWeekends: boolean;
  incomeSourcePattern: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const settings: PaydaySettings = {
    paydayDay: config.paydayDay,
    adjustForWeekends: config.adjustForWeekends,
  };
  const currentPeriod = calculateBudgetPeriod(settings, new Date());

  return {
    ...config,
    currentPeriod: {
      startDate: currentPeriod.startDate.toISOString().split("T")[0],
      endDate: currentPeriod.endDate.toISOString().split("T")[0],
      daysInPeriod: currentPeriod.daysInPeriod,
    },
  };
}

/**
 * GET /api/budget/payday
 *
 * Returns the current payday configuration, or sensible defaults
 * (day 15, adjust_for_weekends true) if none has been saved yet.
 * The response includes the calculated current budget period dates.
 */
export const GET = withAuth(async () => {
  const rows = await db.select().from(paydayConfig);
  const existing = rows[0];

  if (existing) {
    return NextResponse.json(buildResponse(existing));
  }

  // Return defaults without persisting — let the user explicitly save
  const now = new Date();
  const defaults = {
    id: "",
    paydayDay: DEFAULT_PAYDAY_DAY,
    adjustForWeekends: DEFAULT_ADJUST_FOR_WEEKENDS,
    incomeSourcePattern: null,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json(buildResponse(defaults));
}, "fetching payday configuration");

/**
 * PUT /api/budget/payday
 *
 * Create or update the payday configuration (upsert).
 *
 * Request body:
 *   - paydayDay: (required) Integer 1-28
 *   - adjustForWeekends: (required) Boolean
 *   - incomeSourcePattern: (optional) String or null
 *
 * Response: 200 with the saved config and current budget period dates.
 */
export const PUT = withAuth(async (request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updatePaydaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check for existing config
  const rows = await db.select().from(paydayConfig);
  const existing = rows[0];

  let saved;

  if (existing) {
    // Update existing
    [saved] = await db
      .update(paydayConfig)
      .set({
        paydayDay: data.paydayDay,
        adjustForWeekends: data.adjustForWeekends,
        incomeSourcePattern: data.incomeSourcePattern ?? existing.incomeSourcePattern,
        updatedAt: new Date(),
      })
      .where(eq(paydayConfig.id, existing.id))
      .returning();
  } else {
    // Insert new
    [saved] = await db
      .insert(paydayConfig)
      .values({
        paydayDay: data.paydayDay,
        adjustForWeekends: data.adjustForWeekends,
        incomeSourcePattern: data.incomeSourcePattern ?? null,
      })
      .returning();
  }

  return NextResponse.json(buildResponse(saved));
}, "updating payday configuration");
