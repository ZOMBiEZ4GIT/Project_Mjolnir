"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, TrendingUp, TrendingDown, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrency } from "@/components/providers/currency-provider";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { EditHoldingDialog } from "@/components/holdings/edit-holding-dialog";
import { HoldingPriceChart } from "@/components/holdings/holding-price-chart";
import { SuperBalanceHistoryChart } from "@/components/holdings/super-balance-history-chart";
import type { Holding } from "@/lib/db/schema";
import type { Currency } from "@/lib/utils/currency";
import { isTradeable as isTradeableType } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

export const dynamic = "force-dynamic";

// Holding type display labels (singular, with "Cryptocurrency" for detail page)
const HOLDING_TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Cryptocurrency",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

interface HoldingWithData extends Holding {
  quantity?: number | null;
  costBasis?: number | null;
  avgCost?: number | null;
  latestSnapshot?: {
    id: string;
    holdingId: string;
    date: string;
    balance: string;
    currency: string;
  } | null;
}

interface PriceData {
  price: number;
  currency: string;
  changePercent: number | null;
  changeAbsolute: number | null;
  fetchedAt: string | null;
  isStale: boolean;
  error?: string;
}

async function fetchHolding(id: string): Promise<HoldingWithData> {
  const response = await fetch(
    `/api/holdings/${id}?include_cost_basis=true&include_latest_snapshot=true`
  );
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Holding not found");
    }
    throw new Error("Failed to fetch holding");
  }
  return response.json();
}

async function fetchPrice(holdingId: string): Promise<PriceData | null> {
  const response = await fetch(`/api/prices?holding_id=${holdingId}`);
  if (!response.ok) {
    return null;
  }
  const prices = await response.json();
  // API returns an array, find the one for this holding
  const priceData = prices.find(
    (p: { holdingId: string }) => p.holdingId === holdingId
  );
  return priceData
    ? {
        price: priceData.price,
        currency: priceData.currency,
        changePercent: priceData.changePercent,
        changeAbsolute: priceData.changeAbsolute,
        fetchedAt: priceData.fetchedAt,
        isStale: priceData.isStale,
        error: priceData.error,
      }
    : null;
}

/**
 * Format a date as "X ago" (e.g., "5 min ago", "2 hours ago")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
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
 * Format a date string to "Month Year" (e.g., "Jan 2026")
 */
function formatSnapshotDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate market value (quantity x price)
 */
function calculateMarketValue(
  quantity: number | null | undefined,
  price: number | null
): number | null {
  if (quantity === null || quantity === undefined || quantity === 0 || price === null) {
    return null;
  }
  return quantity * price;
}

/**
 * Calculate unrealized gain/loss
 */
function calculateGainLoss(
  marketValue: number | null,
  costBasis: number | null | undefined
): { amount: number; percent: number } | null {
  if (
    marketValue === null ||
    costBasis === null ||
    costBasis === undefined ||
    costBasis === 0
  ) {
    return null;
  }
  const amount = marketValue - costBasis;
  const percent = (marketValue / costBasis - 1) * 100;
  return { amount, percent };
}

/**
 * Loading skeleton for the page
 */
function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-6 w-24 bg-muted rounded mb-6" />
        <div className="h-10 w-64 bg-muted rounded mb-2" />
        <div className="h-5 w-32 bg-muted rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card/50 p-6"
            >
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <div className="h-5 w-40 bg-muted rounded mb-6" />
          <div className="h-64 bg-muted/50 rounded" />
        </div>
      </div>
    </div>
  );
}

interface HoldingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function HoldingDetailPage({ params }: HoldingDetailPageProps) {
  const { id } = use(params);
  const { displayCurrency, convert, isLoading: currencyLoading } = useCurrency();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: holding,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.holdings.detail(id),
    queryFn: () => fetchHolding(id),
    enabled: !!id,
  });

  const isTradeable = holding ? isTradeableType(holding.type) : false;

  const isSuper = holding ? holding.type === "super" : false;

  // Fetch price for tradeable holdings
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: queryKeys.prices.single(id),
    queryFn: () => fetchPrice(id),
    enabled: !!id && isTradeable,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Show skeleton while loading
  if (isLoading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/holdings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Holdings
        </Link>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
          <p className="text-destructive text-lg">
            {error.message === "Holding not found"
              ? "Holding not found"
              : "Failed to load holding"}
          </p>
          <Button variant="outline" onClick={() => router.push("/holdings")}>
            Go to Holdings
          </Button>
        </div>
      </div>
    );
  }

  if (!holding) {
    return <PageSkeleton />;
  }

  const holdingCurrency = holding.currency as Currency;

  // Calculate values for tradeable holdings
  const marketValue = isTradeable
    ? calculateMarketValue(holding.quantity, priceData?.price ?? null)
    : null;
  const gainLoss =
    isTradeable && marketValue !== null
      ? calculateGainLoss(marketValue, holding.costBasis)
      : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/holdings"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Holdings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">{holding.name}</h1>
          <div className="flex items-center gap-3">
            {holding.symbol && (
              <span className="text-muted-foreground text-lg">{holding.symbol}</span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              {HOLDING_TYPE_LABELS[holding.type] || holding.type}
            </span>
            {holding.isDormant && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                Dormant
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setIsEditDialogOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Price or Balance card */}
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {isTradeable ? "Current Price" : "Balance"}
          </h3>
          {isTradeable ? (
            priceLoading ? (
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            ) : priceData?.price ? (
              <div>
                <CurrencyDisplay
                  amount={priceData.price}
                  currency={priceData.currency as Currency}
                  className="text-2xl font-bold text-foreground"
                />
                {priceData.changePercent !== null && (
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      priceData.changePercent >= 0
                        ? "text-positive"
                        : "text-destructive"
                    }`}
                  >
                    {priceData.changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {priceData.changePercent >= 0 ? "+" : ""}
                      {priceData.changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
                {priceData.fetchedAt && (
                  <div
                    className={`flex items-center gap-1 mt-2 text-xs ${
                      priceData.isStale ? "text-warning" : "text-muted-foreground"
                    }`}
                  >
                    {priceData.isStale ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {formatTimeAgo(priceData.fetchedAt)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-lg">No price data</span>
            )
          ) : holding.latestSnapshot ? (
            <div>
              <CurrencyDisplay
                amount={Number(holding.latestSnapshot.balance)}
                currency={holding.latestSnapshot.currency as Currency}
                className="text-2xl font-bold text-foreground"
              />
              <p className="text-muted-foreground text-sm mt-1">
                as of {formatSnapshotDate(holding.latestSnapshot.date)}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground text-lg">No balance recorded</span>
          )}
        </div>

        {/* Market Value / Cost Basis card (tradeable only) */}
        {isTradeable && (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Market Value
            </h3>
            {currencyLoading ? (
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            ) : marketValue !== null ? (
              <div>
                <CurrencyDisplay
                  amount={convert(marketValue, holdingCurrency)}
                  currency={displayCurrency}
                  showNative
                  nativeCurrency={holdingCurrency}
                  nativeAmount={marketValue}
                  className="text-2xl font-bold text-foreground"
                />
                <p className="text-muted-foreground text-sm mt-1">
                  {holding.quantity?.toLocaleString("en-AU", {
                    maximumFractionDigits: 4,
                  })}{" "}
                  units
                </p>
              </div>
            ) : (
              <span className="text-muted-foreground text-lg">—</span>
            )}
          </div>
        )}

        {/* Gain/Loss card (tradeable only) */}
        {isTradeable && (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Unrealized Gain/Loss
            </h3>
            {currencyLoading ? (
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            ) : gainLoss !== null ? (
              <div>
                <CurrencyDisplay
                  amount={convert(gainLoss.amount, holdingCurrency)}
                  currency={displayCurrency}
                  showNative
                  nativeCurrency={holdingCurrency}
                  nativeAmount={gainLoss.amount}
                  className={`text-2xl font-bold ${
                    gainLoss.amount >= 0 ? "text-positive" : "text-destructive"
                  }`}
                />
                <p
                  className={`text-sm mt-1 ${
                    gainLoss.percent >= 0 ? "text-positive" : "text-destructive"
                  }`}
                >
                  {gainLoss.percent >= 0 ? "+" : ""}
                  {gainLoss.percent.toFixed(2)}%
                </p>
              </div>
            ) : (
              <span className="text-muted-foreground text-lg">—</span>
            )}
          </div>
        )}

        {/* Currency card (for non-tradeable) */}
        {!isTradeable && (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Currency
            </h3>
            <p className="text-2xl font-bold text-foreground">{holding.currency}</p>
          </div>
        )}

        {/* Exchange card (for tradeable with exchange) */}
        {isTradeable && holding.exchange && (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Exchange
            </h3>
            <p className="text-2xl font-bold text-foreground">{holding.exchange}</p>
            <p className="text-muted-foreground text-sm mt-1">{holding.currency}</p>
          </div>
        )}
      </div>

      {/* Price Chart (tradeable only) */}
      {isTradeable && (
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
            Price & Quantity History
          </h3>
          <HoldingPriceChart
            holdingId={id}
            holdingCurrency={holdingCurrency}
          />
        </div>
      )}

      {/* Balance & Contribution Chart (super only) */}
      {isSuper && (
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
            Balance & Contribution History
          </h3>
          <SuperBalanceHistoryChart
            holdingId={id}
            holdingCurrency={holdingCurrency}
          />
        </div>
      )}

      {/* Notes section */}
      {holding.notes && (
        <div className="rounded-lg border border-border bg-card/50 p-6 mt-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Notes
          </h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{holding.notes}</p>
        </div>
      )}

      {/* Edit dialog */}
      <EditHoldingDialog
        holding={holding}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
