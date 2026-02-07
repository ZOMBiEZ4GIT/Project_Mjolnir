"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { type Currency } from "@/lib/utils/currency";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { ChangeBadge } from "@/components/dashboard/change-badge";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";

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

function PerformersSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="h-4 w-28 bg-muted rounded mb-4" />
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
          <div>
            <div className="h-4 w-24 bg-muted rounded mb-4" />
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

interface PerformerRowProps {
  performer: Performer;
  isGainer: boolean;
  currency: Currency;
  convert: (amount: number, fromCurrency: Currency) => number;
}

function PerformerRow({ performer, isGainer, currency, convert }: PerformerRowProps) {
  const gainLossConverted = convert(performer.gainLoss, "AUD");

  return (
    <motion.div variants={staggerItem}>
      <Link
        href={`/holdings/${performer.holdingId}`}
        className="flex justify-between items-center py-2 px-2 -mx-2 rounded-lg transition-[background-color] duration-150 hover:bg-accent/5 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium truncate">{performer.name}</p>
          <p className="text-body-sm text-muted-foreground">{performer.symbol}</p>
        </div>
        <div className="ml-4">
          <ChangeBadge
            amount={isGainer ? Math.abs(gainLossConverted) : -Math.abs(gainLossConverted)}
            percentage={isGainer ? Math.abs(performer.gainLossPercent) : -Math.abs(performer.gainLossPercent)}
            currency={currency}
            size="sm"
          />
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyPerformerList({ type }: { type: "gainers" | "losers" }) {
  return (
    <div className="py-8 text-center">
      <p className="text-body-sm text-muted-foreground">
        No {type === "gainers" ? "gains" : "losses"} to show
      </p>
    </div>
  );
}

export function TopPerformers() {
  const shouldReduceMotion = useReducedMotion();
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading, convert } = useCurrency();

  const {
    data: performersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.topPerformers,
    queryFn: fetchPerformers,
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60 * 1000,
  });

  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <PerformersSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load top performers</p>
      </div>
    );
  }

  if (!performersData) {
    return <PerformersSkeleton />;
  }

  const { gainers, losers } = performersData;
  const hasNoData = gainers.length === 0 && losers.length === 0;

  if (hasNoData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-label uppercase text-muted-foreground mb-4">
          Top Performers
        </h3>
        <div className="py-8 text-center">
          <p className="text-body-sm text-muted-foreground">
            No tradeable holdings with performance data yet.
          </p>
          <p className="text-body-sm text-muted-foreground/60 mt-2">
            Add stocks, ETFs, or crypto to see your top gainers and losers.
          </p>
        </div>
      </div>
    );
  }

  const containerVariants = shouldReduceMotion ? undefined : staggerContainer;

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      initial={shouldReduceMotion ? false : fadeIn.initial}
      animate={fadeIn.animate}
      transition={shouldReduceMotion ? { duration: 0 } : fadeIn.transition}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-positive" />
            <h3 className="text-label uppercase text-muted-foreground">
              Top Gainers
            </h3>
          </div>
          {gainers.length > 0 ? (
            <motion.div
              className="space-y-1"
              variants={containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
            >
              {gainers.map((performer) => (
                <PerformerRow
                  key={performer.holdingId}
                  performer={performer}
                  isGainer={true}
                  currency={displayCurrency}
                  convert={convert}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyPerformerList type="gainers" />
          )}
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <h3 className="text-label uppercase text-muted-foreground">
              Top Losers
            </h3>
          </div>
          {losers.length > 0 ? (
            <motion.div
              className="space-y-1"
              variants={containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
            >
              {losers.map((performer) => (
                <PerformerRow
                  key={performer.holdingId}
                  performer={performer}
                  isGainer={false}
                  currency={displayCurrency}
                  convert={convert}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyPerformerList type="losers" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
