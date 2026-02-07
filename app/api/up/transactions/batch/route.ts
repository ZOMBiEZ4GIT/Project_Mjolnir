import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
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

const batchSchema = z.object({
  transactions: z.array(transactionSchema),
});

const MAX_BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  return withN8nAuth(request, async (body) => {
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      // Find the first failing index if it's an array element error
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const issues = parsed.error.issues;
      for (const issue of issues) {
        if (issue.path[0] === "transactions" && typeof issue.path[1] === "number") {
          return NextResponse.json(
            {
              error: "Validation failed",
              index: issue.path[1],
              details: issue.message,
            },
            { status: 400 }
          );
        }
      }
      return NextResponse.json(
        { error: "Validation failed", details: fieldErrors },
        { status: 400 }
      );
    }

    const { transactions: txns } = parsed.data;

    if (txns.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} transactions` },
        { status: 400 }
      );
    }

    if (txns.length === 0) {
      return NextResponse.json({ inserted: 0, updated: 0 }, { status: 200 });
    }

    // Look up which transaction IDs already exist
    const upTxnIds = txns.map((t) => t.up_transaction_id);
    const existing = await db
      .select({ upTransactionId: upTransactions.upTransactionId })
      .from(upTransactions)
      .where(inArray(upTransactions.upTransactionId, upTxnIds));

    const existingIds = new Set(existing.map((e) => e.upTransactionId));

    let inserted = 0;
    let updated = 0;

    for (const data of txns) {
      const values = {
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
      };

      if (existingIds.has(data.up_transaction_id)) {
        await db
          .update(upTransactions)
          .set(values)
          .where(eq(upTransactions.upTransactionId, data.up_transaction_id));
        updated++;
      } else {
        await db.insert(upTransactions).values({
          upTransactionId: data.up_transaction_id,
          ...values,
        });
        inserted++;
      }
    }

    return NextResponse.json({ inserted, updated }, { status: 200 });
  });
}
