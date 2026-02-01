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
