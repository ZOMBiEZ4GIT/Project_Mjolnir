import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { and, eq, isNull, count } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/budget/transactions/uncategorised-count
 *
 * Returns the count of uncategorised, non-transfer, non-deleted transactions.
 * Used by the navigation badge to indicate items needing attention.
 */
export const GET = withAuth(async () => {
  const [{ total }] = await db
    .select({ total: count() })
    .from(upTransactions)
    .where(
      and(
        eq(upTransactions.mjolnirCategoryId, "uncategorised"),
        eq(upTransactions.isTransfer, false),
        isNull(upTransactions.deletedAt)
      )
    );

  return NextResponse.json({ count: total });
}, "fetching uncategorised count");
