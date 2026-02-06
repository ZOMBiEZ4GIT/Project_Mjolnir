"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { type Currency, type ExchangeRates } from "@/lib/utils/currency";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { fadeIn, staggerItem } from "@/lib/animations";
import { NumberTicker } from "@/components/dashboard/number-ticker";

interface CurrencyExposureItem {
  currency: Currency;
  value: number;
  valueNative: number;
  percentage: number;
  count: number;
}

interface CurrencyExposureResponse {
  exposure: CurrencyExposureItem[];
  totalAssets: number;
  displayCurrency: Currency;
  ratesUsed: ExchangeRates;
  calculatedAt: string;
}

async function fetchCurrencyExposure(displayCurrency: Currency): Promise<CurrencyExposureResponse> {
  const response = await fetch(`/api/currency-exposure?displayCurrency=${displayCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch currency exposure");
  }
  return response.json();
}

/**
 * Formats a percentage.
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns the display name for a currency.
 */
function getCurrencyDisplayName(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "Australian Dollar";
    case "NZD":
      return "New Zealand Dollar";
    case "USD":
      return "US Dollar";
    default:
      return currency;
  }
}

/**
 * Returns the bg color class for a currency progress bar fill.
 */
function getCurrencyBarColor(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "bg-positive";
    case "NZD":
      return "bg-blue-400";
    case "USD":
      return "bg-warning";
    default:
      return "bg-muted";
  }
}

/**
 * Returns the bg color class for a currency icon badge (20% opacity variant).
 */
function getCurrencyBadgeColor(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "bg-positive/20";
    case "NZD":
      return "bg-blue-400/20";
    case "USD":
      return "bg-warning/20";
    default:
      return "bg-muted/20";
  }
}

/**
 * Returns the flag emoji for a currency.
 */
function getCurrencyFlag(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "🇦🇺";
    case "NZD":
      return "🇳🇿";
    case "USD":
      return "🇺🇸";
    default:
      return "🏳️";
  }
}

/**
 * Loading skeleton for currency exposure.
 */
function ExposureSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="h-2 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Animated percentage label that uses useSpring for smooth transitions.
 */
function AnimatedPercentage({
  value,
  reducedMotion,
}: {
  value: number;
  reducedMotion: boolean | null;
}) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!displayRef.current) return;

    if (reducedMotion || isInitialMount.current) {
      displayRef.current.textContent = formatPercentage(value);
      isInitialMount.current = false;
      prevValueRef.current = value;
      return;
    }

    // Animate from previous value to new value
    const from = prevValueRef.current;
    const to = value;
    const duration = 400;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      if (displayRef.current) {
        displayRef.current.textContent = formatPercentage(current);
      }
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
    prevValueRef.current = value;
  }, [value, reducedMotion]);

  return (
    <span
      ref={displayRef}
      className="tabular-nums"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatPercentage(value)}
    </span>
  );
}

interface ExposureItemProps {
  currency: Currency;
  value: number;
  valueNative: number;
  percentage: number;
  count: number;
  displayCurrency: Currency;
  reducedMotion: boolean | null;
  index: number;
}

/**
 * Individual currency exposure row with animated progress bar.
 */
function ExposureItem({
  currency,
  value,
  percentage,
  count,
  displayCurrency,
  reducedMotion,
  index,
}: ExposureItemProps) {
  return (
    <motion.div
      className="space-y-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-150 hover:bg-accent/5"
      variants={reducedMotion ? undefined : staggerItem}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getCurrencyBadgeColor(currency)}`}>
            <span className="text-lg" role="img" aria-label={`${currency} flag`}>
              {getCurrencyFlag(currency)}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">
              {currency}
            </span>
            <span className="text-body-sm text-foreground font-medium ml-2">
              {getCurrencyDisplayName(currency)}
            </span>
            <span className="text-body-sm text-muted-foreground ml-2">
              ({count} holding{count !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-foreground">
            <NumberTicker value={value} currency={displayCurrency} compact />
          </div>
          <div className="text-body-sm text-muted-foreground">
            <AnimatedPercentage value={percentage} reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>
      {/* Animated progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getCurrencyBarColor(currency)} rounded-full`}
          initial={reducedMotion ? { width: `${Math.min(percentage, 100)}%` } : { width: "0%" }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.4, ease: "easeOut", delay: index * 0.05 }
          }
        />
      </div>
    </motion.div>
  );
}

/**
 * Stagger container variant with 50ms delay per row.
 */
const exposureStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Currency Exposure Component
 *
 * Displays a breakdown of assets by currency (AUD, NZD, USD).
 * Each currency shows:
 * - Flag and currency code
 * - Full currency name
 * - Value in the user's display currency
 * - Percentage of total assets
 * - Visual progress bar for percentage
 *
 * Sorted by value descending. Debt is excluded from this breakdown.
 */
export function CurrencyExposure() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();
  const reducedMotion = useReducedMotion();

  const {
    data: exposureData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currency-exposure", displayCurrency],
    queryFn: () => fetchCurrencyExposure(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <ExposureSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load currency exposure</p>
      </div>
    );
  }

  // No data available
  if (!exposureData || !exposureData.exposure) {
    return <ExposureSkeleton />;
  }

  const { exposure } = exposureData;

  // Empty state
  if (exposure.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-label uppercase text-muted-foreground mb-4">
          Currency Exposure
        </h3>
        <p className="text-muted-foreground text-center py-8">
          No assets to display. Add holdings to see your currency exposure.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
      {...(reducedMotion ? {} : fadeIn)}
    >
      <h3 className="text-label uppercase text-muted-foreground mb-6">
        Currency Exposure
      </h3>
      <motion.div
        className="space-y-5"
        variants={reducedMotion ? undefined : exposureStaggerContainer}
        initial={reducedMotion ? undefined : "hidden"}
        animate={reducedMotion ? undefined : "visible"}
      >
        {exposure.map((item, index) => (
          <ExposureItem
            key={item.currency}
            currency={item.currency}
            value={item.value}
            valueNative={item.valueNative}
            percentage={item.percentage}
            count={item.count}
            displayCurrency={displayCurrency}
            reducedMotion={reducedMotion}
            index={index}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
