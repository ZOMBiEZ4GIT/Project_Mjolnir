"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "./check-in-modal";

interface CheckInStatusResponse {
  needsCheckIn: boolean;
  holdingsToUpdate: number;
  totalSnapshotHoldings: number;
  currentMonth: string;
  holdings: {
    id: string;
    name: string;
    type: string;
    currency: string;
    isDormant: boolean;
  }[];
}

async function fetchCheckInStatus(): Promise<CheckInStatusResponse> {
  const response = await fetch("/api/check-in/status");
  if (!response.ok) {
    throw new Error("Failed to fetch check-in status");
  }
  return response.json();
}

export function CheckInPromptCard() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["check-in-status"],
    queryFn: fetchCheckInStatus,
    enabled: isLoaded && isSignedIn,
    // Refetch every minute to stay up to date
    refetchInterval: 60 * 1000,
  });

  // Don't render if not loaded, not signed in, loading, or error
  if (!isLoaded || !isSignedIn || isLoading || error) {
    return null;
  }

  // Don't render if no check-in needed
  if (!data?.needsCheckIn) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Monthly Check-in
          </h3>
          <p className="mt-2 text-gray-400">
            You have{" "}
            <span className="font-semibold text-yellow-500">
              {data.holdingsToUpdate} holding{data.holdingsToUpdate !== 1 ? "s" : ""}
            </span>{" "}
            to update for {data.currentMonth}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {data.totalSnapshotHoldings - data.holdingsToUpdate} of{" "}
            {data.totalSnapshotHoldings} holdings already updated
          </p>
        </div>
        <Button className="shrink-0 w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          Start Check-in
        </Button>
      </div>

      <CheckInModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
