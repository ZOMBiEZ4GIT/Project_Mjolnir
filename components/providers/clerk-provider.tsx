"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/nextjs";

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  // If no Clerk key is configured, render children without Clerk
  if (!clerkPubKey) {
    return <>{children}</>;
  }

  return <BaseClerkProvider>{children}</BaseClerkProvider>;
}
