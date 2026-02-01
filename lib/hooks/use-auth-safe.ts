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
 * Hook that safely wraps useAuth - only calls the actual hook when Clerk is configured.
 * This is a conditional hook call which normally violates React rules, but is safe here
 * because clerkPubKey is an environment variable that never changes at runtime.
 */
function useClerkAuthInternal() {
  // This is intentionally a conditional hook call.
  // clerkPubKey is determined at build/startup time and never changes,
  // so the hook call order is stable throughout the component lifecycle.
  if (!clerkPubKey) {
    return mockAuth;
  }
  return useAuth();
}

/**
 * Safe wrapper around Clerk's useAuth hook.
 * When Clerk is not configured, returns a mock state that bypasses auth.
 */
export function useAuthSafe() {
  return useClerkAuthInternal();
}
