"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import type { Holding } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function fetchHoldings(): Promise<Holding[]> {
  const response = await fetch("/api/holdings");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  return response.json();
}

export default function HoldingsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();

  const {
    data: holdings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["holdings"],
    queryFn: fetchHoldings,
    enabled: isLoaded && isSignedIn,
  });

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-white">Sign in to view your holdings</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching holdings
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-gray-400">Loading holdings...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-red-400">Failed to load holdings</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!holdings || holdings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <div className="text-gray-400">
            <p className="text-lg">No holdings yet</p>
            <p className="text-sm mt-2">
              Add your first holding to start tracking your net worth.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show holdings list in grouped table
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Holdings</h1>
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
