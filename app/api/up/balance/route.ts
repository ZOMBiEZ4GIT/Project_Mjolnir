import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { upAccounts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { withN8nAuth } from "@/lib/api/up/middleware";

const accountSchema = z.object({
  up_account_id: z.string().min(1),
  display_name: z.string().min(1),
  account_type: z.enum(["TRANSACTIONAL", "SAVER", "HOME_LOAN"]),
  balance_cents: z.number().int(),
});

const balanceSyncSchema = z.object({
  accounts: z.array(accountSchema).min(1),
});

export async function POST(request: NextRequest) {
  return withN8nAuth(request, async (body) => {
    const parsed = balanceSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { accounts } = parsed.data;
    const now = new Date();

    for (const account of accounts) {
      // Check if account already exists
      const existing = await db
        .select({ id: upAccounts.id })
        .from(upAccounts)
        .where(eq(upAccounts.upAccountId, account.up_account_id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(upAccounts)
          .set({
            displayName: account.display_name,
            accountType: account.account_type,
            balanceCents: account.balance_cents,
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(upAccounts.upAccountId, account.up_account_id));
      } else {
        await db.insert(upAccounts).values({
          upAccountId: account.up_account_id,
          displayName: account.display_name,
          accountType: account.account_type,
          balanceCents: account.balance_cents,
          lastSyncedAt: now,
        });
      }
    }

    // Aggregate totals across all accounts
    const [totals] = await db
      .select({
        totalBalanceCents: sql<number>`coalesce(sum(${upAccounts.balanceCents}), 0)`,
        accountCount: sql<number>`count(*)`,
      })
      .from(upAccounts);

    return NextResponse.json(
      {
        total_balance_cents: Number(totals.totalBalanceCents),
        account_count: Number(totals.accountCount),
      },
      { status: 200 }
    );
  });
}
