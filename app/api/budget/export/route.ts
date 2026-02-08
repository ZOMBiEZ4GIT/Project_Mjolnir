import { NextResponse } from "next/server";
import { and, eq, gte, lte, isNull, sql, desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import {
  upTransactions,
  budgetCategories,
  budgetPeriods,
} from "@/lib/db/schema";
import { calculateBudgetSummary } from "@/lib/budget/summary";
import {
  exportBudgetTransactionsCSV,
  exportBudgetSummaryCSV,
  type BudgetTransactionRow,
  type BudgetSummaryRow,
} from "@/lib/export/budget-exporter";

/**
 * GET /api/budget/export
 *
 * Exports budget data as CSV.
 *
 * Query params:
 *   - type: 'transactions' or 'summary' (required)
 *   - from: Start date filter (YYYY-MM-DD, optional)
 *   - to: End date filter (YYYY-MM-DD, optional)
 *
 * Returns CSV with Content-Type: text/csv and Content-Disposition attachment.
 */
export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (type !== "transactions" && type !== "summary") {
    return NextResponse.json(
      { error: "Invalid type. Use 'transactions' or 'summary'" },
      { status: 400 }
    );
  }

  // Build date range string for filename
  const dateRangeParts: string[] = [];
  if (from) dateRangeParts.push(from);
  if (to) dateRangeParts.push(to);
  const dateRangeSuffix =
    dateRangeParts.length > 0 ? `-${dateRangeParts.join("-to-")}` : "";
  const timestamp = new Date().toISOString().split("T")[0];

  if (type === "transactions") {
    return exportTransactions(from, to, timestamp, dateRangeSuffix);
  }

  return exportSummary(from, to, timestamp, dateRangeSuffix);
}, "exporting budget data");

// -----------------------------------------------------------------------------
// Transactions Export
// -----------------------------------------------------------------------------

async function exportTransactions(
  from: string | null,
  to: string | null,
  timestamp: string,
  dateRangeSuffix: string
) {
  // Build where conditions
  const conditions = [
    isNull(upTransactions.deletedAt),
    eq(upTransactions.isTransfer, false),
  ];

  if (from) {
    conditions.push(gte(upTransactions.transactionDate, from));
  }
  if (to) {
    conditions.push(lte(upTransactions.transactionDate, to));
  }

  // Fetch all matching transactions with category name
  const rows = await db
    .select({
      date: upTransactions.transactionDate,
      description: upTransactions.description,
      rawText: upTransactions.rawText,
      amountCents: upTransactions.amountCents,
      status: upTransactions.status,
      categoryName: sql<string>`COALESCE(${budgetCategories.name}, ${upTransactions.mjolnirCategoryId}, '')`,
      settledAt: upTransactions.settledAt,
    })
    .from(upTransactions)
    .leftJoin(
      budgetCategories,
      eq(upTransactions.mjolnirCategoryId, budgetCategories.id)
    )
    .where(and(...conditions))
    .orderBy(sql`${upTransactions.transactionDate} desc`);

  const exportRows: BudgetTransactionRow[] = rows.map((row) => ({
    date: row.date,
    description: row.description,
    rawText: row.rawText,
    amountCents: Number(row.amountCents),
    status: row.status,
    category: row.categoryName,
    settledAt: row.settledAt ? row.settledAt.toISOString() : null,
  }));

  const csv = exportBudgetTransactionsCSV(exportRows);
  const filename = `budget-transactions${dateRangeSuffix}-${timestamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// -----------------------------------------------------------------------------
// Summary Export
// -----------------------------------------------------------------------------

async function exportSummary(
  from: string | null,
  to: string | null,
  timestamp: string,
  dateRangeSuffix: string
) {
  // Fetch periods matching the date range
  const conditions = [];

  if (from) {
    conditions.push(gte(budgetPeriods.startDate, from));
  }
  if (to) {
    conditions.push(lte(budgetPeriods.endDate, to));
  }

  const periods = await db
    .select({ id: budgetPeriods.id })
    .from(budgetPeriods)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(budgetPeriods.startDate));

  if (periods.length === 0) {
    const csv = exportBudgetSummaryCSV([]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="budget-summary${dateRangeSuffix}-${timestamp}.csv"`,
      },
    });
  }

  // Calculate summaries for all matching periods
  const summaries = await Promise.all(
    periods.map((p) => calculateBudgetSummary(p.id))
  );

  // Flatten category breakdowns into rows
  const exportRows: BudgetSummaryRow[] = [];
  for (const summary of summaries) {
    for (const cat of summary.categories) {
      exportRows.push({
        periodStart: summary.startDate,
        periodEnd: summary.endDate,
        category: cat.categoryName,
        budgetedCents: cat.budgetedCents,
        spentCents: cat.spentCents,
        remainingCents: cat.remainingCents,
        percentageUsed: cat.percentUsed,
      });
    }
  }

  const csv = exportBudgetSummaryCSV(exportRows);
  const filename = `budget-summary${dateRangeSuffix}-${timestamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
