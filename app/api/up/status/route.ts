import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upAccounts, upTransactions } from "@/lib/db/schema";
import { isNull, sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

export const GET = withAuth(async () => {
  // Aggregate account stats
  const [accountStats] = await db
    .select({
      accountCount: sql<number>`count(*)::int`,
      totalBalanceCents: sql<number>`coalesce(sum(${upAccounts.balanceCents}), 0)`,
      lastSyncedAt: sql<string | null>`max(${upAccounts.lastSyncedAt})`,
    })
    .from(upAccounts);

  // Aggregate transaction stats (exclude soft-deleted)
  const [txStats] = await db
    .select({
      transactionCount: sql<number>`count(*)::int`,
      oldestTransactionDate: sql<string | null>`min(${upTransactions.transactionDate})`,
      newestTransactionDate: sql<string | null>`max(${upTransactions.transactionDate})`,
    })
    .from(upTransactions)
    .where(isNull(upTransactions.deletedAt));

  const accountCount = Number(accountStats.accountCount);

  return NextResponse.json({
    connected: accountCount > 0,
    account_count: accountCount,
    total_balance_cents: Number(accountStats.totalBalanceCents),
    last_synced_at: accountStats.lastSyncedAt ?? null,
    transaction_count: Number(txStats.transactionCount),
    oldest_transaction_date: txStats.oldestTransactionDate ?? null,
    newest_transaction_date: txStats.newestTransactionDate ?? null,
  });
}, "fetching UP connection status");
