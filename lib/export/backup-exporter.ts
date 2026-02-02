/**
 * Full Backup Export Utility
 * Exports all data (holdings, transactions, snapshots, contributions) as a single JSON backup.
 */

import type { Holding, Contribution } from "@/lib/db/schema";
import type { TransactionWithSymbol } from "./transactions-exporter";
import type { SnapshotWithDetails } from "./snapshots-exporter";

/**
 * Extended contribution type that includes holding name for context.
 */
export interface ContributionWithHoldingName extends Contribution {
  holdingName: string;
}

/**
 * Backup metadata included in the export file.
 */
export interface BackupMetadata {
  export_date: string;
  version: string;
  user_id: string;
}

/**
 * Full backup data structure containing all exportable data.
 */
export interface FullBackupData {
  metadata: BackupMetadata;
  holdings: ReturnType<typeof mapHoldingForExport>[];
  transactions: ReturnType<typeof mapTransactionForExport>[];
  snapshots: ReturnType<typeof mapSnapshotForExport>[];
  contributions: ReturnType<typeof mapContributionForExport>[];
}

/**
 * Input data structure for creating a full backup.
 */
export interface FullBackupInput {
  holdings: Holding[];
  transactions: TransactionWithSymbol[];
  snapshots: SnapshotWithDetails[];
  contributions: ContributionWithHoldingName[];
  userId: string;
}

/**
 * Maps a holding to export-friendly format with consistent field names.
 */
function mapHoldingForExport(holding: Holding) {
  return {
    name: holding.name,
    symbol: holding.symbol,
    type: holding.type,
    currency: holding.currency,
    exchange: holding.exchange,
    is_dormant: holding.isDormant,
    created_at: holding.createdAt,
  };
}

/**
 * Maps a transaction to export-friendly format with consistent field names.
 */
function mapTransactionForExport(transaction: TransactionWithSymbol) {
  return {
    date: transaction.date,
    symbol: transaction.symbol,
    action: transaction.action,
    quantity: transaction.quantity,
    unit_price: transaction.unitPrice,
    fees: transaction.fees,
    currency: transaction.currency,
    notes: transaction.notes,
  };
}

/**
 * Maps a snapshot to export-friendly format with consistent field names.
 */
function mapSnapshotForExport(snapshot: SnapshotWithDetails) {
  return {
    date: snapshot.date,
    holding_name: snapshot.holdingName,
    balance: snapshot.balance,
    currency: snapshot.currency,
    employer_contrib: snapshot.employerContrib ?? null,
    employee_contrib: snapshot.employeeContrib ?? null,
  };
}

/**
 * Maps a contribution to export-friendly format with consistent field names.
 */
function mapContributionForExport(contribution: ContributionWithHoldingName) {
  return {
    date: contribution.date,
    holding_name: contribution.holdingName,
    employer_contrib: contribution.employerContrib,
    employee_contrib: contribution.employeeContrib,
    notes: contribution.notes,
  };
}

/**
 * Current backup format version.
 * Increment when making breaking changes to the backup structure.
 */
const BACKUP_VERSION = "1.0.0";

/**
 * Exports all data as a full backup JSON file.
 *
 * @param input - Object containing holdings, transactions, snapshots, contributions, and userId
 * @returns JSON string with complete backup data including metadata
 */
export function exportFullBackupJSON(input: FullBackupInput): string {
  const { holdings, transactions, snapshots, contributions, userId } = input;

  const backupData: FullBackupData = {
    metadata: {
      export_date: new Date().toISOString(),
      version: BACKUP_VERSION,
      user_id: userId,
    },
    holdings: holdings.map(mapHoldingForExport),
    transactions: transactions.map(mapTransactionForExport),
    snapshots: snapshots.map(mapSnapshotForExport),
    contributions: contributions.map(mapContributionForExport),
  };

  return JSON.stringify(backupData, null, 2);
}
