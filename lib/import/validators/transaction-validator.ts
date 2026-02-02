/**
 * Transaction Import Validator
 * Validates CSV rows for transaction imports.
 */

import { type CSVRow } from '../csv-parser';

export interface TransactionRow {
  date: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  unitPrice: number;
  fees: number | null;
  currency: string | null;
  exchange: string | null;
  notes: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: TransactionRow | null;
}

const VALID_ACTIONS = ['BUY', 'SELL', 'DIVIDEND'] as const;

/**
 * Validates a CSV row for transaction import.
 *
 * Required fields: date, symbol, action, quantity, unit_price
 * Optional fields: fees, currency, exchange, notes
 *
 * @param row - The CSV row to validate
 * @param rowNumber - The row number for error messages (optional)
 * @returns ValidationResult with valid flag, errors array, and parsed data
 */
export function validateTransactionRow(row: CSVRow, rowNumber?: number): ValidationResult {
  const errors: string[] = [];
  const rowPrefix = rowNumber !== undefined ? `Row ${rowNumber}: ` : '';

  // Check required fields exist
  const date = row.date;
  const symbol = row.symbol;
  const action = row.action;
  const quantityStr = row.quantity;
  const unitPriceStr = row.unit_price;

  // Validate date
  if (!date) {
    errors.push(`${rowPrefix}date is required`);
  } else if (!isValidDate(date)) {
    errors.push(`${rowPrefix}date "${date}" is not a valid date format (expected YYYY-MM-DD)`);
  }

  // Validate symbol
  if (!symbol) {
    errors.push(`${rowPrefix}symbol is required`);
  }

  // Validate action
  if (!action) {
    errors.push(`${rowPrefix}action is required`);
  } else if (!isValidAction(action)) {
    errors.push(`${rowPrefix}action "${action}" is invalid (must be BUY, SELL, or DIVIDEND)`);
  }

  // Validate quantity
  if (!quantityStr) {
    errors.push(`${rowPrefix}quantity is required`);
  } else {
    const quantity = parseNumber(quantityStr);
    if (quantity === null) {
      errors.push(`${rowPrefix}quantity "${quantityStr}" is not a valid number`);
    } else if (quantity <= 0) {
      errors.push(`${rowPrefix}quantity must be a positive number`);
    }
  }

  // Validate unit_price
  if (!unitPriceStr) {
    errors.push(`${rowPrefix}unit_price is required`);
  } else {
    const unitPrice = parseNumber(unitPriceStr);
    if (unitPrice === null) {
      errors.push(`${rowPrefix}unit_price "${unitPriceStr}" is not a valid number`);
    } else if (unitPrice <= 0) {
      errors.push(`${rowPrefix}unit_price must be a positive number`);
    }
  }

  // Validate optional fees (if provided, must be a non-negative number)
  const feesStr = row.fees;
  let fees: number | null = null;
  if (feesStr) {
    const parsedFees = parseNumber(feesStr);
    if (parsedFees === null) {
      errors.push(`${rowPrefix}fees "${feesStr}" is not a valid number`);
    } else if (parsedFees < 0) {
      errors.push(`${rowPrefix}fees cannot be negative`);
    } else {
      fees = parsedFees;
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
  const data: TransactionRow = {
    date: date!,
    symbol: symbol!,
    action: action!.toUpperCase() as 'BUY' | 'SELL' | 'DIVIDEND',
    quantity: parseNumber(quantityStr!)!,
    unitPrice: parseNumber(unitPriceStr!)!,
    fees,
    currency: row.currency || null,
    exchange: row.exchange || null,
    notes: row.notes || null,
  };

  return {
    valid: true,
    errors: [],
    data,
  };
}

/**
 * Validates multiple CSV rows for transaction import.
 *
 * @param rows - Array of CSV rows to validate
 * @returns Array of validation results
 */
export function validateTransactionRows(rows: CSVRow[]): ValidationResult[] {
  return rows.map((row, index) => validateTransactionRow(row, index + 2)); // +2 because row 1 is header
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
 * Checks if an action string is a valid transaction action (case-insensitive).
 */
function isValidAction(action: string): boolean {
  return VALID_ACTIONS.includes(action.toUpperCase() as typeof VALID_ACTIONS[number]);
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
