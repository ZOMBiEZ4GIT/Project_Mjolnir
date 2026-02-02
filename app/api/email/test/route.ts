import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendCheckInReminder } from "@/lib/services/reminders";
import { isEmailConfigured } from "@/lib/services/email";

/**
 * POST /api/email/test
 *
 * Sends a test check-in reminder email to the current user.
 * Used to verify email configuration is working correctly.
 */
export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if email service is configured
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email service is not configured. RESEND_API_KEY is missing." },
      { status: 503 }
    );
  }

  // Get current user details from Clerk
  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Could not retrieve user details" },
      { status: 500 }
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "No email address found for user" },
      { status: 400 }
    );
  }

  // Send the test email
  const result = await sendCheckInReminder({
    userId,
    email,
    userName: user.firstName ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send test email" },
      { status: 500 }
    );
  }

  // Even if no check-in is needed, we still want to send a test email
  // So we provide feedback about what was sent
  return NextResponse.json({
    success: true,
    message: result.needsCheckIn
      ? `Test email sent to ${email} with ${result.holdingsToUpdate} holdings to update`
      : `Test email not sent: no holdings need check-in this month`,
    needsCheckIn: result.needsCheckIn,
    holdingsToUpdate: result.holdingsToUpdate,
    messageId: result.messageId,
  });
}
