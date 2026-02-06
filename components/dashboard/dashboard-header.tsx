"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { FxRatesDisplay } from "@/components/ui/fx-rates-display";

/**
 * Refreshes all tradeable holding prices via POST /api/prices.
 * Returns the number of prices refreshed, errors, and total count.
 */
async function refreshPrices(): Promise<{
  success: number;
  errors: number;
  total: number;
}> {
  const response = await fetch("/api/prices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh prices");
  }

  const results = await response.json();

  // Count successes and errors
  const success = results.filter(
    (r: { price: number | null }) => r.price !== null
  ).length;
  const errors = results.filter(
    (r: { price: number | null }) => r.price === null
  ).length;

  return { success, errors, total: results.length };
}

interface DashboardHeaderProps {
  userName?: string | null;
}

/**
 * Dashboard Header Component
 *
 * Displays the welcome message and a refresh button that:
 * 1. Refreshes all tradeable holding prices
 * 2. Invalidates all dashboard-related TanStack Query caches
 * 3. Shows success/error toast notifications
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMutation = useMutation({
    mutationFn: refreshPrices,
    onMutate: () => {
      setIsRefreshing(true);
    },
    onSuccess: (data) => {
      // Invalidate all dashboard-related queries to refetch with new prices
      queryClient.invalidateQueries({ queryKey: ["net-worth"] });
      queryClient.invalidateQueries({ queryKey: ["net-worth-history"] });
      queryClient.invalidateQueries({ queryKey: ["top-performers"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      // Show completion toast
      if (data.errors > 0) {
        toast.warning(`Refreshed ${data.success} prices, ${data.errors} failed`, {
          description: `${data.errors} price${data.errors !== 1 ? "s" : ""} could not be fetched`,
        });
      } else if (data.success > 0) {
        toast.success(`Refreshed ${data.success} prices`);
      } else {
        toast.info("No tradeable holdings to refresh");
      }
    },
    onError: (error) => {
      toast.error("Failed to refresh prices", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
      <h1 className="text-heading-lg sm:text-display-md text-foreground">
        Welcome{userName ? `, ${userName}` : ""}
      </h1>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <FxRatesDisplay mode="compact" />
        <CurrencyToggle />
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </Button>
      </div>
    </div>
  );
}
