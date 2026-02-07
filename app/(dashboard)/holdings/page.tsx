"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Briefcase, Filter, Wallet, ArrowRightLeft, Camera, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";
import { HoldingsTable, type HoldingWithData, type PriceData } from "@/components/holdings/holdings-table";

/**
 * Sparkline data from the API.
 */
interface SparklineDataResult {
  holdingId: string;
  symbol: string;
  prices: number[];
}

async function fetchSparklineData(): Promise<Map<string, number[]>> {
  const response = await fetch("/api/prices/sparkline");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch sparkline data");
  }
  const results: SparklineDataResult[] = await response.json();

  const map = new Map<string, number[]>();
  for (const result of results) {
    if (result.prices.length >= 2) {
      map.set(result.holdingId, result.prices);
    }
  }
  return map;
}
import { AddHoldingDialog } from "@/components/holdings/add-holding-dialog";
import { CurrencyFilter, type CurrencyFilterValue } from "@/components/holdings/currency-filter";
import { FilterTabs, type HoldingTypeFilter } from "@/components/holdings/filter-tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NativeCurrencyToggle } from "@/components/ui/native-currency-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { SpeedDial, type SpeedDialAction } from "@/components/shared/speed-dial";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { CheckInModal } from "@/components/check-in/check-in-modal";

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
  const response = await fetch("/api/prices", {
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
  const currencyFilterParam = searchParams.get("currency") as CurrencyFilterValue | null;
  const currencyFilter: CurrencyFilterValue = currencyFilterParam && ["all", "AUD", "NZD", "USD"].includes(currencyFilterParam)
    ? currencyFilterParam
    : "all";
  const typeFilterParam = searchParams.get("type") as HoldingTypeFilter | null;
  const typeFilter: HoldingTypeFilter = typeFilterParam && ["all", "stock", "etf", "crypto", "super", "cash", "debt"].includes(typeFilterParam)
    ? typeFilterParam
    : "all";

  const handleShowDormantChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("show_dormant", "true");
    } else {
      params.delete("show_dormant");
    }
    router.push(`/holdings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleCurrencyFilterChange = (value: CurrencyFilterValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("currency");
    } else {
      params.set("currency", value);
    }
    router.push(`/holdings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleTypeFilterChange = (value: HoldingTypeFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    router.replace(`/holdings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const {
    data: holdings,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.holdings.list({ showDormant }),
    queryFn: () => fetchHoldings(showDormant),
    enabled: isLoaded && isSignedIn,
  });

  // Check if dormant holdings exist (only when main list is empty and dormant toggle is off)
  const {
    data: allHoldings,
  } = useQuery({
    queryKey: queryKeys.holdings.list({ showDormant: true }),
    queryFn: () => fetchHoldings(true),
    enabled: isLoaded && isSignedIn && !showDormant && !isLoading && !!holdings && holdings.length === 0,
  });

  const hasDormantHoldings = !showDormant && holdings?.length === 0 && (allHoldings?.length ?? 0) > 0;

  // Fetch prices for tradeable holdings
  const {
    data: priceMap,
    isLoading: pricesLoading,
    isFetching: pricesFetching,
  } = useQuery({
    queryKey: queryKeys.prices.all,
    queryFn: fetchPrices,
    enabled: isLoaded && isSignedIn,
    // Prices can refetch independently without blocking holdings display
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch sparkline data for tradeable holdings (30-day price history)
  const {
    data: sparklineMap,
    isLoading: sparklineLoading,
  } = useQuery({
    queryKey: queryKeys.prices.sparkline,
    queryFn: fetchSparklineData,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 30, // 30 minutes — historical data doesn't change often
  });

  // Mutation for refreshing prices (manual user action with toasts)
  const refreshMutation = useMutation({
    mutationFn: () => refreshPrices(),
    onSuccess: (results) => {
      // Count successes and failures
      const failures = results.filter((r) => r.error);
      const successes = results.filter((r) => !r.error && r.price !== null);

      // Invalidate prices query to refetch updated cached prices
      queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });
    },
    // Silent error handling - no toast for background refresh failures
  });

  // Derive refreshing state: true when manual/background refresh is in-flight or prices are refetching
  const pricesRefreshingState = refreshMutation.isPending || backgroundRefreshMutation.isPending || (pricesFetching && !pricesLoading);

  // Speed-dial FAB: refs for hidden dialog triggers + check-in modal state
  const addHoldingRef = useRef<HTMLButtonElement>(null);
  const addTransactionRef = useRef<HTMLButtonElement>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const speedDialActions = useMemo<SpeedDialAction[]>(() => [
    {
      id: "add-holding",
      label: "Add Holding",
      icon: <Wallet className="h-4 w-4" />,
      onClick: () => addHoldingRef.current?.click(),
    },
    {
      id: "add-transaction",
      label: "Add Transaction",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: () => addTransactionRef.current?.click(),
    },
    {
      id: "monthly-check-in",
      label: "Monthly Check-in",
      icon: <Camera className="h-4 w-4" />,
      onClick: () => setCheckInOpen(true),
    },
  ], []);

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
      queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });

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

  // Filter holdings by currency and type
  const filteredHoldings = useMemo(() => {
    if (!holdings) return [];
    let result = holdings;
    if (currencyFilter !== "all") {
      result = result.filter((holding) => holding.currency === currencyFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((holding) => holding.type === typeFilter);
    }
    return result;
  }, [holdings, currencyFilter, typeFilter]);

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-foreground">Sign in to view your holdings</h2>
          <p className="text-muted-foreground">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching holdings
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Holdings</h1>
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-muted-foreground">Loading holdings...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Holdings</h1>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-destructive">Failed to load holdings</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state (no holdings at all, or all dormant with toggle off)
  if (!holdings || holdings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Holdings</h1>
        </div>
        {hasDormantHoldings ? (
          <EmptyState
            icon={EyeOff}
            title="All holdings are dormant"
            description="Your holdings are currently hidden because they are marked as dormant. Toggle the switch below to view them."
            action={
              <div className="flex items-center gap-2">
                <Switch
                  id="show-dormant-empty"
                  checked={showDormant}
                  onCheckedChange={handleShowDormantChange}
                />
                <Label htmlFor="show-dormant-empty" className="text-muted-foreground cursor-pointer text-sm">
                  Show dormant holdings
                </Label>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No holdings yet"
            description="Add your first holding to start tracking your net worth. You can add stocks, ETFs, crypto, superannuation, cash, and debt."
            action={
              <AddHoldingDialog>
                <Button size="lg">Add your first holding</Button>
              </AddHoldingDialog>
            }
          />
        )}
      </div>
    );
  }

  // Show filtered empty state (has holdings but none match filter)
  if (filteredHoldings.length === 0) {
    const typeLabels: Record<string, string> = {
      stock: "stock", etf: "ETF", crypto: "crypto",
      super: "super", cash: "cash", debt: "debt",
    };
    const typeLabel = typeFilter !== "all" ? typeLabels[typeFilter] ?? typeFilter : null;
    const emptyTitle = typeLabel ? `No ${typeLabel} holdings` : "No matching holdings";

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Holdings</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
              />
              {refreshMutation.isPending ? "Refreshing..." : "Refresh Prices"}
            </Button>
            <AddHoldingDialog>
              <Button>Add Holding</Button>
            </AddHoldingDialog>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <FilterTabs value={typeFilter} onChange={handleTypeFilterChange} />
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-dormant-filtered"
                checked={showDormant}
                onCheckedChange={handleShowDormantChange}
              />
              <Label htmlFor="show-dormant-filtered" className="text-muted-foreground cursor-pointer text-sm">
                Show dormant holdings
              </Label>
            </div>
            <CurrencyFilter value={currencyFilter} onChange={handleCurrencyFilterChange} />
            <NativeCurrencyToggle />
          </div>
        </div>
        <EmptyState
          icon={Filter}
          title={emptyTitle}
          description="Try a different filter to see your holdings."
        />
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
          <h1 className="text-2xl font-bold text-foreground">Holdings</h1>
          {/* Subtle background refresh indicator */}
          {backgroundRefreshMutation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <FilterTabs value={typeFilter} onChange={handleTypeFilterChange} />
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-dormant"
              checked={showDormant}
              onCheckedChange={handleShowDormantChange}
            />
            <Label htmlFor="show-dormant" className="text-muted-foreground cursor-pointer text-sm">
              Show dormant holdings
            </Label>
          </div>
          <CurrencyFilter value={currencyFilter} onChange={handleCurrencyFilterChange} />
          <NativeCurrencyToggle />
        </div>
      </div>
      <HoldingsTable
        holdings={filteredHoldings}
        prices={priceMap}
        pricesLoading={pricesLoading}
        pricesRefreshing={pricesRefreshingState}
        onRetryPrice={handleRetryPrice}
        retryingPriceIds={retryingPriceIds}
        groupBy="type"
        typeFilter={typeFilter}
        sparklineData={sparklineMap}
        sparklineLoading={sparklineLoading}
      />

      {/* Speed-dial FAB with hidden dialog triggers */}
      <AddHoldingDialog>
        <button ref={addHoldingRef} className="hidden" aria-hidden="true" />
      </AddHoldingDialog>
      <AddTransactionDialog>
        <button ref={addTransactionRef} className="hidden" aria-hidden="true" />
      </AddTransactionDialog>
      <CheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
      <SpeedDial actions={speedDialActions} />
    </div>
  );
}
