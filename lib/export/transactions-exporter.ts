/**
 * Transactions Export Utility
 * Exports transactions data to CSV or JSON format for backup purposes.
 */

import type { Transaction } from "@/lib/db/schema";

/**
 * Extended transaction type that includes symbol from related holding.
 * Used for export to provide complete transaction context.
 */
export interface TransactionWithSymbol extends Transaction {
  symbol: string | null;
}

/**
 * CSV column configuration for transactions export.
 * Maps display header to transaction property.
 */
const CSV_COLUMNS = [
  { header: "date", key: "date" },
  { header: "symbol", key: "symbol" },
  { header: "action", key: "action" },
  { header: "quantity", key: "quantity" },
  { header: "unit_price", key: "unitPrice" },
  { header: "fees", key: "fees" },
  { header: "currency", key: "currency" },
  { header: "notes", key: "notes" },
] as const;

/**
 * Escapes a value for CSV output.
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any existing quotes
 * - Converts null/undefined to empty string
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if value needs quoting
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // Double any quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Exports transactions data to CSV format.
 *
 * @param transactions - Array of Transaction objects with symbol to export
 * @returns CSV string with header row and data rows
 */
export function exportTransactionsCSV(transactions: TransactionWithSymbol[]): string {
  // Create header row
  const headerRow = CSV_COLUMNS.map((col) => col.header).join(",");

  // Create data rows
  const dataRows = transactions.map((transaction) => {
    return CSV_COLUMNS.map((col) => {
      const value = transaction[col.key as keyof TransactionWithSymbol];
      return escapeCSVValue(value);
    }).join(",");
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Exports transactions data to JSON format.
 *
 * @param transactions - Array of Transaction objects with symbol to export
 * @returns JSON string with transactions array
 */
export function exportTransactionsJSON(transactions: TransactionWithSymbol[]): string {
  // Map transactions to export-friendly format with consistent field names
  const exportData = transactions.map((transaction) => ({
    date: transaction.date,
    symbol: transaction.symbol,
    action: transaction.action,
    quantity: transaction.quantity,
    unit_price: transaction.unitPrice,
    fees: transaction.fees,
    currency: transaction.currency,
    notes: transaction.notes,
  }));

  return JSON.stringify(exportData, null, 2);
}
