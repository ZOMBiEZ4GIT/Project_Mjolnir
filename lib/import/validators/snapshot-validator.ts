/**
 * Snapshot Import Validator
 * Validates CSV rows for snapshot imports (super, cash, debt).
 */

import { type CSVRow } from '../csv-parser';

export interface SnapshotRow {
  date: string;
  fundName: string;
  balance: number;
  employerContrib: number | null;
  employeeContrib: number | null;
  currency: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: SnapshotRow | null;
}

/**
 * Validates a CSV row for snapshot import.
 *
 * Required fields: date, fund_name, balance
 * Optional fields: employer_contrib, employee_contrib, currency
 *
 * @param row - The CSV row to validate
 * @param rowNumber - The row number for error messages (optional)
 * @returns ValidationResult with valid flag, errors array, and parsed data
 */
export function validateSnapshotRow(row: CSVRow, rowNumber?: number): ValidationResult {
  const errors: string[] = [];
  const rowPrefix = rowNumber !== undefined ? `Row ${rowNumber}: ` : '';

  // Check required fields exist
  const date = row.date;
  const fundName = row.fund_name;
  const balanceStr = row.balance;

  // Validate date
  if (!date) {
    errors.push(`${rowPrefix}date is required`);
  } else if (!isValidDate(date)) {
    errors.push(`${rowPrefix}date "${date}" is not a valid date format (expected YYYY-MM-DD)`);
  }

  // Validate fund_name
  if (!fundName) {
    errors.push(`${rowPrefix}fund_name is required`);
  }

  // Validate balance
  if (!balanceStr) {
    errors.push(`${rowPrefix}balance is required`);
  } else {
    const balance = parseNumber(balanceStr);
    if (balance === null) {
      errors.push(`${rowPrefix}balance "${balanceStr}" is not a valid number`);
    }
    // Note: balance can be negative (for debt) or zero
  }

  // Validate optional employer_contrib (if provided, must be a non-negative number)
  const employerContribStr = row.employer_contrib;
  let employerContrib: number | null = null;
  if (employerContribStr) {
    const parsed = parseNumber(employerContribStr);
    if (parsed === null) {
      errors.push(`${rowPrefix}employer_contrib "${employerContribStr}" is not a valid number`);
    } else if (parsed < 0) {
      errors.push(`${rowPrefix}employer_contrib cannot be negative`);
    } else {
      employerContrib = parsed;
    }
  }

  // Validate optional employee_contrib (if provided, must be a non-negative number)
  const employeeContribStr = row.employee_contrib;
  let employeeContrib: number | null = null;
  if (employeeContribStr) {
    const parsed = parseNumber(employeeContribStr);
    if (parsed === null) {
      errors.push(`${rowPrefix}employee_contrib "${employeeContribStr}" is not a valid number`);
    } else if (parsed < 0) {
      errors.push(`${rowPrefix}employee_contrib cannot be negative`);
    } else {
      employeeContrib = parsed;
    }
  }

  // If there are errors, return invalid result
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      data: null,
    };
  }

  // All validations passed - construct the data object
  const data: SnapshotRow = {
    date: date!,
    fundName: fundName!,
    balance: parseNumber(balanceStr!)!,
    employerContrib,
    employeeContrib,
    currency: row.currency || null,
  };

  return {
    valid: true,
    errors: [],
    data,
  };
}

/**
 * Validates multiple CSV rows for snapshot import.
 *
 * @param rows - Array of CSV rows to validate
 * @returns Array of validation results
 */
export function validateSnapshotRows(rows: CSVRow[]): ValidationResult[] {
  return rows.map((row, index) => validateSnapshotRow(row, index + 2)); // +2 because row 1 is header
}

/**
 * Checks if a string is a valid date in YYYY-MM-DD format.
 */
function isValidDate(dateStr: string): boolean {
  // Check format with regex first
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  // Parse and check if it's a real date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Verify the date parses back to the same string (catches invalid dates like 2024-02-30)
  const [year, month, day] = dateStr.split('-').map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

/**
 * Parses a string to a number, returning null if invalid.
 */
function parseNumber(value: string): number | null {
  // Remove any commas (for numbers like "1,000.50")
  const cleaned = value.replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}
