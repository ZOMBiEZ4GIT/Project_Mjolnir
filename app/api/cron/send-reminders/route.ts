import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { users, userPreferences } from "@/lib/db/schema";
import { eq, and, or, isNull, lt } from "drizzle-orm";
import { sendCheckInReminder } from "@/lib/services/reminders";

/**
 * Get the first day of the current month as a Date object.
 * Used to filter out users who already received a reminder this month.
 */
function getFirstOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * POST /api/cron/send-reminders
 *
 * Vercel Cron endpoint for sending monthly check-in reminder emails.
 * This endpoint is called daily by Vercel Cron and sends reminders
 * only to users whose reminder_day matches the current day of the month.
 *
 * Security: Requires CRON_SECRET header to match environment variable.
 */
export async function POST(request: NextRequest) {
  // Verify CRON_SECRET for security
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    console.error("[send-reminders] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 500 }
    );
  }

  // Vercel sends the secret in Authorization header as "Bearer <secret>"
  const providedSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  // Use timing-safe comparison to prevent secret guessing via response timing
  const secretBuffer = Buffer.from(cronSecret);
  const providedBuffer = Buffer.from(providedSecret);
  const isValid =
    secretBuffer.length === providedBuffer.length &&
    timingSafeEqual(secretBuffer, providedBuffer);

  if (!isValid) {
    console.error("[send-reminders] Invalid authorization");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current day of month (1-31)
  const currentDay = new Date().getDate();

  // For days 29-31, treat as day 28 (since reminderDay max is 28)
  const effectiveDay = Math.min(currentDay, 28);

  // Get start of current month to check if reminder already sent this month
  const monthStart = getFirstOfCurrentMonth();

  // Query users who:
  // - Have email_reminders enabled
  // - reminder_day matches today
  // - Have NOT received a reminder this month (lastReminderSent is null or before this month)
  const eligibleUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      reminderDay: userPreferences.reminderDay,
      lastReminderSent: userPreferences.lastReminderSent,
    })
    .from(users)
    .innerJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(
      and(
        eq(userPreferences.emailReminders, true),
        eq(userPreferences.reminderDay, effectiveDay),
        // Skip users who already received a reminder this month
        or(
          isNull(userPreferences.lastReminderSent),
          lt(userPreferences.lastReminderSent, monthStart)
        )
      )
    );

  console.log(
    `[send-reminders] Found ${eligibleUsers.length} eligible users for day ${effectiveDay}`
  );

  // Track results
  const results: {
    userId: string;
    success: boolean;
    error?: string;
    needsCheckIn?: boolean;
  }[] = [];

  // Send reminders to each eligible user
  for (const user of eligibleUsers) {
    try {
      const result = await sendCheckInReminder({
        userId: user.userId,
        email: user.email,
        userName: user.name ?? undefined,
      });

      results.push({
        userId: user.userId,
        success: result.success,
        needsCheckIn: result.needsCheckIn,
        error: result.error,
      });

      if (result.success && result.needsCheckIn) {
        console.log(
          `[send-reminders] Sent reminder to ${user.email} for ${result.holdingsToUpdate} holdings`
        );
      } else if (result.success && !result.needsCheckIn) {
        console.log(
          `[send-reminders] Skipped ${user.email} - no holdings need check-in`
        );
      } else {
        console.error(
          `[send-reminders] Failed to send to ${user.email}: ${result.error}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        userId: user.userId,
        success: false,
        error: errorMessage,
      });
      console.error(
        `[send-reminders] Error processing ${user.email}: ${errorMessage}`
      );
    }
  }

  // Summary
  const sent = results.filter((r) => r.success && r.needsCheckIn).length;
  const skipped = results.filter((r) => r.success && !r.needsCheckIn).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    summary: {
      eligibleUsers: eligibleUsers.length,
      emailsSent: sent,
      skippedNoCheckIn: skipped,
      failed,
      currentDay: effectiveDay,
    },
  });
}

/**
 * GET /api/cron/send-reminders
 *
 * Health check endpoint for the cron job.
 * Returns status without sending any emails.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/cron/send-reminders",
    method: "POST required",
    description: "Vercel Cron endpoint for monthly check-in reminders",
  });
}
