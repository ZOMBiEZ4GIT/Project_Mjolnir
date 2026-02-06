"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

/**
 * Reason why a holding's data is considered stale.
 */
type StaleReason =
  | "price_expired" // Tradeable: cached price is older than TTL
  | "no_price" // Tradeable: no cached price available
  | "snapshot_old" // Snapshot: snapshot is older than 2 months
  | "no_snapshot"; // Snapshot: no snapshot available

interface StaleHolding {
  holdingId: string;
  name: string;
  type: string;
  lastUpdated: string | null;
  reason: StaleReason;
}

interface NetWorthResponse {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  hasStaleData: boolean;
  staleHoldings: StaleHolding[];
  calculatedAt: string;
}

async function fetchNetWorth(): Promise<NetWorthResponse> {
  const response = await fetch("/api/net-worth");
  if (!response.ok) {
    throw new Error("Failed to fetch net worth");
  }
  return response.json();
}

/**
 * Formats a relative timestamp.
 */
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) {
    return "Never";
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 60) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}

/**
 * Gets a human-readable reason for staleness.
 */
function getStaleReasonText(reason: StaleReason): string {
  switch (reason) {
    case "price_expired":
      return "Price is outdated";
    case "no_price":
      return "No price available";
    case "snapshot_old":
      return "Snapshot is outdated";
    case "no_snapshot":
      return "No snapshot available";
    default:
      return "Data is stale";
  }
}

/**
 * Gets the appropriate icon for the stale reason.
 */
function getStaleReasonIcon(reason: StaleReason) {
  switch (reason) {
    case "price_expired":
    case "no_price":
      return <DollarSign className="h-4 w-4" />;
    case "snapshot_old":
    case "no_snapshot":
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

/**
 * Gets the action text for the stale reason.
 */
function getActionText(reason: StaleReason): string {
  switch (reason) {
    case "price_expired":
    case "no_price":
      return "Refresh prices";
    case "snapshot_old":
    case "no_snapshot":
      return "Update snapshot";
    default:
      return "Update";
  }
}

/**
 * Stale Data Warning Banner
 *
 * Displays a warning banner on the dashboard when there are holdings with stale data.
 * Features:
 * - Yellow warning banner if any holdings have stale data
 * - Expandable to show list of stale holdings
 * - Each holding shows: name, type, last updated, reason
 * - Link to holding or action to refresh
 */
export function StaleDataWarning() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isLoaded, isSignedIn } = useAuthSafe();

  const { data, isLoading, error } = useQuery({
    queryKey: ["net-worth"],
    queryFn: fetchNetWorth,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Don't render anything while loading or if there's no stale data
  if (!isLoaded || !isSignedIn || isLoading || error || !data) {
    return null;
  }

  if (!data.hasStaleData || data.staleHoldings.length === 0) {
    return null;
  }

  const staleCount = data.staleHoldings.length;

  return (
    <div className="rounded-lg border border-yellow-600/50 bg-yellow-900/20 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-yellow-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-yellow-400">
              {staleCount} holding{staleCount !== 1 ? "s" : ""} with stale data
            </p>
            <p className="text-xs text-yellow-500/80">
              Your net worth calculation may not be fully accurate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-yellow-500">
          <span className="text-xs">View details</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded content - list of stale holdings */}
      {isExpanded && (
        <div className="border-t border-yellow-600/30 bg-yellow-950/20">
          <div className="divide-y divide-yellow-600/20">
            {data.staleHoldings.map((holding) => (
              <div
                key={holding.holdingId}
                className="p-4 flex items-center justify-between hover:bg-yellow-900/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500">
                    {getStaleReasonIcon(holding.reason)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/80">
                      {holding.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{holding.type}</span>
                      <span>•</span>
                      <span>{getStaleReasonText(holding.reason)}</span>
                      <span>•</span>
                      <span>
                        Last updated: {formatTimeAgo(holding.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(holding.reason === "price_expired" ||
                    holding.reason === "no_price") && (
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors"
                      title={getActionText(holding.reason)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {getActionText(holding.reason)}
                    </button>
                  )}
                  <Link
                    href={`/holdings/${holding.holdingId}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with summary */}
          <div className="p-4 border-t border-yellow-600/20 bg-yellow-950/30">
            <p className="text-xs text-yellow-500/80">
              {data.staleHoldings.some(
                (h) => h.reason === "price_expired" || h.reason === "no_price"
              ) && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Use the refresh button in the dashboard header to update all
                  prices at once.
                </span>
              )}
              {data.staleHoldings.some(
                (h) => h.reason === "snapshot_old" || h.reason === "no_snapshot"
              ) && (
                <span className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Complete your monthly check-in to update snapshot balances.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
