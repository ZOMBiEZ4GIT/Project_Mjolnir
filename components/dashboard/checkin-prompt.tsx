"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "@/components/check-in/check-in-modal";

const DISMISS_KEY = "mjolnir-checkin-dismissed";

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

export function CheckinPrompt() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();

  // Check sessionStorage on mount to avoid hydration mismatch
  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.checkIn.status,
    queryFn: fetchCheckInStatus,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setIsDismissed(true);
  };

  // Don't render until mounted (avoids hydration mismatch with sessionStorage)
  if (!mounted) return null;

  // Don't render if not loaded, not signed in, loading, or error
  if (!isLoaded || !isSignedIn || isLoading || error) return null;

  // Don't render if no check-in needed or dismissed
  if (!data?.needsCheckIn || isDismissed) return null;

  const holdingsCount = data.holdingsToUpdate;

  return (
    <>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl border border-accent/30 bg-card/50 p-4 sm:p-6 shadow-glow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <CalendarCheck className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-heading-sm text-foreground">
                Monthly Check-in Due
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {holdingsCount} holding{holdingsCount !== 1 ? "s" : ""} need
                updating for {data.currentMonth}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Remind me later
            </Button>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Start Check-in
            </Button>
          </div>
        </div>
      </motion.div>

      <CheckInModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
