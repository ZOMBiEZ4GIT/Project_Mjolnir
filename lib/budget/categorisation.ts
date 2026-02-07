/**
 * Transaction categorisation logic for mapping UP Bank categories to Mjolnir
 * budget categories, and detecting income transactions.
 */

/**
 * Maps UP Bank category IDs to Mjolnir budget category IDs.
 *
 * UP categories follow a flat slug format (e.g. "restaurants-and-cafes").
 * Mjolnir uses a smaller set of budget categories defined in seed-categories.ts.
 */
export const UP_TO_MJOLNIR_CATEGORY_MAP: Record<string, string> = {
  // Groceries
  "groceries": "groceries",

  // Eating Out — restaurants, cafes, takeaway, pubs, coffee
  "restaurants-and-cafes": "eating-out",
  "takeaway": "eating-out",
  "pubs-and-bars": "eating-out",
  "coffee": "eating-out",

  // Transport — fuel, public transport, parking, tolls, car costs, rideshare
  "fuel": "transport",
  "public-transport": "transport",
  "parking": "transport",
  "tolls": "transport",
  "car-insurance-and-maintenance": "transport",
  "rideshare": "transport",

  // Bills & Fixed — rent, utilities, internet, mobile, home insurance
  "rent": "bills-fixed",
  "utilities": "bills-fixed",
  "internet": "bills-fixed",
  "mobile-phone": "bills-fixed",
  "home-insurance": "bills-fixed",

  // Shopping — clothing, electronics, home and garden
  "clothing-and-accessories": "shopping",
  "electronics": "shopping",
  "home-and-garden": "shopping",

  // Health — fitness, pharmacy, medical, personal care
  "health-and-fitness": "health",
  "pharmacy": "health",
  "medical": "health",
  "personal-care": "health",

  // Fun — entertainment, games, music/streaming, events, hobbies
  "entertainment": "fun",
  "games-and-software": "fun",
  "music-and-streaming": "fun",
  "events-and-gigs": "fun",
  "hobbies": "fun",

  // Misc → uncategorised
  "gifts-and-charity": "uncategorised",
  "education": "uncategorised",
  "professional-services": "uncategorised",
  "government-and-tax": "uncategorised",
};

/**
 * Maps a UP Bank category ID to the corresponding Mjolnir budget category ID.
 * Returns "uncategorised" if the UP category is null or has no mapping.
 */
export function mapUpCategory(upCategoryId: string | null): string {
  if (!upCategoryId) return "uncategorised";
  return UP_TO_MJOLNIR_CATEGORY_MAP[upCategoryId] ?? "uncategorised";
}

/**
 * Detects whether a transaction is an income deposit.
 *
 * A transaction is considered income when:
 * 1. The amount is positive (credit), AND
 * 2. Either the description matches the configured income source pattern
 *    (case-insensitive partial match), OR the amount exceeds $2,000 (200000 cents).
 */
export function isIncomeTransaction(
  description: string,
  amountCents: number,
  incomePattern: string | null
): boolean {
  if (amountCents <= 0) return false;

  if (incomePattern && description.toLowerCase().includes(incomePattern.toLowerCase())) {
    return true;
  }

  if (amountCents > 200000) {
    return true;
  }

  return false;
}
