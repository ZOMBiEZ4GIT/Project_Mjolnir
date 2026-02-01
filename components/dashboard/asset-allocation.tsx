"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  TrendingUp,
  Landmark,
  Bitcoin,
  PiggyBank,
  Banknote,
} from "lucide-react";

interface HoldingValue {
  id: string;
  name: string;
  symbol: string | null;
  value: number;
}

interface AssetTypeBreakdown {
  type: "stock" | "etf" | "crypto" | "super" | "cash";
  totalValue: number;
  count: number;
  holdings: HoldingValue[];
}

interface NetWorthResponse {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  breakdown: AssetTypeBreakdown[];
  hasStaleData: boolean;
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
 * Formats a number as Australian currency (AUD).
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a percentage.
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns the icon for an asset type.
 */
function getAssetIcon(type: string): React.ReactNode {
  switch (type) {
    case "stock":
      return <TrendingUp className="h-5 w-5" />;
    case "etf":
      return <Landmark className="h-5 w-5" />;
    case "crypto":
      return <Bitcoin className="h-5 w-5" />;
    case "super":
      return <PiggyBank className="h-5 w-5" />;
    case "cash":
      return <Banknote className="h-5 w-5" />;
    default:
      return <TrendingUp className="h-5 w-5" />;
  }
}

/**
 * Returns the display name for an asset type.
 */
function getAssetDisplayName(type: string): string {
  switch (type) {
    case "stock":
      return "Stocks";
    case "etf":
      return "ETFs";
    case "crypto":
      return "Crypto";
    case "super":
      return "Superannuation";
    case "cash":
      return "Cash";
    default:
      return type;
  }
}

/**
 * Returns the color class for an asset type.
 */
function getAssetColor(type: string): string {
  switch (type) {
    case "stock":
      return "bg-blue-500";
    case "etf":
      return "bg-purple-500";
    case "crypto":
      return "bg-orange-500";
    case "super":
      return "bg-emerald-500";
    case "cash":
      return "bg-cyan-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Loading skeleton for asset allocation.
 */
function AllocationSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <div className="animate-pulse">
        <div className="h-5 w-32 bg-gray-700 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-700 rounded" />
                  <div className="h-4 w-24 bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-700 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AllocationItemProps {
  type: string;
  totalValue: number;
  percentage: number;
  count: number;
}

/**
 * Individual asset allocation row.
 */
function AllocationItem({
  type,
  totalValue,
  percentage,
  count,
}: AllocationItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getAssetColor(type)} bg-opacity-20`}>
            <span className={`${getAssetColor(type).replace("bg-", "text-")}`}>
              {getAssetIcon(type)}
            </span>
          </div>
          <div>
            <span className="font-medium text-white">
              {getAssetDisplayName(type)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({count} holding{count !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-white">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-gray-400">{formatPercentage(percentage)}</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getAssetColor(type)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Asset Allocation Component
 *
 * Displays a breakdown of assets by type (Stocks, ETFs, Crypto, Super, Cash).
 * Each type shows:
 * - Icon and name
 * - Value in AUD
 * - Percentage of total assets
 * - Visual progress bar for percentage
 *
 * Sorted by value descending. Debt is shown separately (not included here).
 */
export function AssetAllocation() {
  const { isLoaded, isSignedIn } = useAuthSafe();

  const {
    data: netWorthData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["net-worth"],
    queryFn: fetchNetWorth,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading) {
    return <AllocationSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load asset allocation</p>
      </div>
    );
  }

  // No data available
  if (!netWorthData || !netWorthData.breakdown) {
    return <AllocationSkeleton />;
  }

  const { breakdown, totalAssets } = netWorthData;

  // Sort breakdown by value descending
  const sortedBreakdown = [...breakdown].sort(
    (a, b) => b.totalValue - a.totalValue
  );

  // Empty state
  if (sortedBreakdown.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
          Asset Allocation
        </h3>
        <p className="text-gray-500 text-center py-8">
          No assets to display. Add holdings to see your allocation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Asset Allocation
      </h3>
      <div className="space-y-5">
        {sortedBreakdown.map((item) => {
          const percentage =
            totalAssets > 0 ? (item.totalValue / totalAssets) * 100 : 0;
          return (
            <AllocationItem
              key={item.type}
              type={item.type}
              totalValue={item.totalValue}
              percentage={percentage}
              count={item.count}
            />
          );
        })}
      </div>
    </div>
  );
}
