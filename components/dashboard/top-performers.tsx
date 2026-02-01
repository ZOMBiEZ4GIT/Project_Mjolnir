"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
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
 * Formats a number as Australian currency (AUD).
 */
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);
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
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gainers skeleton */}
          <div>
            <div className="h-5 w-28 bg-gray-700 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-700/70 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-20 bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-14 bg-gray-700/70 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Losers skeleton */}
          <div>
            <div className="h-5 w-24 bg-gray-700 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-700/70 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-20 bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-14 bg-gray-700/70 rounded" />
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
}

function PerformerRow({ performer, isGainer }: PerformerRowProps) {
  const colorClass = isGainer ? "text-emerald-400" : "text-red-400";
  const sign = isGainer ? "+" : "-";

  return (
    <Link
      href={`/holdings/${performer.holdingId}`}
      className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{performer.name}</p>
        <p className="text-gray-400 text-sm">{performer.symbol}</p>
      </div>
      <div className="text-right ml-4">
        <p className={`font-semibold ${colorClass}`}>
          {sign}
          {formatCurrency(performer.gainLoss)}
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
      <p className="text-gray-500 text-sm">
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
 * - Each row shows name, symbol, gain/loss amount, and percentage
 * - Gainers displayed in green, losers in red
 * - Click on any row navigates to holding detail page
 * - Empty state when no tradeable holdings exist
 */
export function TopPerformers() {
  const { isLoaded, isSignedIn } = useAuthSafe();

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
  if (!isLoaded || !isSignedIn || isLoading) {
    return <PerformersSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load top performers</p>
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
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
          Top Performers
        </h3>
        <div className="py-8 text-center">
          <p className="text-gray-500">
            No tradeable holdings with performance data yet.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Add stocks, ETFs, or crypto to see your top gainers and losers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
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
            <TrendingDown className="h-5 w-5 text-red-400" />
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
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
