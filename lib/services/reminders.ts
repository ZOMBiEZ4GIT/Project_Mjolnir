/**
 * Email reminder service for monthly check-in notifications.
 *
 * Sends personalized email reminders to users when their monthly
 * balance updates are due.
 */

import { db } from "@/lib/db";
import { holdings, snapshots, userPreferences } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { sendEmail, type SendEmailResult } from "./email";
import {
  CheckInReminderEmail,
  type HoldingsSummary,
} from "@/components/emails/check-in-reminder";
import { render } from "@react-email/components";

// Valid snapshot types (non-tradeable holdings)
const snapshotTypes = ["super", "cash", "debt"] as const;

/**
 * Get the first day of the current month in YYYY-MM-01 format
 */
function getFirstOfCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Format a date string as "Month Year" (e.g., "February 2026")
 */
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/**
 * Holdings summary with counts by type
 */
interface CheckInStatus {
  /** Whether any holdings need a check-in */
  needsCheckIn: boolean;
  /** Number of holdings needing updates */
  holdingsToUpdate: number;
  /** Total snapshot-type holdings */
  totalSnapshotHoldings: number;
  /** Current month formatted (e.g., "February 2026") */
  currentMonth: string;
  /** Breakdown by type */
  summary: HoldingsSummary;
}

/**
 * Get check-in status for a user - which holdings need current month snapshots.
 *
 * @param userId - The Clerk user ID
 * @returns Check-in status with holdings breakdown
 */
export async function getCheckInStatus(userId: string): Promise<CheckInStatus> {
  const currentMonth = getFirstOfCurrentMonth();

  // Get all active snapshot-type holdings for the user
  const allSnapshotHoldings = await db
    .select({
      id: holdings.id,
      name: holdings.name,
      type: holdings.type,
      currency: holdings.currency,
      isDormant: holdings.isDormant,
    })
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        eq(holdings.isActive, true),
        isNull(holdings.deletedAt),
        inArray(holdings.type, [...snapshotTypes])
      )
    );

  if (allSnapshotHoldings.length === 0) {
    return {
      needsCheckIn: false,
      holdingsToUpdate: 0,
      totalSnapshotHoldings: 0,
      currentMonth: formatMonthYear(currentMonth),
      summary: {
        superCount: 0,
        cashCount: 0,
        debtCount: 0,
        totalCount: 0,
      },
    };
  }

  // Get holding IDs that have snapshots for current month
  const holdingsWithSnapshot = await db
    .select({ holdingId: snapshots.holdingId })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.date, currentMonth),
        isNull(snapshots.deletedAt),
        inArray(
          snapshots.holdingId,
          allSnapshotHoldings.map((h) => h.id)
        )
      )
    );

  const holdingIdsWithSnapshot = new Set(
    holdingsWithSnapshot.map((s) => s.holdingId)
  );

  // Filter to holdings missing current month snapshot
  const holdingsMissingSnapshot = allSnapshotHoldings.filter(
    (h) => !holdingIdsWithSnapshot.has(h.id)
  );

  // Count by type
  const superCount = holdingsMissingSnapshot.filter((h) => h.type === "super").length;
  const cashCount = holdingsMissingSnapshot.filter((h) => h.type === "cash").length;
  const debtCount = holdingsMissingSnapshot.filter((h) => h.type === "debt").length;

  return {
    needsCheckIn: holdingsMissingSnapshot.length > 0,
    holdingsToUpdate: holdingsMissingSnapshot.length,
    totalSnapshotHoldings: allSnapshotHoldings.length,
    currentMonth: formatMonthYear(currentMonth),
    summary: {
      superCount,
      cashCount,
      debtCount,
      totalCount: holdingsMissingSnapshot.length,
    },
  };
}

/**
 * Options for sending a check-in reminder
 */
export interface SendCheckInReminderOptions {
  /** Clerk user ID */
  userId: string;
  /** User's email address */
  email: string;
  /** User's first name for personalized greeting */
  userName?: string;
}

/**
 * Result of sending a check-in reminder
 */
export interface SendCheckInReminderResult {
  /** Whether the reminder was sent successfully */
  success: boolean;
  /** Whether the user needs a check-in (false means no email was sent) */
  needsCheckIn: boolean;
  /** Number of holdings that need updates */
  holdingsToUpdate: number;
  /** Error message if failed */
  error?: string;
  /** Resend message ID if successful */
  messageId?: string;
}

/**
 * Sends a check-in reminder email to a user if they have holdings needing updates.
 *
 * This function:
 * 1. Checks which holdings need current month snapshots
 * 2. If there are holdings to update, sends a personalized email
 * 3. Returns status indicating whether an email was sent
 *
 * @param options - User details and email address
 * @returns Result with success status and details
 *
 * @example
 * const result = await sendCheckInReminder({
 *   userId: "user_123",
 *   email: "roland@example.com",
 *   userName: "Roland",
 * });
 *
 * if (result.success && result.needsCheckIn) {
 *   console.log("Reminder sent for", result.holdingsToUpdate, "holdings");
 * }
 */
export async function sendCheckInReminder(
  options: SendCheckInReminderOptions
): Promise<SendCheckInReminderResult> {
  const { userId, email, userName } = options;

  // Get check-in status for this user
  const status = await getCheckInStatus(userId);

  // If no holdings need updates, don't send an email
  if (!status.needsCheckIn) {
    return {
      success: true,
      needsCheckIn: false,
      holdingsToUpdate: 0,
    };
  }

  // Build the app URL from environment or default
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkInUrl = `${appUrl}/dashboard`;

  // Render the email template to HTML
  const emailHtml = await render(
    CheckInReminderEmail({
      userName,
      currentMonth: status.currentMonth,
      holdings: status.summary,
      checkInUrl,
      // Unsubscribe URL will be added in a later story (US-012)
    })
  );

  // Send the email
  const result: SendEmailResult = await sendEmail({
    to: email,
    subject: `Mjolnir: Time for your ${status.currentMonth} check-in`,
    html: emailHtml,
  });

  if (!result.success) {
    return {
      success: false,
      needsCheckIn: true,
      holdingsToUpdate: status.holdingsToUpdate,
      error: result.error,
    };
  }

  // Update lastReminderSent timestamp to track when email was sent
  await db
    .update(userPreferences)
    .set({ lastReminderSent: new Date() })
    .where(eq(userPreferences.userId, userId));

  return {
    success: true,
    needsCheckIn: true,
    holdingsToUpdate: status.holdingsToUpdate,
    messageId: result.messageId,
  };
}
