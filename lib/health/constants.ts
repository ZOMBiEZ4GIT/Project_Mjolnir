/**
 * Health Dashboard — Constants & Helpers
 *
 * Conversion factors, default targets, time range options, and utility
 * functions shared across the health dashboard pages and API routes.
 */

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

/** 1 kilocalorie = 4.184 kilojoules */
export const KJ_TO_KCAL = 4.184;

/** Convert kilojoules to kilocalories, rounded to nearest integer. */
export function kjToKcal(kj: number): number {
  return Math.round(kj / KJ_TO_KCAL);
}

// ---------------------------------------------------------------------------
// Default targets
// ---------------------------------------------------------------------------

export const DEFAULT_CALORIE_TARGET_KCAL = 2000;
export const DEFAULT_PROTEIN_TARGET_G = 150;

// ---------------------------------------------------------------------------
// Time range options for health charts
// ---------------------------------------------------------------------------

export interface HealthTimeRange {
  value: string;
  label: string;
  days: number;
}

export const HEALTH_TIME_RANGES: HealthTimeRange[] = [
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
  { value: "6m", label: "6M", days: 183 },
  { value: "1y", label: "1Y", days: 365 },
  { value: "all", label: "All", days: 9999 },
];

/**
 * Returns an ISO date string for the start of the given range.
 * For "all", returns a date far in the past (2020-01-01).
 */
export function getStartDate(range: string): string {
  const entry = HEALTH_TIME_RANGES.find((r) => r.value === range);
  if (!entry || entry.value === "all") return "2020-01-01";
  const d = new Date();
  d.setDate(d.getDate() - entry.days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Sleep helpers
// ---------------------------------------------------------------------------

/**
 * Calculate sleep efficiency as a percentage.
 * Efficiency = total / (total + awake) * 100
 */
export function calcSleepEfficiency(
  totalHrs: number,
  awakeHrs: number
): number {
  const denominator = totalHrs + awakeHrs;
  if (denominator <= 0) return 0;
  return Math.round((totalHrs / denominator) * 100);
}
