/**
 * Budget Export Utility
 * Exports budget transaction and summary data to CSV format.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BudgetTransactionRow {
  date: string;
  description: string;
  rawText: string | null;
  amountCents: number;
  status: string;
  category: string;
  settledAt: string | null;
}

export interface BudgetSummaryRow {
  periodStart: string;
  periodEnd: string;
  category: string;
  budgetedCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
}

// -----------------------------------------------------------------------------
// CSV Helpers
// -----------------------------------------------------------------------------

/**
 * Escapes a value for CSV output (RFC 4180).
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any existing quotes
 * - Converts null/undefined to empty string
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

// -----------------------------------------------------------------------------
// Transactions CSV
// -----------------------------------------------------------------------------

const TRANSACTION_COLUMNS = [
  { header: "date", key: "date" },
  { header: "description", key: "description" },
  { header: "raw_text", key: "rawText" },
  { header: "amount", key: "amount" },
  { header: "status", key: "status" },
  { header: "category", key: "category" },
  { header: "settled_at", key: "settledAt" },
] as const;

export function exportBudgetTransactionsCSV(
  rows: BudgetTransactionRow[]
): string {
  const headerRow = TRANSACTION_COLUMNS.map((col) => col.header).join(",");

  const dataRows = rows.map((row) => {
    const mapped: Record<string, unknown> = {
      date: row.date,
      description: row.description,
      rawText: row.rawText,
      amount: formatCents(row.amountCents),
      status: row.status,
      category: row.category,
      settledAt: row.settledAt,
    };

    return TRANSACTION_COLUMNS.map((col) =>
      escapeCSVValue(mapped[col.key])
    ).join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

// -----------------------------------------------------------------------------
// Summary CSV
// -----------------------------------------------------------------------------

const SUMMARY_COLUMNS = [
  { header: "period_start", key: "periodStart" },
  { header: "period_end", key: "periodEnd" },
  { header: "category", key: "category" },
  { header: "budgeted", key: "budgeted" },
  { header: "spent", key: "spent" },
  { header: "remaining", key: "remaining" },
  { header: "percentage_used", key: "percentageUsed" },
] as const;

export function exportBudgetSummaryCSV(rows: BudgetSummaryRow[]): string {
  const headerRow = SUMMARY_COLUMNS.map((col) => col.header).join(",");

  const dataRows = rows.map((row) => {
    const mapped: Record<string, unknown> = {
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      category: row.category,
      budgeted: formatCents(row.budgetedCents),
      spent: formatCents(row.spentCents),
      remaining: formatCents(row.remainingCents),
      percentageUsed: row.percentageUsed.toFixed(1),
    };

    return SUMMARY_COLUMNS.map((col) =>
      escapeCSVValue(mapped[col.key])
    ).join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}
