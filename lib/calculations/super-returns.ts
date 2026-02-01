import { db } from "@/lib/db";
import { snapshots, contributions, holdings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Calculate investment returns for a super fund between two dates.
 *
 * Investment returns = (new_balance - old_balance) - employer_contrib - employee_contrib
 *
 * This separates the growth of a super fund into:
 * - Contributions (employer + employee) - what was put in
 * - Investment returns - what the market gave/took
 *
 * @param holdingId - The super holding ID
 * @param userId - The user ID for ownership validation
 * @param fromDate - Start date (first of month, e.g., "2024-01-01")
 * @param toDate - End date (first of month, e.g., "2024-02-01")
 * @returns Investment returns as a number, or null if missing previous snapshot
 */
export async function calculateInvestmentReturns(
  holdingId: string,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<number | null> {
  // Validate the holding exists and belongs to the user
  const holding = await db
    .select({ id: holdings.id, type: holdings.type })
    .from(holdings)
    .where(
      and(
        eq(holdings.id, holdingId),
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    )
    .limit(1);

  if (holding.length === 0) {
    return null;
  }

  // Only super holdings have contributions to track
  if (holding[0].type !== "super") {
    return null;
  }

  // Get the snapshot at fromDate (old balance)
  const oldSnapshot = await db
    .select({ balance: snapshots.balance })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.holdingId, holdingId),
        eq(snapshots.date, fromDate),
        isNull(snapshots.deletedAt)
      )
    )
    .limit(1);

  // Cannot calculate returns without a previous snapshot
  if (oldSnapshot.length === 0) {
    return null;
  }

  // Get the snapshot at toDate (new balance)
  const newSnapshot = await db
    .select({ balance: snapshots.balance })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.holdingId, holdingId),
        eq(snapshots.date, toDate),
        isNull(snapshots.deletedAt)
      )
    )
    .limit(1);

  // Cannot calculate returns without the current snapshot
  if (newSnapshot.length === 0) {
    return null;
  }

  // Get contributions for toDate (contributions recorded for the period ending at toDate)
  // If no contribution record exists, treat as 0 contributions
  const contribution = await db
    .select({
      employerContrib: contributions.employerContrib,
      employeeContrib: contributions.employeeContrib,
    })
    .from(contributions)
    .where(
      and(
        eq(contributions.holdingId, holdingId),
        eq(contributions.date, toDate),
        isNull(contributions.deletedAt)
      )
    )
    .limit(1);

  // Parse balances (Drizzle returns decimal as string)
  const oldBalance = Number(oldSnapshot[0].balance);
  const newBalance = Number(newSnapshot[0].balance);

  // Parse contributions (default to 0 if no record exists)
  let employerContrib = 0;
  let employeeContrib = 0;
  if (contribution.length > 0) {
    employerContrib = Number(contribution[0].employerContrib);
    employeeContrib = Number(contribution[0].employeeContrib);
  }

  // Investment returns = (new_balance - old_balance) - total_contributions
  const investmentReturns =
    newBalance - oldBalance - employerContrib - employeeContrib;

  return investmentReturns;
}

/**
 * Calculate investment returns for a super fund for a specific month.
 * This is a convenience wrapper that compares the previous month to the target month.
 *
 * @param holdingId - The super holding ID
 * @param userId - The user ID for ownership validation
 * @param monthDate - The target month (first of month, e.g., "2024-02-01")
 * @returns Investment returns for that month, or null if missing previous snapshot
 */
export async function calculateMonthlyInvestmentReturns(
  holdingId: string,
  userId: string,
  monthDate: string
): Promise<number | null> {
  // Parse the month date and get the previous month
  const targetDate = new Date(monthDate);
  const previousMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() - 1,
    1
  );

  const fromDate = previousMonth.toISOString().split("T")[0];
  const toDate = monthDate;

  return calculateInvestmentReturns(holdingId, userId, fromDate, toDate);
}
