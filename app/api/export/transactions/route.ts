import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import {
  exportTransactionsCSV,
  exportTransactionsJSON,
  TransactionWithSymbol,
} from "@/lib/export/transactions-exporter";
import { withAuth } from "@/lib/utils/with-auth";

export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";

  if (format !== "csv" && format !== "json") {
    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'json'" },
      { status: 400 }
    );
  }

  // Fetch all transactions for the user's holdings (excluding deleted)
  // Join with holdings to get the symbol
  const userTransactions = await db
    .select({
      id: transactions.id,
      holdingId: transactions.holdingId,
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      fees: transactions.fees,
      currency: transactions.currency,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      deletedAt: transactions.deletedAt,
      symbol: holdings.symbol,
    })
    .from(transactions)
    .innerJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(transactions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  // Cast to TransactionWithSymbol type
  const transactionsWithSymbol: TransactionWithSymbol[] = userTransactions;

  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "json") {
    const content = exportTransactionsJSON(transactionsWithSymbol);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="transactions-${timestamp}.json"`,
      },
    });
  }

  // CSV format
  const content = exportTransactionsCSV(transactionsWithSymbol);
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${timestamp}.csv"`,
    },
  });
}, "exporting transactions");
