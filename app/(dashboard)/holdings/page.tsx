"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { HoldingsTable } from "@/components/holdings/holdings-table";
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
  });

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
