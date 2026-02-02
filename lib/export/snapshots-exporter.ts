/**
 * Snapshots Export Utility
 * Exports snapshots data to CSV or JSON format for backup purposes.
 * Includes related holding name and optional contribution data.
 */

import type { Snapshot } from "@/lib/db/schema";

/**
 * Extended snapshot type that includes holding name and optional contributions.
 * Used for export to provide complete snapshot context.
 */
export interface SnapshotWithDetails extends Snapshot {
  holdingName: string;
  employerContrib?: string | null;
  employeeContrib?: string | null;
}

/**
 * CSV column configuration for snapshots export.
 * Maps display header to snapshot property.
 */
const CSV_COLUMNS = [
  { header: "date", key: "date" },
  { header: "holding_name", key: "holdingName" },
  { header: "balance", key: "balance" },
  { header: "currency", key: "currency" },
  { header: "employer_contrib", key: "employerContrib" },
  { header: "employee_contrib", key: "employeeContrib" },
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
 * Exports snapshots data to CSV format.
 *
 * @param snapshots - Array of Snapshot objects with holding name and optional contributions to export
 * @returns CSV string with header row and data rows
 */
export function exportSnapshotsCSV(snapshots: SnapshotWithDetails[]): string {
  // Create header row
  const headerRow = CSV_COLUMNS.map((col) => col.header).join(",");

  // Create data rows
  const dataRows = snapshots.map((snapshot) => {
    return CSV_COLUMNS.map((col) => {
      const value = snapshot[col.key as keyof SnapshotWithDetails];
      return escapeCSVValue(value);
    }).join(",");
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Exports snapshots data to JSON format.
 *
 * @param snapshots - Array of Snapshot objects with holding name and optional contributions to export
 * @returns JSON string with snapshots array
 */
export function exportSnapshotsJSON(snapshots: SnapshotWithDetails[]): string {
  // Map snapshots to export-friendly format with consistent field names
  const exportData = snapshots.map((snapshot) => ({
    date: snapshot.date,
    holding_name: snapshot.holdingName,
    balance: snapshot.balance,
    currency: snapshot.currency,
    employer_contrib: snapshot.employerContrib ?? null,
    employee_contrib: snapshot.employeeContrib ?? null,
  }));

  return JSON.stringify(exportData, null, 2);
}
