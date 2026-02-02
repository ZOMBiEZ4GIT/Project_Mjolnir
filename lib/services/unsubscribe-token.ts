/**
 * Unsubscribe token generation and verification.
 *
 * Uses a simple HMAC-based token for email unsubscribe links.
 * The token contains the userId encoded with a signature to prevent tampering.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Get the secret key for signing tokens.
 * Falls back to CLERK_SECRET_KEY if UNSUBSCRIBE_SECRET is not set.
 */
function getSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "default-dev-secret-do-not-use-in-production";
  return secret;
}

/**
 * Create a signature for a userId using HMAC-SHA256.
 */
function createSignature(userId: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(userId);
  return hmac.digest("hex");
}

/**
 * Generate an unsubscribe token for a userId.
 *
 * Format: base64url(userId):signature
 *
 * @param userId - The Clerk user ID
 * @returns A signed token string
 *
 * @example
 * const token = generateUnsubscribeToken("user_abc123");
 * // Returns something like "dXNlcl9hYmMxMjM:a1b2c3d4e5f6..."
 */
export function generateUnsubscribeToken(userId: string): string {
  const encodedUserId = Buffer.from(userId).toString("base64url");
  const signature = createSignature(userId);
  return `${encodedUserId}:${signature}`;
}

/**
 * Verify an unsubscribe token and extract the userId.
 *
 * @param token - The token from the unsubscribe URL
 * @returns The userId if valid, null if invalid
 *
 * @example
 * const userId = verifyUnsubscribeToken(token);
 * if (userId) {
 *   // Token is valid, unsubscribe the user
 * }
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedUserId, providedSignature] = parts;

  // Decode the userId
  let userId: string;
  try {
    userId = Buffer.from(encodedUserId, "base64url").toString("utf8");
  } catch {
    return null;
  }

  // Validate userId looks like a Clerk user ID
  if (!userId || !userId.startsWith("user_")) {
    return null;
  }

  // Verify the signature using timing-safe comparison
  const expectedSignature = createSignature(userId);

  try {
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }
  } catch {
    return null;
  }

  return userId;
}

/**
 * Generate an unsubscribe URL for a userId.
 *
 * @param userId - The Clerk user ID
 * @returns Full unsubscribe URL
 *
 * @example
 * const url = generateUnsubscribeUrl("user_abc123");
 * // Returns "https://app.example.com/api/email/unsubscribe?token=..."
 */
export function generateUnsubscribeUrl(userId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = generateUnsubscribeToken(userId);
  return `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
