import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiRecommendations } from "@/lib/db/schema";
import { withN8nAuth } from "@/lib/api/up/middleware";

const suggestedBudgetItemSchema = z.object({
  categoryId: z.string(),
  currentCents: z.number().int(),
  suggestedCents: z.number().int(),
  reason: z.string(),
});

const paySplitItemSchema = z.object({
  saverName: z.string(),
  percentage: z.number(),
  amountCents: z.number().int(),
});

const savingsProjectionSchema = z.object({
  currentRate: z.number(),
  projectedRate: z.number(),
  monthlyIncreaseCents: z.number().int(),
});

const callbackPayloadSchema = z.object({
  budget_period_id: z.string().uuid(),
  suggestedBudget: z.array(suggestedBudgetItemSchema),
  paySplitConfig: z.array(paySplitItemSchema),
  insights: z.array(z.string()),
  savingsProjection: savingsProjectionSchema,
  actionableTip: z.string(),
  generatedAt: z.string(),
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

    const { budget_period_id, ...rest } = parsed.data;

    await db.insert(aiRecommendations).values({
      budgetPeriodId: budget_period_id,
      recommendationData: rest,
      status: "pending",
    });

    return NextResponse.json({ stored: true }, { status: 200 });
  });
}
