"use client";

import { useState } from "react";
import { Pencil, Trash2, AlertTriangle, Clock, TrendingUp, TrendingDown, RotateCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Holding } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditHoldingDialog } from "./edit-holding-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { useCurrency } from "@/components/providers/currency-provider";
import type { Currency } from "@/lib/utils/currency";

// Display names for holding types
const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// Order in which types should be displayed
const HOLDING_TYPE_ORDER: Holding["type"][] = [
  "stock",
  "etf",
  "crypto",
  "super",
  "cash",
  "debt",
];

// Types that are tradeable (show quantity, cost basis)
const TRADEABLE_TYPES = ["stock", "etf", "crypto"] as const;

// Types that use snapshot-based balance tracking
const SNAPSHOT_TYPES = ["super", "cash", "debt"] as const;

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

// Latest snapshot data shape from API
interface LatestSnapshot {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
}

// Holding with both cost basis and snapshot data
export interface HoldingWithData extends Holding {
  // Cost basis data (for tradeable holdings)
  quantity: number | null;
  costBasis: number | null;
  avgCost: number | null;
  // Snapshot data (for snapshot holdings)
  latestSnapshot: LatestSnapshot | null;
}

// Price data for a holding
export interface PriceData {
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
  fetchedAt: Date | null;
  isStale: boolean;
  error?: string;
}

interface HoldingsTableProps {
  holdings: HoldingWithData[];
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
}

function groupHoldingsByType(holdings: HoldingWithData[]): Map<Holding["type"], HoldingWithData[]> {
  const groups = new Map<Holding["type"], HoldingWithData[]>();

  for (const holding of holdings) {
    const existing = groups.get(holding.type) || [];
    groups.set(holding.type, [...existing, holding]);
  }

  return groups;
}

/**
 * Check if a snapshot date is stale (older than 2 months from now)
 */
function isSnapshotStale(dateString: string): boolean {
  const snapshotDate = new Date(dateString);
  const now = new Date();

  // Calculate 2 months ago
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  return snapshotDate < twoMonthsAgo;
}

/**
 * Format balance as currency
 */
function formatBalance(balance: string, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(balance);
  return `${symbol}${num.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date as "Month Year" (e.g., "Jan 2026")
 */
function formatSnapshotDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Format quantity with appropriate decimal places
 */
function formatQuantity(value: number | null): string {
  if (value === null || value === 0) return "—";
  // Use more decimals for crypto (often fractional), fewer for stocks
  if (value < 1) {
    return value.toLocaleString("en-AU", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    });
  }
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${price.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format change percent with sign and color indicator
 */
function formatChangePercent(percent: number): { text: string; isPositive: boolean } {
  const sign = percent >= 0 ? "+" : "";
  return {
    text: `${sign}${percent.toFixed(2)}%`,
    isPositive: percent >= 0,
  };
}

/**
 * Format change absolute value with sign
 */
function formatChangeAbsolute(value: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const absValue = Math.abs(value).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${absValue}`;
}

/**
 * Format a date as "X ago" (e.g., "5 min ago", "2 hours ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

/**
 * Calculate market value (quantity x price)
 */
function calculateMarketValue(quantity: number | null, price: number | null): number | null {
  if (quantity === null || quantity === 0 || price === null) {
    return null;
  }
  return quantity * price;
}

/**
 * Calculate unrealized gain/loss (Market Value - Cost Basis)
 */
function calculateGainLoss(
  marketValue: number | null,
  costBasis: number | null
): { amount: number; percent: number } | null {
  if (marketValue === null || costBasis === null || costBasis === 0) {
    return null;
  }
  const amount = marketValue - costBasis;
  const percent = ((marketValue / costBasis) - 1) * 100;
  return { amount, percent };
}

/**
 * Format gain/loss percentage with sign
 */
function formatGainLossPercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

export function HoldingsTable({ holdings, prices, pricesLoading, onRetryPrice, retryingPriceIds }: HoldingsTableProps) {
  const [editingHolding, setEditingHolding] = useState<HoldingWithData | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithData | null>(null);
  const groupedHoldings = groupHoldingsByType(holdings);
  const queryClient = useQueryClient();

  // Get currency context for display currency conversion
  const { displayCurrency, convert, isLoading: currencyLoading } = useCurrency();

  const deleteMutation = useMutation({
    mutationFn: async (holdingId: string) => {
      const response = await fetch(`/api/holdings/${holdingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete holding");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      toast.success("Holding deleted successfully");
      setDeletingHolding(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (deletingHolding) {
      deleteMutation.mutate(deletingHolding.id);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {HOLDING_TYPE_ORDER.map((type) => {
          const typeHoldings = groupedHoldings.get(type);

          // Skip empty sections
          if (!typeHoldings || typeHoldings.length === 0) {
            return null;
          }

          return (
            <HoldingsTypeSection
              key={type}
              type={type}
              holdings={typeHoldings}
              prices={prices}
              pricesLoading={pricesLoading}
              onEdit={setEditingHolding}
              onDelete={setDeletingHolding}
              onRetryPrice={onRetryPrice}
              retryingPriceIds={retryingPriceIds}
              displayCurrency={displayCurrency}
              convert={convert}
              currencyLoading={currencyLoading}
            />
          );
        })}
      </div>

      {editingHolding && (
        <EditHoldingDialog
          holding={editingHolding}
          open={!!editingHolding}
          onOpenChange={(open) => {
            if (!open) setEditingHolding(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deletingHolding}
        onOpenChange={(open) => {
          if (!open) setDeletingHolding(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holding</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingHolding?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface HoldingsTypeSectionProps {
  type: Holding["type"];
  holdings: HoldingWithData[];
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  onEdit: (holding: HoldingWithData) => void;
  onDelete: (holding: HoldingWithData) => void;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
}

/**
 * PriceCell component displays current price with change and staleness indicators.
 */
interface PriceCellProps {
  holdingId: string;
  holdingCurrency: string;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function PriceCell({ holdingId, holdingCurrency, prices, pricesLoading, onRetry, isRetrying }: PriceCellProps) {
  // Loading state for initial price fetch
  if (pricesLoading) {
    return <span className="text-gray-500 text-sm">Loading...</span>;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  const { price, currency, changePercent, changeAbsolute, fetchedAt, isStale, error } = priceData;
  const displayCurrency = currency || holdingCurrency;

  // Format change display
  const hasChange = changePercent !== null && changeAbsolute !== null;
  const changeInfo = hasChange ? formatChangePercent(changePercent) : null;

  // Show retry button for errors or if currently retrying
  const showRetry = (error || isRetrying) && onRetry;

  return (
    <div className="flex flex-col gap-0.5 items-end">
      {/* Main price */}
      <span className="text-white font-mono">
        {formatPrice(price, displayCurrency)}
      </span>

      {/* Change indicator */}
      {hasChange && changeInfo && (
        <span
          className={`text-xs flex items-center gap-0.5 ${
            changeInfo.isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {changeInfo.isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {changeInfo.text}
          {changeAbsolute !== null && (
            <span className="text-gray-400 ml-1">
              ({formatChangeAbsolute(changeAbsolute, displayCurrency)})
            </span>
          )}
        </span>
      )}

      {/* Staleness/timestamp indicator with optional retry button */}
      <span
        className={`text-xs flex items-center gap-0.5 ${
          isStale || error ? "text-yellow-400" : "text-gray-500"
        }`}
      >
        {isRetrying ? (
          <RotateCw className="h-3 w-3 animate-spin" />
        ) : (
          <>
            {isStale && <AlertTriangle className="h-3 w-3" />}
            {error && !isStale && <AlertTriangle className="h-3 w-3" />}
            {!isStale && !error && fetchedAt && <Clock className="h-3 w-3" />}
          </>
        )}
        {isRetrying ? (
          <span>Retrying...</span>
        ) : (
          <>
            {fetchedAt ? formatTimeAgo(fetchedAt) : "unknown"}
            {error && <span className="ml-1">(error)</span>}
          </>
        )}
        {showRetry && !isRetrying && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1.5 p-0.5 rounded hover:bg-gray-700 transition-colors"
            title="Retry price fetch"
          >
            <RotateCw className="h-3 w-3" />
            <span className="sr-only">Retry</span>
          </button>
        )}
      </span>
    </div>
  );
}

/**
 * MarketValueCell component displays market value (quantity x price).
 * Now with display currency conversion and native currency indicator.
 */
interface MarketValueCellProps {
  quantity: number | null;
  holdingId: string;
  holdingCurrency: string;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
}

function MarketValueCell({
  quantity,
  holdingId,
  holdingCurrency,
  prices,
  pricesLoading,
  displayCurrency,
  convert,
  currencyLoading,
}: MarketValueCellProps) {
  // Loading state
  if (pricesLoading || currencyLoading) {
    return <CurrencyDisplay amount={0} currency={displayCurrency} isLoading />;
  }

  // No quantity - cannot calculate market value
  if (quantity === null || quantity === 0) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  const { price, currency } = priceData;
  const nativeCurrency = (currency || holdingCurrency) as Currency;
  const nativeMarketValue = calculateMarketValue(quantity, price);

  if (nativeMarketValue === null) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // Convert to display currency
  const displayMarketValue = convert(nativeMarketValue, nativeCurrency);

  return (
    <CurrencyDisplay
      amount={displayMarketValue}
      currency={displayCurrency}
      showNative
      nativeCurrency={nativeCurrency}
      nativeAmount={nativeMarketValue}
      className="text-white font-mono"
    />
  );
}

/**
 * GainLossCell component displays unrealized gain/loss (Market Value - Cost Basis).
 * Now with display currency conversion and native currency indicator.
 */
interface GainLossCellProps {
  quantity: number | null;
  costBasis: number | null;
  holdingId: string;
  holdingCurrency: string;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
}

function GainLossCell({
  quantity,
  costBasis,
  holdingId,
  holdingCurrency,
  prices,
  pricesLoading,
  displayCurrency,
  convert,
  currencyLoading,
}: GainLossCellProps) {
  // Loading state
  if (pricesLoading || currencyLoading) {
    return <CurrencyDisplay amount={0} currency={displayCurrency} isLoading />;
  }

  // No quantity - cannot calculate market value
  if (quantity === null || quantity === 0) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // No cost basis - cannot calculate gain/loss
  if (costBasis === null || costBasis === 0) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  const { price, currency } = priceData;
  const nativeCurrency = (currency || holdingCurrency) as Currency;
  const marketValue = calculateMarketValue(quantity, price);
  const nativeGainLoss = calculateGainLoss(marketValue, costBasis);

  if (!nativeGainLoss) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // Convert gain/loss to display currency
  const displayGainLoss = convert(nativeGainLoss.amount, nativeCurrency);
  const isPositive = displayGainLoss >= 0;
  const colorClass = isPositive ? "text-green-400" : "text-red-400";

  return (
    <div className="flex flex-col gap-0.5 items-end">
      {/* Amount */}
      <CurrencyDisplay
        amount={displayGainLoss}
        currency={displayCurrency}
        showNative
        nativeCurrency={nativeCurrency}
        nativeAmount={nativeGainLoss.amount}
        className={`font-mono ${colorClass}`}
      />
      {/* Percentage - same regardless of currency */}
      <span className={`text-xs ${colorClass}`}>
        {formatGainLossPercent(nativeGainLoss.percent)}
      </span>
    </div>
  );
}

/**
 * CostBasisCell component displays cost basis or avg cost with currency conversion.
 */
interface CostBasisCellProps {
  costBasis: number | null;
  holdingCurrency: Currency;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
}

function CostBasisCell({
  costBasis,
  holdingCurrency,
  displayCurrency,
  convert,
  currencyLoading,
}: CostBasisCellProps) {
  // Loading state
  if (currencyLoading) {
    return <CurrencyDisplay amount={0} currency={displayCurrency} isLoading />;
  }

  // No cost basis
  if (costBasis === null || costBasis === 0) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  // Convert to display currency
  const displayCostBasis = convert(costBasis, holdingCurrency);

  return (
    <CurrencyDisplay
      amount={displayCostBasis}
      currency={displayCurrency}
      showNative
      nativeCurrency={holdingCurrency}
      nativeAmount={costBasis}
      className="text-gray-300 font-mono"
    />
  );
}

function HoldingsTypeSection({
  type,
  holdings,
  prices,
  pricesLoading,
  onEdit,
  onDelete,
  onRetryPrice,
  retryingPriceIds,
  displayCurrency,
  convert,
  currencyLoading,
}: HoldingsTypeSectionProps) {
  const label = HOLDING_TYPE_LABELS[type];
  const isTradeable = TRADEABLE_TYPES.includes(type as (typeof TRADEABLE_TYPES)[number]);
  const isSnapshotType = SNAPSHOT_TYPES.includes(type as (typeof SNAPSHOT_TYPES)[number]);

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">
        {label}{" "}
        <span className="text-gray-400 font-normal">({holdings.length})</span>
      </h2>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              {isTradeable && (
                <TableHead className="text-gray-400">Symbol</TableHead>
              )}
              {isSnapshotType && (
                <TableHead className="text-gray-400">Balance</TableHead>
              )}
              <TableHead className="text-gray-400">Currency</TableHead>
              {isTradeable && (
                <>
                  <TableHead className="text-gray-400 text-right">Quantity</TableHead>
                  <TableHead className="text-gray-400 text-right">Price</TableHead>
                  <TableHead className="text-gray-400 text-right">Market Value</TableHead>
                  <TableHead className="text-gray-400 text-right">Gain/Loss</TableHead>
                  <TableHead className="text-gray-400 text-right">Cost Basis</TableHead>
                  <TableHead className="text-gray-400 text-right">Avg Cost</TableHead>
                </>
              )}
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => {
              const snapshot = holding.latestSnapshot;
              const isStale = snapshot ? isSnapshotStale(snapshot.date) : false;

              return (
                <TableRow
                  key={holding.id}
                  className={`border-gray-800 ${holding.isDormant ? "opacity-60" : ""}`}
                >
                  <TableCell className="text-white font-medium">
                    {holding.name}
                  </TableCell>
                  {isTradeable && (
                    <TableCell className="text-gray-300">
                      {holding.symbol || "—"}
                    </TableCell>
                  )}
                  {isSnapshotType && (
                    <TableCell>
                      {snapshot ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white">
                            {formatBalance(snapshot.balance, snapshot.currency)}
                          </span>
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isStale ? "text-yellow-400" : "text-gray-500"
                            }`}
                          >
                            {isStale && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            as of {formatSnapshotDate(snapshot.date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No data</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-gray-300">
                    {holding.currency}
                  </TableCell>
                  {isTradeable && (
                    <>
                      <TableCell className="text-gray-300 text-right font-mono">
                        {formatQuantity(holding.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <PriceCell
                          holdingId={holding.id}
                          holdingCurrency={holding.currency}
                          prices={prices}
                          pricesLoading={pricesLoading}
                          onRetry={onRetryPrice ? () => onRetryPrice(holding.id) : undefined}
                          isRetrying={retryingPriceIds?.has(holding.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <MarketValueCell
                          quantity={holding.quantity}
                          holdingId={holding.id}
                          holdingCurrency={holding.currency}
                          prices={prices}
                          pricesLoading={pricesLoading}
                          displayCurrency={displayCurrency}
                          convert={convert}
                          currencyLoading={currencyLoading}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <GainLossCell
                          quantity={holding.quantity}
                          costBasis={holding.costBasis}
                          holdingId={holding.id}
                          holdingCurrency={holding.currency}
                          prices={prices}
                          pricesLoading={pricesLoading}
                          displayCurrency={displayCurrency}
                          convert={convert}
                          currencyLoading={currencyLoading}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CostBasisCell
                          costBasis={holding.costBasis}
                          holdingCurrency={holding.currency as Currency}
                          displayCurrency={displayCurrency}
                          convert={convert}
                          currencyLoading={currencyLoading}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CostBasisCell
                          costBasis={holding.avgCost}
                          holdingCurrency={holding.currency as Currency}
                          displayCurrency={displayCurrency}
                          convert={convert}
                          currencyLoading={currencyLoading}
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {holding.isDormant ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                        Dormant
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        onClick={() => onEdit(holding)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit {holding.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => onDelete(holding)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {holding.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
