"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Pencil, Trash2, AlertTriangle, TrendingUp, TrendingDown, Minus, RotateCw } from "lucide-react";
import { PriceFlash } from "./price-flash";
import { PriceNumberTicker } from "./price-number-ticker";
import { PriceTimestamp } from "./price-timestamp";
import { PriceSkeleton } from "./price-skeleton";
import type { Holding } from "@/lib/db/schema";
import type { HoldingTypeFilter } from "./filter-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GroupHeader } from "./group-header";
import { EditHoldingDialog } from "./edit-holding-dialog";
import { DeleteHoldingDialog } from "./delete-holding-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Sparkline } from "@/components/charts";
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

export type GroupByValue = "type" | "currency";

interface HoldingsTableProps {
  holdings: HoldingWithData[];
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  pricesRefreshing?: boolean;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
  groupBy?: GroupByValue;
  typeFilter?: HoldingTypeFilter;
  sparklineData?: Map<string, number[]>;
  sparklineLoading?: boolean;
}

function groupHoldingsByType(holdings: HoldingWithData[]): Map<Holding["type"], HoldingWithData[]> {
  const groups = new Map<Holding["type"], HoldingWithData[]>();

  for (const holding of holdings) {
    const existing = groups.get(holding.type) || [];
    groups.set(holding.type, [...existing, holding]);
  }

  return groups;
}

// Order for currency grouping display
const CURRENCY_ORDER: Currency[] = ["AUD", "NZD", "USD"];

// Currency labels for section headers
const CURRENCY_LABELS: Record<Currency, string> = {
  AUD: "Australian Dollar (AUD)",
  NZD: "New Zealand Dollar (NZD)",
  USD: "US Dollar (USD)",
};

function groupHoldingsByCurrency(holdings: HoldingWithData[]): Map<Currency, HoldingWithData[]> {
  const groups = new Map<Currency, HoldingWithData[]>();

  for (const holding of holdings) {
    const currency = holding.currency as Currency;
    const existing = groups.get(currency) || [];
    groups.set(currency, [...existing, holding]);
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

export function HoldingsTable({ holdings, prices, pricesLoading, pricesRefreshing, onRetryPrice, retryingPriceIds, groupBy = "type", typeFilter = "all", sparklineData, sparklineLoading }: HoldingsTableProps) {
  const [editingHolding, setEditingHolding] = useState<HoldingWithData | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithData | null>(null);
  const groupedByType = groupHoldingsByType(holdings);
  const groupedByCurrency = groupHoldingsByCurrency(holdings);
  const shouldReduceMotion = useReducedMotion();

  // Get currency context for display currency conversion
  const { displayCurrency, convert, showNativeCurrency, isLoading: currencyLoading } = useCurrency();

  // Determine if we should show grouped view (All tab) or flat view (specific type tab)
  const showGrouped = typeFilter === "all";

  // For flat view, determine the holding type to decide which columns to show
  const flatType = typeFilter !== "all" ? typeFilter : undefined;
  const flatIsTradeable = flatType ? TRADEABLE_TYPES.includes(flatType as (typeof TRADEABLE_TYPES)[number]) : false;
  const flatIsSnapshot = flatType ? SNAPSHOT_TYPES.includes(flatType as (typeof SNAPSHOT_TYPES)[number]) : false;

  // Calculate total portfolio value (absolute sum of assets, used for percentage calculation)
  const portfolioTotal = useMemo(() => {
    if (currencyLoading) return 0;
    let total = 0;
    for (const type of HOLDING_TYPE_ORDER) {
      const typeHoldings = groupedByType.get(type);
      if (!typeHoldings || typeHoldings.length === 0) continue;
      const groupTotal = calculateGroupTotal(typeHoldings, prices, convert);
      total += Math.abs(groupTotal);
    }
    return total;
  }, [groupedByType, prices, convert, currencyLoading]);

  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={typeFilter}
          className="space-y-8"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
        >
          {groupBy === "type" ? (
            showGrouped ? (
              // Group by holding type with collapsible sections
              HOLDING_TYPE_ORDER.map((type) => {
                const typeHoldings = groupedByType.get(type);

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
                    pricesRefreshing={pricesRefreshing}
                    onEdit={setEditingHolding}
                    onDelete={setDeletingHolding}
                    onRetryPrice={onRetryPrice}
                    retryingPriceIds={retryingPriceIds}
                    displayCurrency={displayCurrency}
                    convert={convert}
                    currencyLoading={currencyLoading}
                    showNativeCurrency={showNativeCurrency}
                    collapsible
                    portfolioTotal={portfolioTotal}
                    sparklineData={sparklineData}
                    sparklineLoading={sparklineLoading}
                  />
                );
              })
            ) : (
              // Flat list — no group header when specific type is selected
              <HoldingsFlatSection
                holdings={holdings}
                isTradeable={flatIsTradeable}
                isSnapshotType={flatIsSnapshot}
                prices={prices}
                pricesLoading={pricesLoading}
                pricesRefreshing={pricesRefreshing}
                onEdit={setEditingHolding}
                onDelete={setDeletingHolding}
                onRetryPrice={onRetryPrice}
                retryingPriceIds={retryingPriceIds}
                displayCurrency={displayCurrency}
                convert={convert}
                currencyLoading={currencyLoading}
                showNativeCurrency={showNativeCurrency}
                sparklineData={sparklineData}
                sparklineLoading={sparklineLoading}
              />
            )
          ) : (
            // Group by currency
            CURRENCY_ORDER.map((currency) => {
              const currencyHoldings = groupedByCurrency.get(currency);

              // Skip empty sections
              if (!currencyHoldings || currencyHoldings.length === 0) {
                return null;
              }

              return (
                <HoldingsCurrencySection
                  key={currency}
                  sectionCurrency={currency}
                  holdings={currencyHoldings}
                  prices={prices}
                  pricesLoading={pricesLoading}
                  onEdit={setEditingHolding}
                  onDelete={setDeletingHolding}
                  onRetryPrice={onRetryPrice}
                  retryingPriceIds={retryingPriceIds}
                  displayCurrency={displayCurrency}
                  convert={convert}
                  currencyLoading={currencyLoading}
                  showNativeCurrency={showNativeCurrency}
                />
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

      {editingHolding && (
        <EditHoldingDialog
          holding={editingHolding}
          open={!!editingHolding}
          onOpenChange={(open) => {
            if (!open) setEditingHolding(null);
          }}
        />
      )}

      <DeleteHoldingDialog
        holding={deletingHolding}
        open={!!deletingHolding}
        onOpenChange={(open) => {
          if (!open) setDeletingHolding(null);
        }}
      />
    </>
  );
}

interface HoldingsTypeSectionProps {
  type: Holding["type"];
  holdings: HoldingWithData[];
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  pricesRefreshing?: boolean;
  onEdit: (holding: HoldingWithData) => void;
  onDelete: (holding: HoldingWithData) => void;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
  showNativeCurrency?: boolean;
  collapsible?: boolean;
  portfolioTotal?: number;
  sparklineData?: Map<string, number[]>;
  sparklineLoading?: boolean;
}

/**
 * PriceCell component displays current price with change and staleness indicators.
 */
interface PriceCellProps {
  holdingId: string;
  holdingCurrency: string;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  pricesRefreshing?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function PriceCell({ holdingId, holdingCurrency, prices, pricesLoading, pricesRefreshing, onRetry, isRetrying }: PriceCellProps) {
  // Loading state — shaped skeleton
  if (pricesLoading) {
    return <PriceSkeleton variant="price" />;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const { price, currency, changePercent, changeAbsolute, fetchedAt, isStale, error } = priceData;
  const displayCurrency = currency || holdingCurrency;
  const currencyPrefix = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  // Show retry button for errors or if currently retrying
  const showRetry = (error || isRetrying) && onRetry;

  // Stale visual treatment: dimmed text + amber left border
  const priceTextClass = isStale
    ? "text-muted-foreground font-mono"
    : "text-foreground font-mono";

  return (
    <div
      className={`flex flex-col gap-0.5 items-end transition-all duration-200 ${
        isStale ? "border-l-2 border-warning/50 pl-2" : "border-l-2 border-transparent pl-2"
      } ${pricesRefreshing ? "animate-pulse" : ""}`}
    >
      {/* Main price with flash + number ticker */}
      <PriceFlash value={price}>
        <PriceNumberTicker
          value={price}
          prefix={currencyPrefix}
          className={priceTextClass}
        />
      </PriceFlash>

      {/* Change indicator with crossfade on direction change */}
      {changePercent !== null && (
        <AnimatePresence mode="wait">
          <motion.span
            key={changePercent > 0 ? "up" : changePercent < 0 ? "down" : "zero"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`text-xs flex items-center gap-0.5 ${
              changePercent > 0
                ? "text-positive"
                : changePercent < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {changePercent > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : changePercent < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {changePercent === 0 ? "0.00%" : formatChangePercent(changePercent).text}
            {changeAbsolute !== null && (
              <span className="text-muted-foreground ml-1">
                ({formatChangeAbsolute(changeAbsolute, displayCurrency)})
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      )}

      {/* Timestamp */}
      <PriceTimestamp fetchedAt={fetchedAt} isStale={isStale} error={error} />

      {/* Retry button (pill-shaped, with entrance/exit animation) */}
      <AnimatePresence>
        {showRetry && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
            disabled={isRetrying}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title="Retry price fetch"
          >
            <RotateCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying..." : "Retry"}
          </motion.button>
        )}
      </AnimatePresence>
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
  showNativeCurrency?: boolean;
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
  showNativeCurrency,
}: MarketValueCellProps) {
  // Loading state — shaped skeleton
  if (pricesLoading || currencyLoading) {
    return <PriceSkeleton variant="value" />;
  }

  // No quantity - cannot calculate market value
  if (quantity === null || quantity === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const { price, currency } = priceData;
  const nativeCurrency = (currency || holdingCurrency) as Currency;
  const nativeMarketValue = calculateMarketValue(quantity, price);

  if (nativeMarketValue === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // When showNativeCurrency is true, display in native currency (no conversion)
  if (showNativeCurrency) {
    return (
      <CurrencyDisplay
        amount={nativeMarketValue}
        currency={nativeCurrency}
        className="text-foreground font-mono"
      />
    );
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
      className="text-foreground font-mono"
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
  showNativeCurrency?: boolean;
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
  showNativeCurrency,
}: GainLossCellProps) {
  // Loading state — shaped skeleton
  if (pricesLoading || currencyLoading) {
    return <PriceSkeleton variant="value" />;
  }

  // No quantity - cannot calculate market value
  if (quantity === null || quantity === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // No cost basis - cannot calculate gain/loss
  if (costBasis === null || costBasis === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // No price data available
  const priceData = prices?.get(holdingId);
  if (!priceData) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const { price, currency } = priceData;
  const nativeCurrency = (currency || holdingCurrency) as Currency;
  const marketValue = calculateMarketValue(quantity, price);
  const nativeGainLoss = calculateGainLoss(marketValue, costBasis);

  if (!nativeGainLoss) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // When showNativeCurrency is true, display in native currency (no conversion)
  if (showNativeCurrency) {
    const isPositive = nativeGainLoss.amount >= 0;
    const colorClass = isPositive ? "text-positive" : "text-destructive";

    return (
      <div className="flex flex-col gap-0.5 items-end">
        <CurrencyDisplay
          amount={nativeGainLoss.amount}
          currency={nativeCurrency}
          className={`font-mono ${colorClass}`}
        />
        <span className={`text-xs ${colorClass}`}>
          {formatGainLossPercent(nativeGainLoss.percent)}
        </span>
      </div>
    );
  }

  // Convert gain/loss to display currency
  const displayGainLoss = convert(nativeGainLoss.amount, nativeCurrency);
  const isPositive = displayGainLoss >= 0;
  const colorClass = isPositive ? "text-positive" : "text-destructive";

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
  showNativeCurrency?: boolean;
}

function CostBasisCell({
  costBasis,
  holdingCurrency,
  displayCurrency,
  convert,
  currencyLoading,
  showNativeCurrency,
}: CostBasisCellProps) {
  // Loading state
  if (currencyLoading) {
    return <CurrencyDisplay amount={0} currency={displayCurrency} isLoading />;
  }

  // No cost basis
  if (costBasis === null || costBasis === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // When showNativeCurrency is true, display in native currency (no conversion)
  if (showNativeCurrency) {
    return (
      <CurrencyDisplay
        amount={costBasis}
        currency={holdingCurrency}
        className="text-muted-foreground font-mono"
      />
    );
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
      className="text-muted-foreground font-mono"
    />
  );
}

function HoldingsTypeSection({
  type,
  holdings,
  prices,
  pricesLoading,
  pricesRefreshing,
  onEdit,
  onDelete,
  onRetryPrice,
  retryingPriceIds,
  displayCurrency,
  convert,
  currencyLoading,
  showNativeCurrency,
  collapsible = false,
  portfolioTotal = 0,
  sparklineData,
  sparklineLoading,
}: HoldingsTypeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const label = HOLDING_TYPE_LABELS[type];
  const isTradeable = TRADEABLE_TYPES.includes(type as (typeof TRADEABLE_TYPES)[number]);
  const isSnapshotType = SNAPSHOT_TYPES.includes(type as (typeof SNAPSHOT_TYPES)[number]);
  const isDebt = type === "debt";

  // Calculate group total in display currency
  const groupTotal = useMemo(
    () => calculateGroupTotal(holdings, prices, convert),
    [holdings, prices, convert]
  );

  // Calculate portfolio percentage (using absolute values)
  const portfolioPercent = portfolioTotal > 0
    ? (Math.abs(groupTotal) / portfolioTotal) * 100
    : null;

  return (
    <section>
      {collapsible ? (
        <GroupHeader
          label={label}
          count={holdings.length}
          totalValue={groupTotal}
          portfolioPercent={portfolioPercent}
          displayCurrency={displayCurrency}
          currencyLoading={currencyLoading}
          isDebt={isDebt}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((prev) => !prev)}
          contentId={`holdings-group-${type}`}
        />
      ) : (
        <h2 className="text-lg font-semibold text-foreground mb-3">
          {label}{" "}
          <span className="text-muted-foreground font-normal">({holdings.length})</span>
        </h2>
      )}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
            id={`holdings-group-${type}`}
          >
            <div className="rounded-lg border border-border overflow-x-auto">
              <HoldingsTableContent
                holdings={holdings}
                isTradeable={isTradeable}
                isSnapshotType={isSnapshotType}
                prices={prices}
                pricesLoading={pricesLoading}
                pricesRefreshing={pricesRefreshing}
                onEdit={onEdit}
                onDelete={onDelete}
                onRetryPrice={onRetryPrice}
                retryingPriceIds={retryingPriceIds}
                displayCurrency={displayCurrency}
                convert={convert}
                currencyLoading={currencyLoading}
                showNativeCurrency={showNativeCurrency}
                sparklineData={sparklineData}
                sparklineLoading={sparklineLoading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * Flat section — renders holdings in a table without a group header.
 * Used when a specific type filter is active.
 */
interface HoldingsFlatSectionProps {
  holdings: HoldingWithData[];
  isTradeable: boolean;
  isSnapshotType: boolean;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  pricesRefreshing?: boolean;
  onEdit: (holding: HoldingWithData) => void;
  onDelete: (holding: HoldingWithData) => void;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
  showNativeCurrency?: boolean;
  sparklineData?: Map<string, number[]>;
  sparklineLoading?: boolean;
}

function HoldingsFlatSection({
  holdings,
  isTradeable,
  isSnapshotType,
  prices,
  pricesLoading,
  pricesRefreshing,
  onEdit,
  onDelete,
  onRetryPrice,
  retryingPriceIds,
  displayCurrency,
  convert,
  currencyLoading,
  showNativeCurrency,
  sparklineData,
  sparklineLoading,
}: HoldingsFlatSectionProps) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <HoldingsTableContent
        holdings={holdings}
        isTradeable={isTradeable}
        isSnapshotType={isSnapshotType}
        prices={prices}
        pricesLoading={pricesLoading}
        pricesRefreshing={pricesRefreshing}
        onEdit={onEdit}
        onDelete={onDelete}
        onRetryPrice={onRetryPrice}
        retryingPriceIds={retryingPriceIds}
        displayCurrency={displayCurrency}
        convert={convert}
        currencyLoading={currencyLoading}
        showNativeCurrency={showNativeCurrency}
        sparklineData={sparklineData}
        sparklineLoading={sparklineLoading}
      />
    </div>
  );
}

/**
 * Shared table content — used by both grouped and flat views.
 */
// Capped stagger delay: 50ms per row but total stagger completes within 500ms
function getCappedStaggerDelay(count: number): number {
  if (count <= 1) return 0;
  return Math.min(0.05, 0.5 / count);
}

const MotionTableRow = motion.create(TableRow);

interface HoldingsTableContentProps {
  holdings: HoldingWithData[];
  isTradeable: boolean;
  isSnapshotType: boolean;
  prices?: Map<string, PriceData>;
  pricesLoading?: boolean;
  pricesRefreshing?: boolean;
  onEdit: (holding: HoldingWithData) => void;
  onDelete: (holding: HoldingWithData) => void;
  onRetryPrice?: (holdingId: string) => void;
  retryingPriceIds?: Set<string>;
  displayCurrency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
  currencyLoading?: boolean;
  showNativeCurrency?: boolean;
  sparklineData?: Map<string, number[]>;
  sparklineLoading?: boolean;
}

function HoldingsTableContent({
  holdings,
  isTradeable,
  isSnapshotType,
  prices,
  pricesLoading,
  pricesRefreshing,
  onEdit,
  onDelete,
  onRetryPrice,
  retryingPriceIds,
  displayCurrency,
  convert,
  currencyLoading,
  showNativeCurrency,
  sparklineData,
  sparklineLoading,
}: HoldingsTableContentProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Sort holdings so dormant ones appear at the bottom of each section
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      if (a.isDormant === b.isDormant) return 0;
      return a.isDormant ? 1 : -1;
    });
  }, [holdings]);

  const staggerDelay = getCappedStaggerDelay(sortedHoldings.length);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
      },
    },
  };

  const rowVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
      };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground sticky left-0 bg-background z-10">Name</TableHead>
          {isTradeable && (
            <TableHead className="text-muted-foreground hidden sm:table-cell">Symbol</TableHead>
          )}
          {isSnapshotType && (
            <TableHead className="text-muted-foreground">Balance</TableHead>
          )}
          <TableHead className="text-muted-foreground hidden lg:table-cell">Currency</TableHead>
          {isTradeable && (
            <>
              <TableHead className="text-muted-foreground text-right hidden md:table-cell">Quantity</TableHead>
              <TableHead className="text-muted-foreground text-right hidden sm:table-cell">Price</TableHead>
              <TableHead className="text-muted-foreground text-center hidden md:table-cell">Trend</TableHead>
              <TableHead className="text-muted-foreground text-right">Market Value</TableHead>
              <TableHead className="text-muted-foreground text-right hidden md:table-cell">Gain/Loss</TableHead>
              <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Cost Basis</TableHead>
              <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Avg Cost</TableHead>
            </>
          )}
          <TableHead className="text-muted-foreground hidden sm:table-cell">Status</TableHead>
          <TableHead className="text-muted-foreground w-[80px] sm:w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <motion.tbody
        className="[&_tr:last-child]:border-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedHoldings.map((holding) => {
          const snapshot = holding.latestSnapshot;
          const isStale = snapshot ? isSnapshotStale(snapshot.date) : false;

          return (
            <MotionTableRow
              key={holding.id}
              variants={rowVariants}
              className={`border-border cursor-pointer transition-[background-color,transform] duration-150 hover:bg-accent/5 hover:scale-[1.005] active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${holding.isDormant ? "opacity-60" : ""}`}
              tabIndex={0}
              onClick={() => router.push(`/holdings/${holding.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/holdings/${holding.id}`); } }}
              style={{ transformOrigin: "center" }}
            >
              <TableCell className="text-foreground font-medium sticky left-0 bg-background z-10">
                {holding.name}
              </TableCell>
              {isTradeable && (
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {holding.symbol || "—"}
                </TableCell>
              )}
              {isSnapshotType && (
                <TableCell>
                  {snapshot ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground">
                        {formatBalance(snapshot.balance, snapshot.currency)}
                      </span>
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          isStale ? "text-warning" : "text-muted-foreground"
                        }`}
                      >
                        {isStale && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        as of {formatSnapshotDate(snapshot.date)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No data</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {holding.currency}
              </TableCell>
              {isTradeable && (
                <>
                  <TableCell className="text-muted-foreground text-right font-mono hidden md:table-cell">
                    {formatQuantity(holding.quantity)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <PriceCell
                      holdingId={holding.id}
                      holdingCurrency={holding.currency}
                      prices={prices}
                      pricesLoading={pricesLoading}
                      pricesRefreshing={pricesRefreshing}
                      onRetry={onRetryPrice ? () => onRetryPrice(holding.id) : undefined}
                      isRetrying={retryingPriceIds?.has(holding.id)}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex justify-center">
                      {sparklineLoading ? (
                        <div className="w-[80px] h-[32px] bg-muted rounded animate-pulse" />
                      ) : (
                        <Sparkline data={sparklineData?.get(holding.id) ?? []} />
                      )}
                    </div>
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
                      showNativeCurrency={showNativeCurrency}
                    />
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
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
                      showNativeCurrency={showNativeCurrency}
                    />
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <CostBasisCell
                      costBasis={holding.costBasis}
                      holdingCurrency={holding.currency as Currency}
                      displayCurrency={displayCurrency}
                      convert={convert}
                      currencyLoading={currencyLoading}
                      showNativeCurrency={showNativeCurrency}
                    />
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <CostBasisCell
                      costBasis={holding.avgCost}
                      holdingCurrency={holding.currency as Currency}
                      displayCurrency={displayCurrency}
                      convert={convert}
                      currencyLoading={currencyLoading}
                      showNativeCurrency={showNativeCurrency}
                    />
                  </TableCell>
                </>
              )}
              <TableCell className="hidden sm:table-cell">
                {holding.isDormant ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    Dormant
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-positive/20 text-positive">
                    Active
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onEdit(holding); }}
                  >
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sr-only">Edit {holding.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(holding); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sr-only">Delete {holding.name}</span>
                  </Button>
                </div>
              </TableCell>
            </MotionTableRow>
          );
        })}
      </motion.tbody>
    </Table>
  );
}

/**
 * Calculate section subtotal for currency grouping.
 * Includes tradeable holdings (quantity x price) and snapshot holdings (latest balance).
 */
function calculateSectionSubtotal(
  holdings: HoldingWithData[],
  prices?: Map<string, PriceData>
): number {
  let subtotal = 0;

  for (const holding of holdings) {
    const isTradeable = TRADEABLE_TYPES.includes(holding.type as (typeof TRADEABLE_TYPES)[number]);
    const isSnapshotType = SNAPSHOT_TYPES.includes(holding.type as (typeof SNAPSHOT_TYPES)[number]);

    if (isTradeable) {
      // Tradeable holding: quantity x price
      const priceData = prices?.get(holding.id);
      if (holding.quantity && priceData?.price) {
        // Debt should be subtracted, but debt is snapshot-based so won't appear here
        subtotal += holding.quantity * priceData.price;
      }
    } else if (isSnapshotType && holding.latestSnapshot) {
      // Snapshot holding: latest balance
      const balance = Number(holding.latestSnapshot.balance);
      if (holding.type === "debt") {
        // Debt is negative
        subtotal -= balance;
      } else {
        subtotal += balance;
      }
    }
  }

  return subtotal;
}

/**
 * Calculate the total value of holdings in display currency.
 * Converts each holding's value from its native currency to display currency.
 */
function calculateGroupTotal(
  holdings: HoldingWithData[],
  prices: Map<string, PriceData> | undefined,
  convert: (amount: number, fromCurrency: Currency) => number,
): number {
  let total = 0;

  for (const holding of holdings) {
    const isTradeable = TRADEABLE_TYPES.includes(holding.type as (typeof TRADEABLE_TYPES)[number]);
    const isSnapshotType = SNAPSHOT_TYPES.includes(holding.type as (typeof SNAPSHOT_TYPES)[number]);
    const nativeCurrency = holding.currency as Currency;

    if (isTradeable) {
      const priceData = prices?.get(holding.id);
      if (holding.quantity && priceData?.price) {
        const nativeValue = holding.quantity * priceData.price;
        total += convert(nativeValue, nativeCurrency);
      }
    } else if (isSnapshotType && holding.latestSnapshot) {
      const balance = Number(holding.latestSnapshot.balance);
      if (holding.type === "debt") {
        total -= convert(balance, nativeCurrency);
      } else {
        total += convert(balance, nativeCurrency);
      }
    }
  }

  return total;
}

interface HoldingsCurrencySectionProps {
  sectionCurrency: Currency;
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
  showNativeCurrency?: boolean;
}

function HoldingsCurrencySection({
  sectionCurrency,
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
  showNativeCurrency,
}: HoldingsCurrencySectionProps) {
  const label = CURRENCY_LABELS[sectionCurrency];

  // Sort holdings so dormant ones appear at the bottom
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      if (a.isDormant === b.isDormant) return 0;
      return a.isDormant ? 1 : -1;
    });
  }, [holdings]);

  // Calculate subtotal in section's currency
  const subtotal = calculateSectionSubtotal(holdings, prices);

  // Check if any holding in this section is tradeable (to show tradeable columns)
  const hasTradeableHoldings = holdings.some((h) =>
    TRADEABLE_TYPES.includes(h.type as (typeof TRADEABLE_TYPES)[number])
  );

  // Check if any holding in this section uses snapshots (to show balance column)
  const hasSnapshotHoldings = holdings.some((h) =>
    SNAPSHOT_TYPES.includes(h.type as (typeof SNAPSHOT_TYPES)[number])
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          {label}{" "}
          <span className="text-muted-foreground font-normal">({holdings.length})</span>
        </h2>
        <div className="text-right">
          <span className="text-muted-foreground text-sm">Subtotal: </span>
          {currencyLoading ? (
            <span className="inline-block w-20 h-5 bg-muted rounded animate-pulse" />
          ) : (
            <CurrencyDisplay
              amount={subtotal}
              currency={sectionCurrency}
              className="text-foreground font-semibold"
            />
          )}
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground sticky left-0 bg-background z-10">Name</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Type</TableHead>
              {hasTradeableHoldings && (
                <TableHead className="text-muted-foreground hidden md:table-cell">Symbol</TableHead>
              )}
              {hasSnapshotHoldings && (
                <TableHead className="text-muted-foreground">Balance</TableHead>
              )}
              {hasTradeableHoldings && (
                <>
                  <TableHead className="text-muted-foreground text-right hidden md:table-cell">Quantity</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-muted-foreground text-right">Market Value</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden md:table-cell">Gain/Loss</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Cost Basis</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Avg Cost</TableHead>
                </>
              )}
              <TableHead className="text-muted-foreground hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-muted-foreground w-[80px] sm:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHoldings.map((holding) => {
              const snapshot = holding.latestSnapshot;
              const isStale = snapshot ? isSnapshotStale(snapshot.date) : false;
              const isTradeable = TRADEABLE_TYPES.includes(holding.type as (typeof TRADEABLE_TYPES)[number]);
              const isSnapshotType = SNAPSHOT_TYPES.includes(holding.type as (typeof SNAPSHOT_TYPES)[number]);

              return (
                <TableRow
                  key={holding.id}
                  className={`border-border ${holding.isDormant ? "opacity-60" : ""}`}
                >
                  <TableCell className="text-foreground font-medium sticky left-0 bg-background z-10">
                    {holding.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {HOLDING_TYPE_LABELS[holding.type]}
                  </TableCell>
                  {hasTradeableHoldings && (
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {isTradeable ? (holding.symbol || "—") : "—"}
                    </TableCell>
                  )}
                  {hasSnapshotHoldings && (
                    <TableCell>
                      {isSnapshotType && snapshot ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">
                            {formatBalance(snapshot.balance, snapshot.currency)}
                          </span>
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isStale ? "text-warning" : "text-muted-foreground"
                            }`}
                          >
                            {isStale && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            as of {formatSnapshotDate(snapshot.date)}
                          </span>
                        </div>
                      ) : isSnapshotType ? (
                        <span className="text-muted-foreground text-sm">No data</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}
                  {hasTradeableHoldings && (
                    <>
                      <TableCell className="text-muted-foreground text-right font-mono hidden md:table-cell">
                        {isTradeable ? formatQuantity(holding.quantity) : "—"}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {isTradeable ? (
                          <PriceCell
                            holdingId={holding.id}
                            holdingCurrency={holding.currency}
                            prices={prices}
                            pricesLoading={pricesLoading}
                            onRetry={onRetryPrice ? () => onRetryPrice(holding.id) : undefined}
                            isRetrying={retryingPriceIds?.has(holding.id)}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isTradeable ? (
                          <MarketValueCell
                            quantity={holding.quantity}
                            holdingId={holding.id}
                            holdingCurrency={holding.currency}
                            prices={prices}
                            pricesLoading={pricesLoading}
                            displayCurrency={displayCurrency}
                            convert={convert}
                            currencyLoading={currencyLoading}
                            showNativeCurrency={showNativeCurrency}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {isTradeable ? (
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
                            showNativeCurrency={showNativeCurrency}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {isTradeable ? (
                          <CostBasisCell
                            costBasis={holding.costBasis}
                            holdingCurrency={holding.currency as Currency}
                            displayCurrency={displayCurrency}
                            convert={convert}
                            currencyLoading={currencyLoading}
                            showNativeCurrency={showNativeCurrency}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {isTradeable ? (
                          <CostBasisCell
                            costBasis={holding.avgCost}
                            holdingCurrency={holding.currency as Currency}
                            displayCurrency={displayCurrency}
                            convert={convert}
                            currencyLoading={currencyLoading}
                            showNativeCurrency={showNativeCurrency}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="hidden sm:table-cell">
                    {holding.isDormant ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Dormant
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-positive/20 text-positive">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(holding)}
                      >
                        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="sr-only">Edit {holding.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(holding)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
