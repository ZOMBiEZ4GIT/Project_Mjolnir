import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/services/unsubscribe-token";

/**
 * GET /api/email/unsubscribe?token=xxx
 *
 * Unsubscribes a user from email reminders using a signed token.
 * The token contains the userId and is verified to prevent abuse.
 *
 * After successful unsubscribe, redirects to confirmation page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/unsubscribed?error=missing_token", request.url)
    );
  }

  // Verify the token and extract userId
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return NextResponse.redirect(
      new URL("/unsubscribed?error=invalid_token", request.url)
    );
  }

  // Disable email reminders for this user
  const result = await db
    .update(userPreferences)
    .set({ emailReminders: false })
    .where(eq(userPreferences.userId, userId))
    .returning({ userId: userPreferences.userId });

  if (result.length === 0) {
    // User preferences don't exist - might be a stale token
    return NextResponse.redirect(
      new URL("/unsubscribed?error=user_not_found", request.url)
    );
  }

  // Redirect to confirmation page
  return NextResponse.redirect(new URL("/unsubscribed?success=true", request.url));
}
