/**
 * Currency conversion and formatting utilities.
 *
 * All values are stored in native currency (AUD/NZD/USD) and converted
 * at display time using current exchange rates.
 */

export type Currency = "AUD" | "NZD" | "USD";

/**
 * Exchange rates object structure.
 * Rates are expressed as: 1 {base} = X AUD
 * E.g., { "USD/AUD": 1.53, "NZD/AUD": 0.91 } means 1 USD = 1.53 AUD, 1 NZD = 0.91 AUD
 */
export interface ExchangeRates {
  "USD/AUD": number;
  "NZD/AUD": number;
}

/**
 * Converts an amount from one currency to another using provided exchange rates.
 *
 * Rates are expected in the format { "USD/AUD": number, "NZD/AUD": number }
 * where the rate represents how many AUD equal 1 unit of the foreign currency.
 *
 * Conversion logic:
 * - Same currency: return original amount
 * - To AUD: multiply by the rate (e.g., 100 USD * 1.53 = 153 AUD)
 * - From AUD: divide by the rate (e.g., 153 AUD / 1.53 = 100 USD)
 * - Cross rates (USD to NZD): convert via AUD as intermediary
 *
 * @param amount - The amount to convert
 * @param from - Source currency code
 * @param to - Target currency code
 * @param rates - Exchange rates object with USD/AUD and NZD/AUD rates
 * @returns Converted amount rounded to 2 decimal places
 *
 * @example
 * const rates = { "USD/AUD": 1.53, "NZD/AUD": 0.91 };
 *
 * // Same currency
 * convertCurrency(100, "AUD", "AUD", rates); // 100
 *
 * // USD to AUD
 * convertCurrency(100, "USD", "AUD", rates); // 153
 *
 * // AUD to USD
 * convertCurrency(153, "AUD", "USD", rates); // 100
 *
 * // NZD to USD (cross rate via AUD)
 * convertCurrency(100, "NZD", "USD", rates); // ~59.48
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates
): number {
  // Same currency - no conversion needed
  if (from === to) {
    return Math.round(amount * 100) / 100;
  }

  let result: number;

  // Convert to AUD first (if not already AUD)
  let amountInAud: number;

  if (from === "AUD") {
    amountInAud = amount;
  } else if (from === "USD") {
    amountInAud = amount * rates["USD/AUD"];
  } else {
    // from === "NZD"
    amountInAud = amount * rates["NZD/AUD"];
  }

  // Convert from AUD to target currency
  if (to === "AUD") {
    result = amountInAud;
  } else if (to === "USD") {
    result = amountInAud / rates["USD/AUD"];
  } else {
    // to === "NZD"
    result = amountInAud / rates["NZD/AUD"];
  }

  // Round to 2 decimal places for display
  return Math.round(result * 100) / 100;
}

/**
 * Options for formatting currency values.
 */
export interface FormatCurrencyOptions {
  /**
   * Show the currency code after the value (e.g., "$1,234.56 AUD").
   * Default: false
   */
  showCode?: boolean;

  /**
   * Show the currency symbol before the value.
   * Default: true
   */
  showSymbol?: boolean;

  /**
   * Use compact notation for large numbers (e.g., "$1.2M", "$500K").
   * Default: false
   */
  compact?: boolean;
}

/**
 * Currency symbols for supported currencies.
 * AUD uses plain $, NZD uses NZ$, USD uses US$ to differentiate.
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AUD: "$",
  NZD: "NZ$",
  USD: "US$",
};

/**
 * Formats a number as a currency string with proper symbols and formatting.
 *
 * @param amount - The amount to format
 * @param currency - The currency code (AUD, NZD, USD)
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * // Default formatting
 * formatCurrency(1234.56, "AUD"); // "$1,234.56"
 * formatCurrency(1234.56, "NZD"); // "NZ$1,234.56"
 * formatCurrency(1234.56, "USD"); // "US$1,234.56"
 *
 * // With currency code
 * formatCurrency(1234.56, "AUD", { showCode: true }); // "$1,234.56 AUD"
 *
 * // Without symbol
 * formatCurrency(1234.56, "AUD", { showSymbol: false }); // "1,234.56"
 * formatCurrency(1234.56, "AUD", { showSymbol: false, showCode: true }); // "1,234.56 AUD"
 *
 * // Negative numbers
 * formatCurrency(-1234.56, "AUD"); // "-$1,234.56"
 *
 * // Compact mode
 * formatCurrency(1234567, "AUD", { compact: true }); // "$1.2M"
 * formatCurrency(500000, "AUD", { compact: true }); // "$500K"
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options: FormatCurrencyOptions = {}
): string {
  const { showCode = false, showSymbol = true, compact = false } = options;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber: string;

  if (compact) {
    // Compact notation for large numbers
    formattedNumber = formatCompactNumber(absAmount);
  } else {
    // Standard number formatting with thousands separators
    formattedNumber = absAmount.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Build the result string
  let result = "";

  // Add negative sign first
  if (isNegative) {
    result += "-";
  }

  // Add symbol if requested
  if (showSymbol) {
    result += CURRENCY_SYMBOLS[currency];
  }

  // Add the formatted number
  result += formattedNumber;

  // Add currency code if requested
  if (showCode) {
    result += ` ${currency}`;
  }

  return result;
}

/**
 * Formats a number in compact notation (K, M, B).
 * Used internally by formatCurrency when compact option is true.
 *
 * @param amount - The absolute amount to format
 * @returns Compactly formatted number string
 */
function formatCompactNumber(amount: number): string {
  if (amount >= 1_000_000_000) {
    // Billions
    const value = amount / 1_000_000_000;
    return formatCompactValue(value) + "B";
  } else if (amount >= 1_000_000) {
    // Millions
    const value = amount / 1_000_000;
    return formatCompactValue(value) + "M";
  } else if (amount >= 1_000) {
    // Thousands
    const value = amount / 1_000;
    return formatCompactValue(value) + "K";
  } else {
    // Small numbers - use standard formatting
    return amount.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

/**
 * Formats a compact value with appropriate decimal places.
 * Shows 1 decimal place if needed, omits it for round numbers.
 *
 * @param value - The value to format (already divided by K/M/B)
 * @returns Formatted compact value
 */
function formatCompactValue(value: number): string {
  // Round to 1 decimal place
  const rounded = Math.round(value * 10) / 10;

  // If it's a whole number, don't show decimal
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }

  // Show 1 decimal place
  return rounded.toFixed(1);
}
