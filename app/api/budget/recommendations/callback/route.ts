import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiRecommendations } from "@/lib/db/schema";
import { withN8nAuth } from "@/lib/api/up/middleware";
import { ensureCurrentPeriodExists } from "@/lib/budget/payday";

// ---------------------------------------------------------------------------
// Zod schema for the new structured recommendation callback from n8n
// ---------------------------------------------------------------------------

const saverStatusSchema = z.object({
  saverKey: z.string(),
  status: z.enum(["green", "amber", "red"]),
  message: z.string().optional(),
});

const goalProgressSchema = z.object({
  goalName: z.string(),
  percentComplete: z.number(),
  onTrack: z.boolean(),
  message: z.string().optional(),
});

const budgetAdjustmentSchema = z.object({
  saverKey: z.string(),
  currentCents: z.number().int(),
  suggestedCents: z.number().int(),
  reason: z.string(),
});

const savingsProjectionSchema = z.object({
  currentRate: z.number(),
  projectedRate: z.number(),
  monthlyIncreaseCents: z.number().int(),
});

const callbackPayloadSchema = z.object({
  overallStatus: z.enum(["green", "amber", "red"]),
  saverStatuses: z.array(saverStatusSchema).optional(),
  goalProgress: z.array(goalProgressSchema).optional(),
  budgetAdjustments: z.array(budgetAdjustmentSchema).optional(),
  insights: z.array(z.string()).min(1),
  actionableTip: z.string().min(1),
  savingsProjection: savingsProjectionSchema.optional(),
});

export async function POST(request: NextRequest) {
  return withN8nAuth(request, async (body) => {
    const parsed = callbackPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Find the budget period containing today
    const budgetPeriodId = await ensureCurrentPeriodExists();

    await db.insert(aiRecommendations).values({
      budgetPeriodId,
      // Backwards compat: store the full payload in the existing JSONB column
      recommendationData: data,
      status: "pending",
      // Structured fields
      overallStatus: data.overallStatus,
      saverStatuses: data.saverStatuses ?? null,
      goalProgress: data.goalProgress ?? null,
      budgetAdjustments: data.budgetAdjustments ?? null,
      insights: data.insights,
      actionableTip: data.actionableTip,
      savingsProjection: data.savingsProjection ?? null,
      rawResponse: body,
      generatedAt: new Date(),
    });

    return NextResponse.json({ stored: true }, { status: 200 });
  });
}
