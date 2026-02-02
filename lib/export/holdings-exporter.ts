/**
 * Holdings Export Utility
 * Exports holdings data to CSV or JSON format for backup purposes.
 */

import type { Holding } from "@/lib/db/schema";

/**
 * CSV column configuration for holdings export.
 * Maps display header to holding property.
 */
const CSV_COLUMNS = [
  { header: "name", key: "name" },
  { header: "symbol", key: "symbol" },
  { header: "type", key: "type" },
  { header: "currency", key: "currency" },
  { header: "exchange", key: "exchange" },
  { header: "is_dormant", key: "isDormant" },
  { header: "created_at", key: "createdAt" },
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
 * Exports holdings data to CSV format.
 *
 * @param holdings - Array of Holding objects to export
 * @returns CSV string with header row and data rows
 */
export function exportHoldingsCSV(holdings: Holding[]): string {
  // Create header row
  const headerRow = CSV_COLUMNS.map((col) => col.header).join(",");

  // Create data rows
  const dataRows = holdings.map((holding) => {
    return CSV_COLUMNS.map((col) => {
      const value = holding[col.key as keyof Holding];

      // Format specific fields
      if (col.key === "isDormant") {
        return value ? "true" : "false";
      }

      if (col.key === "createdAt" && value instanceof Date) {
        return value.toISOString();
      }

      return escapeCSVValue(value);
    }).join(",");
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Exports holdings data to JSON format.
 *
 * @param holdings - Array of Holding objects to export
 * @returns JSON string with holdings array
 */
export function exportHoldingsJSON(holdings: Holding[]): string {
  // Map holdings to export-friendly format with consistent field names
  const exportData = holdings.map((holding) => ({
    name: holding.name,
    symbol: holding.symbol,
    type: holding.type,
    currency: holding.currency,
    exchange: holding.exchange,
    is_dormant: holding.isDormant,
    created_at: holding.createdAt,
  }));

  return JSON.stringify(exportData, null, 2);
}
