/**
 * Payday date calculation utilities.
 *
 * Pure functions for computing budget periods aligned to pay cycle.
 * Payday is hardcoded to the 14th of each month with weekend adjustment:
 *   - Saturday → Friday (13th)
 *   - Sunday → Friday (12th)
 *
 * The fixed expected income is $9,168.53 (916853 cents).
 *
 * Test cases:
 *   - Feb 2026: 14th is Saturday → payday is Friday 13th
 *   - Mar 2026: 14th is Saturday → payday is Friday 13th
 *   - Apr 2026: 14th is Tuesday → payday is Tuesday 14th
 */

import { db } from "@/lib/db";
import { budgetPeriods } from "@/lib/db/schema";
import { and, lte, gte } from "drizzle-orm";

// =============================================================================
// CONSTANTS
// =============================================================================

const PAYDAY_DAY = 14;
const EXPECTED_INCOME_CENTS = 916853; // $9,168.53

// =============================================================================
// TYPES
// =============================================================================

export interface BudgetPeriod {
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
}

// =============================================================================
// PURE FUNCTIONS (no side effects)
// =============================================================================

/**
 * Adjust a date for weekends. Saturday → Friday, Sunday → Friday.
 */
function adjustForWeekends(date: Date): Date {
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 6) {
    // Saturday → Friday
    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() - 1);
    return adjusted;
  }
  if (day === 0) {
    // Sunday → Friday
    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() - 2);
    return adjusted;
  }
  return date;
}

/**
 * Get the payday date for a given year/month.
 * Always the 14th, adjusted for weekends:
 *   - Saturday → Friday (13th)
 *   - Sunday → Friday (12th)
 *
 * @param year Full year (e.g. 2026)
 * @param month 1-indexed month (1=Jan, 12=Dec)
 */
export function getPayday(year: number, month: number): Date {
  // Date constructor expects 0-indexed month
  const raw = new Date(year, month - 1, PAYDAY_DAY);
  return adjustForWeekends(raw);
}

/**
 * Generate a budget period for a given year/month.
 * Period runs from payday of (year, month) to the day before payday of the next month.
 *
 * @param year Full year (e.g. 2026)
 * @param month 1-indexed month (1=Jan, 12=Dec)
 */
export function generatePeriod(year: number, month: number): BudgetPeriod {
  const start = getPayday(year, month);

  // Next month's payday
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextPayday = getPayday(nextYear, nextMonth);

  // End date is the day before next payday
  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysInPeriod =
    Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

  return { startDate: start, endDate: end, daysInPeriod };
}

/**
 * Find which year/month period contains the given date.
 * Checks the current month's payday, then previous month if needed.
 */
function findContainingPeriod(date: Date): { year: number; month: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed

  // Check this month's payday
  const thisPayday = getPayday(year, month);
  if (thisPayday <= date) {
    return { year, month };
  }

  // Fall back to previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return { year: prevYear, month: prevMonth };
}

/**
 * Format a Date to YYYY-MM-DD string for database storage.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// =============================================================================
// DATABASE-AWARE FUNCTIONS
// =============================================================================

/**
 * Ensure a budget period exists that contains today's date.
 * If no matching period exists, auto-generates one with the fixed expected income.
 * Returns the period ID.
 */
export async function ensureCurrentPeriodExists(): Promise<string> {
  const today = new Date();
  const { year, month } = findContainingPeriod(today);
  const period = generatePeriod(year, month);

  const startStr = formatDate(period.startDate);
  const endStr = formatDate(period.endDate);

  // Check if a period already covers today
  const existing = await db
    .select()
    .from(budgetPeriods)
    .where(
      and(
        lte(budgetPeriods.startDate, formatDate(today)),
        gte(budgetPeriods.endDate, formatDate(today))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create the period
  const [created] = await db
    .insert(budgetPeriods)
    .values({
      startDate: startStr,
      endDate: endStr,
      expectedIncomeCents: EXPECTED_INCOME_CENTS,
    })
    .onConflictDoNothing()
    .returning({ id: budgetPeriods.id });

  // If conflict (another request created it), fetch it
  if (!created) {
    const [fetched] = await db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          lte(budgetPeriods.startDate, formatDate(today)),
          gte(budgetPeriods.endDate, formatDate(today))
        )
      )
      .limit(1);
    return fetched.id;
  }

  return created.id;
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * @deprecated Use getPayday() and generatePeriod() instead.
 * Legacy PaydaySettings interface for existing code that hasn't been migrated.
 */
export interface PaydaySettings {
  paydayDay: number;
  adjustForWeekends: boolean;
}

/**
 * @deprecated Use generatePeriod() instead.
 * Legacy function - maintained for existing code that passes config.
 */
export function calculateBudgetPeriod(
  _config: PaydaySettings,
  targetDate: Date
): BudgetPeriod {
  const { year, month } = findContainingPeriod(targetDate);
  return generatePeriod(year, month);
}

/**
 * @deprecated Use getPayday() instead.
 * Legacy function - maintained for existing code that passes config.
 */
export function findPaydayOnOrBefore(
  date: Date,
  _config: PaydaySettings
): Date {
  const { year, month } = findContainingPeriod(date);
  return getPayday(year, month);
}

/**
 * @deprecated Use getPayday() with next month instead.
 * Legacy function - maintained for existing code that passes config.
 */
export function findNextPayday(date: Date, _config: PaydaySettings): Date {
  const { year, month } = findContainingPeriod(date);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return getPayday(nextYear, nextMonth);
}

/**
 * @deprecated Calculate from getPayday() directly.
 * Legacy function - maintained for existing code that passes config.
 */
export function getDaysUntilPayday(
  _config: PaydaySettings,
  fromDate: Date = new Date()
): number {
  const nextPayday = findNextPayday(fromDate, _config);
  const msPerDay = 1000 * 60 * 60 * 24;

  const from = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const to = new Date(
    nextPayday.getFullYear(),
    nextPayday.getMonth(),
    nextPayday.getDate()
  );

  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}
