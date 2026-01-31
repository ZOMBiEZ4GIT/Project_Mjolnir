"use client";

import { useAuth } from "@clerk/nextjs";

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Mock auth state for when Clerk is not configured
const mockAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: "demo-user",
};

/**
 * Safe wrapper around Clerk's useAuth hook.
 * When Clerk is not configured, returns a mock state that bypasses auth.
 */
export function useAuthSafe() {
  // Always call the hook unconditionally (React requirement)
  const auth = useAuth();

  // When Clerk isn't configured, return mock auth state
  if (!clerkPubKey) {
    return mockAuth;
  }

  return auth;
}
