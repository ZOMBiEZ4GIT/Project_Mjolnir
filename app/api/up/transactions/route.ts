import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withN8nAuth } from "@/lib/api/up/middleware";

const transactionSchema = z.object({
  up_transaction_id: z.string().min(1),
  description: z.string().min(1),
  raw_text: z.string().optional(),
  amount_cents: z.number().int(),
  status: z.enum(["HELD", "SETTLED"]),
  up_category_id: z.string().optional(),
  up_category_name: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  settled_at: z.string().optional(),
  is_transfer: z.boolean(),
});

const deleteSchema = z.object({
  up_transaction_id: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  return withN8nAuth(request, async (body) => {
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: upTransactions.id })
      .from(upTransactions)
      .where(eq(upTransactions.upTransactionId, parsed.data.up_transaction_id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    await db
      .update(upTransactions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(upTransactions.upTransactionId, parsed.data.up_transaction_id));

    return NextResponse.json({ deleted: true }, { status: 200 });
  });
}

export async function POST(request: NextRequest) {
  return withN8nAuth(request, async (body) => {
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if transaction already exists for upsert
    const existing = await db
      .select({ id: upTransactions.id })
      .from(upTransactions)
      .where(eq(upTransactions.upTransactionId, data.up_transaction_id))
      .limit(1);

    let result;

    if (existing.length > 0) {
      // Update existing transaction (handles HELD -> SETTLED transition)
      const [updated] = await db
        .update(upTransactions)
        .set({
          description: data.description,
          rawText: data.raw_text ?? null,
          amountCents: data.amount_cents,
          status: data.status,
          upCategoryId: data.up_category_id ?? null,
          upCategoryName: data.up_category_name ?? null,
          transactionDate: data.transaction_date,
          settledAt: data.settled_at ? new Date(data.settled_at) : null,
          isTransfer: data.is_transfer,
          updatedAt: new Date(),
        })
        .where(eq(upTransactions.upTransactionId, data.up_transaction_id))
        .returning();

      result = updated;
    } else {
      // Insert new transaction
      const [inserted] = await db
        .insert(upTransactions)
        .values({
          upTransactionId: data.up_transaction_id,
          description: data.description,
          rawText: data.raw_text ?? null,
          amountCents: data.amount_cents,
          status: data.status,
          upCategoryId: data.up_category_id ?? null,
          upCategoryName: data.up_category_name ?? null,
          transactionDate: data.transaction_date,
          settledAt: data.settled_at ? new Date(data.settled_at) : null,
          isTransfer: data.is_transfer,
        })
        .returning();

      result = inserted;
    }

    return NextResponse.json(result, { status: 200 });
  });
}
