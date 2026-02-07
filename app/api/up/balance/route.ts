import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { upAccounts, holdings, snapshots, users } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
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

    const totalBalanceCents = Number(totals.totalBalanceCents);
    const accountCount = Number(totals.accountCount);

    // --- Cash (UP) holding + snapshot auto-creation ---
    // Get the single user (Mjolnir is a single-user app)
    const [user] = await db.select({ id: users.id }).from(users).limit(1);

    if (user) {
      // Find or create the Cash (UP) holding
      const cashUpHolding = await db
        .select({ id: holdings.id })
        .from(holdings)
        .where(
          and(
            eq(holdings.userId, user.id),
            eq(holdings.name, "Cash (UP)"),
            eq(holdings.type, "cash"),
            isNull(holdings.deletedAt)
          )
        )
        .limit(1);

      let holdingId: string;

      if (cashUpHolding.length > 0) {
        holdingId = cashUpHolding[0].id;
      } else {
        const [created] = await db
          .insert(holdings)
          .values({
            userId: user.id,
            type: "cash",
            name: "Cash (UP)",
            currency: "AUD",
          })
          .returning({ id: holdings.id });
        holdingId = created.id;
      }

      // Convert cents to dollars for the snapshot balance
      const balanceDollars = (totalBalanceCents / 100).toFixed(2);

      // Today's date as YYYY-MM-DD
      const today = now.toISOString().slice(0, 10);

      // Upsert snapshot for today on the Cash (UP) holding
      const existingSnapshot = await db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(
          and(
            eq(snapshots.holdingId, holdingId),
            eq(snapshots.date, today)
          )
        )
        .limit(1);

      if (existingSnapshot.length > 0) {
        await db
          .update(snapshots)
          .set({
            balance: balanceDollars,
            updatedAt: now,
          })
          .where(eq(snapshots.id, existingSnapshot[0].id));
      } else {
        await db.insert(snapshots).values({
          holdingId,
          date: today,
          balance: balanceDollars,
          currency: "AUD",
        });
      }
    }

    return NextResponse.json(
      {
        total_balance_cents: totalBalanceCents,
        account_count: accountCount,
      },
      { status: 200 }
    );
  });
}
