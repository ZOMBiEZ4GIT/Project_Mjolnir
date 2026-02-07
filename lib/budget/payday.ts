/**
 * Payday date calculation utilities.
 *
 * Pure functions for computing budget periods aligned to a user's pay cycle.
 * All functions are deterministic given the same inputs — no side effects or
 * database access.
 *
 * Weekend adjustment rule: If payday falls on a Saturday, it moves to Friday.
 * If it falls on a Sunday, it also moves to the preceding Friday.
 */

export interface PaydaySettings {
  paydayDay: number; // 1-28
  adjustForWeekends: boolean;
}

export interface BudgetPeriod {
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
}

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
 * Create a date for a specific day in a given year/month.
 * Clamps to the last day of the month if the day exceeds it
 * (e.g. day 28 in February of a non-leap year is fine, but day 31 in
 * February would clamp to 28/29).
 */
function createPaydayDate(year: number, month: number, day: number): Date {
  // month is 0-indexed for Date constructor
  const date = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

/**
 * Get the effective payday date for a given year/month, applying weekend
 * adjustment if configured.
 */
function getEffectivePayday(
  year: number,
  month: number,
  config: PaydaySettings
): Date {
  const raw = createPaydayDate(year, month, config.paydayDay);
  return config.adjustForWeekends ? adjustForWeekends(raw) : raw;
}

/**
 * Find the payday that falls on or before the given date.
 *
 * Checks the current month's payday first. If it hasn't occurred yet,
 * falls back to the previous month's payday.
 */
export function findPaydayOnOrBefore(
  date: Date,
  config: PaydaySettings
): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Try this month's payday
  const thisMonthPayday = getEffectivePayday(year, month, config);
  if (thisMonthPayday <= date) {
    return thisMonthPayday;
  }

  // Fall back to previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  return getEffectivePayday(prevYear, prevMonth, config);
}

/**
 * Find the next payday strictly after the given date.
 */
export function findNextPayday(date: Date, config: PaydaySettings): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Try this month's payday
  const thisMonthPayday = getEffectivePayday(year, month, config);
  if (thisMonthPayday > date) {
    return thisMonthPayday;
  }

  // Move to next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return getEffectivePayday(nextYear, nextMonth, config);
}

/**
 * Calculate the budget period (start date to end date) that contains the
 * target date.
 *
 * A budget period starts on one payday and ends the day before the next payday.
 */
export function calculateBudgetPeriod(
  config: PaydaySettings,
  targetDate: Date
): BudgetPeriod {
  const startDate = findPaydayOnOrBefore(targetDate, config);
  const nextPayday = findNextPayday(startDate, config);

  // End date is the day before the next payday
  const endDate = new Date(nextPayday);
  endDate.setDate(endDate.getDate() - 1);

  // Calculate days in period (inclusive of both start and end)
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysInPeriod =
    Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

  return { startDate, endDate, daysInPeriod };
}

/**
 * Get the number of days until the next payday from today (or a given date).
 */
export function getDaysUntilPayday(
  config: PaydaySettings,
  fromDate: Date = new Date()
): number {
  const nextPayday = findNextPayday(fromDate, config);
  const msPerDay = 1000 * 60 * 60 * 24;

  // Strip time components for accurate day count
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
