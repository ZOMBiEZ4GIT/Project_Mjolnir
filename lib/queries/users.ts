import { db } from "@/lib/db";
import { users, userPreferences, type UserPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensure a user record exists in the database.
 * Creates a new user if one doesn't exist for the given Clerk user ID.
 *
 * @param userId - The Clerk user ID
 * @param email - The user's email (optional, defaults to placeholder)
 * @param name - The user's name (optional)
 * @returns The user record
 */
export async function ensureUser(
  userId: string,
  email?: string,
  name?: string
) {
  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      email: email ?? `${userId}@clerk.user`,
      name: name ?? null,
    })
    .returning();

  return newUser;
}

/**
 * Get user preferences, creating default preferences if none exist.
 *
 * @param userId - The Clerk user ID
 * @returns The user's preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  // Ensure user exists first (foreign key constraint)
  await ensureUser(userId);

  // Check if preferences exist
  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default preferences
  const [newPrefs] = await db
    .insert(userPreferences)
    .values({
      userId,
      displayCurrency: "AUD",
    })
    .returning();

  return newPrefs;
}

/**
 * Update user preferences.
 *
 * @param userId - The Clerk user ID
 * @param displayCurrency - The display currency to set
 * @returns The updated preferences
 */
export async function updateUserPreferences(
  userId: string,
  displayCurrency: "AUD" | "NZD" | "USD"
): Promise<UserPreferences> {
  // Ensure user and preferences exist first
  await getUserPreferences(userId);

  // Update preferences
  const [updated] = await db
    .update(userPreferences)
    .set({
      displayCurrency,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.userId, userId))
    .returning();

  return updated;
}
