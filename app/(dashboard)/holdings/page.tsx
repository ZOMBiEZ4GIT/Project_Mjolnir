"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { HoldingsTable, type HoldingWithData, type PriceData } from "@/components/holdings/holdings-table";
import { AddHoldingDialog } from "@/components/holdings/add-holding-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NativeCurrencyToggle } from "@/components/ui/native-currency-toggle";

export const dynamic = "force-dynamic";

async function fetchHoldings(includeDormant: boolean): Promise<HoldingWithData[]> {
  const params = new URLSearchParams();
  if (includeDormant) {
    params.set("include_dormant", "true");
  }
  params.set("include_cost_basis", "true");
  params.set("include_latest_snapshot", "true");

  const url = `/api/holdings?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  return response.json();
}

/**
 * Cached price data from the API.
 */
interface CachedPriceResult {
  holdingId: string;
  symbol: string;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  changeAbsolute: number | null;
  fetchedAt: string | null;
  isStale: boolean;
}

async function fetchPrices(): Promise<Map<string, PriceData>> {
  const response = await fetch("/api/prices");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch prices");
  }
  const results: CachedPriceResult[] = await response.json();

  // Convert to a map by holding ID
  const priceMap = new Map<string, PriceData>();
  for (const result of results) {
    if (result.price !== null) {
      priceMap.set(result.holdingId, {
        price: result.price,
        currency: result.currency ?? "AUD",
        changePercent: result.changePercent,
        changeAbsolute: result.changeAbsolute,
        fetchedAt: result.fetchedAt ? new Date(result.fetchedAt) : null,
        isStale: result.isStale,
      });
    }
  }
  return priceMap;
}

/**
 * Refresh result from the API.
 */
interface PriceRefreshResult {
  holdingId: string;
  symbol: string;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  isStale: boolean;
  error?: string;
}

async function refreshPrices(holdingIds?: string[]): Promise<PriceRefreshResult[]> {
  const response = await fetch("/api/prices/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(holdingIds ? { holding_ids: holdingIds } : {}),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to refresh prices");
  }
  return response.json();
}

/**
 * Check if any price in the map is stale (older than 15 minutes).
 */
function hasStalePrice(priceMap: Map<string, PriceData> | undefined): boolean {
  if (!priceMap || priceMap.size === 0) return false;
  for (const price of priceMap.values()) {
    if (price.isStale) return true;
  }
  return false;
}

export default function HoldingsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const showDormant = searchParams.get("show_dormant") === "true";

  const handleShowDormantChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("show_dormant", "true");
    } else {
      params.delete("show_dormant");
    }
    router.push(`/holdings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const {
    data: holdings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["holdings", { showDormant }],
    queryFn: () => fetchHoldings(showDormant),
    enabled: isLoaded && isSignedIn,
  });

  // Fetch prices for tradeable holdings
  const {
    data: priceMap,
    isLoading: pricesLoading,
  } = useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    enabled: isLoaded && isSignedIn,
    // Prices can refetch independently without blocking holdings display
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for refreshing prices (manual user action with toasts)
  const refreshMutation = useMutation({
    mutationFn: () => refreshPrices(),
    onSuccess: (results) => {
      // Count successes and failures
      const failures = results.filter((r) => r.error);
      const successes = results.filter((r) => !r.error && r.price !== null);

      // Invalidate prices query to refetch updated cached prices
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      // Show appropriate toast
      if (failures.length === 0 && successes.length > 0) {
        toast.success(`Refreshed ${successes.length} price${successes.length === 1 ? "" : "s"}`);
      } else if (failures.length > 0 && successes.length > 0) {
        toast.warning(
          `Refreshed ${successes.length} price${successes.length === 1 ? "" : "s"}, ${failures.length} failed`
        );
      } else if (failures.length > 0 && successes.length === 0) {
        toast.error(`Failed to refresh ${failures.length} price${failures.length === 1 ? "" : "s"}`);
      } else if (results.length === 0) {
        toast.info("No tradeable holdings to refresh");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to refresh prices");
    },
  });

  // Mutation for background auto-refresh (silent, no toasts)
  const backgroundRefreshMutation = useMutation({
    mutationFn: () => refreshPrices(),
    onSuccess: () => {
      // Silently invalidate prices query to refetch updated cached prices
      queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
    // Silent error handling - no toast for background refresh failures
  });

  // Track which holdings are currently being retried
  const [retryingPriceIds, setRetryingPriceIds] = useState<Set<string>>(new Set());

  // Handler for retrying a single holding's price fetch
  const handleRetryPrice = useCallback(async (holdingId: string) => {
    // Add to retrying set
    setRetryingPriceIds((prev) => new Set(prev).add(holdingId));

    try {
      const results = await refreshPrices([holdingId]);
      const result = results[0];

      // Invalidate prices query to refetch updated cached prices
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      // Show toast based on result
      if (result?.error) {
        toast.error(`Failed to fetch price for ${result.symbol}: ${result.error}`);
      } else if (result?.price !== null) {
        toast.success(`Price updated for ${result.symbol}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh price");
    } finally {
      // Remove from retrying set
      setRetryingPriceIds((prev) => {
        const next = new Set(prev);
        next.delete(holdingId);
        return next;
      });
    }
  }, [queryClient]);

  // Track if auto-refresh has been triggered to prevent duplicate calls
  const autoRefreshTriggered = useRef(false);

  // Auto-refresh prices on page load if any cached price is stale
  useEffect(() => {
    // Only trigger once per page mount
    if (autoRefreshTriggered.current) return;

    // Wait for prices to load first
    if (pricesLoading) return;

    // Check if any price is stale
    if (hasStalePrice(priceMap)) {
      autoRefreshTriggered.current = true;
      backgroundRefreshMutation.mutate();
    }
  }, [priceMap, pricesLoading, backgroundRefreshMutation]);

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Holdings</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Prices
            </Button>
            <AddHoldingDialog>
              <Button>Add Holding</Button>
            </AddHoldingDialog>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-dormant-empty"
              checked={showDormant}
              onCheckedChange={handleShowDormantChange}
            />
            <Label htmlFor="show-dormant-empty" className="text-gray-300 cursor-pointer text-sm">
              Show dormant holdings
            </Label>
          </div>
          <NativeCurrencyToggle />
        </div>
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

  // Check if any refresh is in progress
  const isRefreshing = refreshMutation.isPending || backgroundRefreshMutation.isPending;

  // Show holdings list in grouped table
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Holdings</h1>
          {/* Subtle background refresh indicator */}
          {backgroundRefreshMutation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Updating prices...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {refreshMutation.isPending ? "Refreshing..." : "Refresh Prices"}
          </Button>
          <AddHoldingDialog>
            <Button>Add Holding</Button>
          </AddHoldingDialog>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Switch
            id="show-dormant"
            checked={showDormant}
            onCheckedChange={handleShowDormantChange}
          />
          <Label htmlFor="show-dormant" className="text-gray-300 cursor-pointer text-sm">
            Show dormant holdings
          </Label>
        </div>
        <NativeCurrencyToggle />
      </div>
      <HoldingsTable
        holdings={holdings}
        prices={priceMap}
        pricesLoading={pricesLoading}
        onRetryPrice={handleRetryPrice}
        retryingPriceIds={retryingPriceIds}
      />
    </div>
  );
}
