"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface Performer {
  holdingId: string;
  name: string;
  symbol: string;
  gainLoss: number;
  gainLossPercent: number;
  type: "stock" | "etf" | "crypto";
  currentValue: number;
  costBasis: number;
}

interface PerformersResponse {
  gainers: Performer[];
  losers: Performer[];
  calculatedAt: string;
}

async function fetchPerformers(): Promise<PerformersResponse> {
  const response = await fetch("/api/net-worth/performers?limit=5");
  if (!response.ok) {
    throw new Error("Failed to fetch performers");
  }
  return response.json();
}

/**
 * Formats a percentage with sign.
 */
function formatPercent(value: number): string {
  const absValue = Math.abs(value);
  return `${absValue.toFixed(2)}%`;
}

/**
 * Loading skeleton for the performers section.
 */
function PerformersSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gainers skeleton */}
          <div>
            <div className="h-5 w-28 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-3 w-16 bg-muted/70 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-20 bg-muted rounded mb-1" />
                    <div className="h-3 w-14 bg-muted/70 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Losers skeleton */}
          <div>
            <div className="h-5 w-24 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-3 w-16 bg-muted/70 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-20 bg-muted rounded mb-1" />
                    <div className="h-3 w-14 bg-muted/70 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual performer row component.
 */
interface PerformerRowProps {
  performer: Performer;
  isGainer: boolean;
  currency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
}

function PerformerRow({ performer, isGainer, currency, convert }: PerformerRowProps) {
  const colorClass = isGainer ? "text-positive" : "text-destructive";
  const sign = isGainer ? "+" : "-";

  // Convert from AUD (API returns values in AUD) to display currency
  const gainLossConverted = convert(performer.gainLoss, "AUD");

  return (
    <Link
      href={`/holdings/${performer.holdingId}`}
      className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">{performer.name}</p>
        <p className="text-muted-foreground text-sm">{performer.symbol}</p>
      </div>
      <div className="text-right ml-4">
        <p className={`font-semibold ${colorClass}`}>
          {sign}
          {formatCurrency(Math.abs(gainLossConverted), currency)}
        </p>
        <p className={`text-sm ${colorClass}`}>
          {sign}
          {formatPercent(performer.gainLossPercent)}
        </p>
      </div>
    </Link>
  );
}

/**
 * Empty state for when there are no performers to show.
 */
function EmptyPerformerList({ type }: { type: "gainers" | "losers" }) {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground text-sm">
        No {type === "gainers" ? "gains" : "losses"} to show
      </p>
    </div>
  );
}

/**
 * Top Performers Section
 *
 * Displays the top 5 gainers and top 5 losers among tradeable holdings.
 * Features:
 * - Split view: gainers on left, losers on right
 * - Each row shows name, symbol, gain/loss amount (in display currency), and percentage
 * - Gainers displayed in green, losers in red
 * - Click on any row navigates to holding detail page
 * - Empty state when no tradeable holdings exist
 */
export function TopPerformers() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();

  const {
    data: performersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["top-performers"],
    queryFn: fetchPerformers,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <PerformersSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load top performers</p>
      </div>
    );
  }

  // No data available
  if (!performersData) {
    return <PerformersSkeleton />;
  }

  const { gainers, losers } = performersData;
  const hasNoData = gainers.length === 0 && losers.length === 0;

  // Empty state when no tradeable holdings with performance data
  if (hasNoData) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Top Performers
        </h3>
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No tradeable holdings with performance data yet.
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            Add stocks, ETFs, or crypto to see your top gainers and losers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-positive" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Top Gainers
            </h3>
          </div>
          {gainers.length > 0 ? (
            <div className="space-y-1">
              {gainers.map((performer) => (
                <PerformerRow
                  key={performer.holdingId}
                  performer={performer}
                  isGainer={true}
                  currency={displayCurrency}
                  convert={convert}
                />
              ))}
            </div>
          ) : (
            <EmptyPerformerList type="gainers" />
          )}
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Top Losers
            </h3>
          </div>
          {losers.length > 0 ? (
            <div className="space-y-1">
              {losers.map((performer) => (
                <PerformerRow
                  key={performer.holdingId}
                  performer={performer}
                  isGainer={false}
                  currency={displayCurrency}
                  convert={convert}
                />
              ))}
            </div>
          ) : (
            <EmptyPerformerList type="losers" />
          )}
        </div>
      </div>
    </div>
  );
}
