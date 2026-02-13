import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { and, eq, gte, lte, ilike, isNull, or, sql, count } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/budget/transactions
 *
 * Lists UP transactions with filtering, search, and pagination.
 *
 * Query params:
 *   - category: Filter by mjolnir_category_id
 *   - saver: Filter by saver_key
 *   - status: Filter by HELD or SETTLED
 *   - from: Start date (YYYY-MM-DD)
 *   - to: End date (YYYY-MM-DD)
 *   - search: Case-insensitive search on description and raw_text
 *   - uncategorised: If "true", filters to mjolnir_category_id = 'uncategorised'
 *   - limit: Number of results (default 50)
 *   - offset: Pagination offset (default 0)
 *
 * Response: { transactions: [...], total: number }
 */
export const GET = withAuth(async (request) => {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const saver = url.searchParams.get("saver");
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const search = url.searchParams.get("search");
  const uncategorised = url.searchParams.get("uncategorised");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

  // Build where conditions
  const conditions = [
    isNull(upTransactions.deletedAt),
    eq(upTransactions.isTransfer, false),
  ];

  if (saver) {
    conditions.push(eq(upTransactions.saverKey, saver));
  }

  if (uncategorised === "true") {
    conditions.push(eq(upTransactions.mjolnirCategoryId, "uncategorised"));
  } else if (category) {
    conditions.push(eq(upTransactions.mjolnirCategoryId, category));
  }

  if (status === "HELD" || status === "SETTLED") {
    conditions.push(eq(upTransactions.status, status));
  }

  if (from) {
    conditions.push(gte(upTransactions.transactionDate, from));
  }

  if (to) {
    conditions.push(lte(upTransactions.transactionDate, to));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(upTransactions.description, searchPattern),
        ilike(upTransactions.rawText, searchPattern)
      )!
    );
  }

  const whereClause = and(...conditions);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(upTransactions)
    .where(whereClause);

  // Get paginated transactions
  const transactions = await db
    .select({
      id: upTransactions.id,
      upTransactionId: upTransactions.upTransactionId,
      description: upTransactions.description,
      rawText: upTransactions.rawText,
      amountCents: upTransactions.amountCents,
      status: upTransactions.status,
      mjolnirCategoryId: upTransactions.mjolnirCategoryId,
      saverKey: upTransactions.saverKey,
      categoryKey: upTransactions.categoryKey,
      tags: upTransactions.tags,
      transactionDate: upTransactions.transactionDate,
      settledAt: upTransactions.settledAt,
    })
    .from(upTransactions)
    .where(whereClause)
    .orderBy(sql`${upTransactions.transactionDate} desc`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ transactions, total });
}, "listing budget transactions");
