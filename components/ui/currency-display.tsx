"use client";

import * as React from "react";
import {
  useSpring,
  useMotionValue,
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";

import { cn } from "@/lib/utils";
import {
  formatCurrency,
  CURRENCY_SYMBOLS,
  type Currency,
} from "@/lib/utils/currency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { numberSpring } from "@/lib/animations";

/**
 * Props for the CurrencyDisplay component.
 */
export interface CurrencyDisplayProps {
  /**
   * The amount to display.
   */
  amount: number;

  /**
   * The currency of the amount.
   */
  currency: Currency;

  /**
   * Whether to show native currency information when currencies differ.
   * Default: false
   */
  showNative?: boolean;

  /**
   * The native (original) currency of the holding.
   * Used when showNative is true and currencies differ.
   */
  nativeCurrency?: Currency;

  /**
   * The native (unconverted) amount in the original currency.
   * Used when showNative is true and currencies differ.
   */
  nativeAmount?: number;

  /**
   * Whether the data is loading.
   * Default: false
   */
  isLoading?: boolean;

  /**
   * Use compact notation for large numbers (e.g., "$1.2M").
   * Default: false
   */
  compact?: boolean;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Loading skeleton for currency display.
 */
function CurrencyDisplaySkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-20 bg-muted rounded animate-pulse",
        className
      )}
      aria-label="Loading currency value"
    />
  );
}

/**
 * Formats a number (without currency symbol) for display.
 */
function formatNumber(amount: number, compact: boolean): string {
  return formatCurrency(amount, "AUD", { compact, showSymbol: false });
}

/**
 * CurrencyDisplay Component
 *
 * A reusable component for displaying currency values with:
 * - Animated value transitions using useSpring on currency change
 * - Currency symbol crossfade with AnimatePresence
 * - Brief flash highlight on value changes
 * - Hover/tooltip showing the currency code
 * - Optional native currency indicator when currencies differ
 * - Loading skeleton state
 * - Respects prefers-reduced-motion
 */
export function CurrencyDisplay({
  amount,
  currency,
  showNative = false,
  nativeCurrency,
  nativeAmount,
  isLoading = false,
  compact = false,
  className,
}: CurrencyDisplayProps) {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(amount);
  const springValue = useSpring(motionValue, numberSpring);
  const displayRef = React.useRef<HTMLSpanElement>(null);
  const isInitialMount = React.useRef(true);
  const prevAmountRef = React.useRef(amount);
  const prevCurrencyRef = React.useRef(currency);
  const [showFlash, setShowFlash] = React.useState(false);

  // Update spring value when amount changes
  React.useEffect(() => {
    if (isLoading) return;

    if (isInitialMount.current) {
      // Initial render: show value instantly (no animation from 0)
      motionValue.jump(amount);
      if (displayRef.current) {
        displayRef.current.textContent = formatNumber(amount, compact);
      }
      isInitialMount.current = false;
      prevAmountRef.current = amount;
      prevCurrencyRef.current = currency;
      return;
    }

    const amountChanged = prevAmountRef.current !== amount;
    const currencyChanged = prevCurrencyRef.current !== currency;

    if (amountChanged || currencyChanged) {
      if (shouldReduceMotion) {
        // Reduced motion: update instantly
        motionValue.jump(amount);
        if (displayRef.current) {
          displayRef.current.textContent = formatNumber(amount, compact);
        }
      } else {
        // Animate to new value
        motionValue.set(amount);

        // Trigger flash highlight
        setShowFlash(true);
      }

      prevAmountRef.current = amount;
      prevCurrencyRef.current = currency;
    }
  }, [amount, currency, motionValue, shouldReduceMotion, compact, isLoading]);

  // Subscribe to spring changes and update the display
  React.useEffect(() => {
    if (isLoading) return;
    const unsubscribe = springValue.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = formatNumber(latest, compact);
      }
    });
    return unsubscribe;
  }, [springValue, compact, isLoading]);

  // Auto-clear flash after 400ms
  React.useEffect(() => {
    if (!showFlash) return;
    const timer = setTimeout(() => setShowFlash(false), 400);
    return () => clearTimeout(timer);
  }, [showFlash]);

  // Show loading skeleton
  if (isLoading) {
    return <CurrencyDisplaySkeleton className={className} />;
  }

  // Check if native currency is different from display currency
  const hasDifferentNativeCurrency =
    showNative &&
    nativeCurrency &&
    nativeAmount !== undefined &&
    nativeCurrency !== currency;

  // Compute effective exchange rate: 1 native = X display
  const effectiveRate =
    hasDifferentNativeCurrency && nativeAmount !== 0
      ? Math.abs(amount / nativeAmount!)
      : null;

  const isNegative = amount < 0;
  const symbol = CURRENCY_SYMBOLS[currency];

  const valueSpan = (
    <span
      className={cn(
        "cursor-default inline-flex items-center gap-1 rounded-sm transition-colors",
        showFlash && !shouldReduceMotion && "bg-accent/15",
        className
      )}
      style={{
        fontVariantNumeric: "tabular-nums",
        transitionDuration: showFlash ? "0ms" : "400ms",
      }}
    >
      <span className="inline-flex items-baseline">
        {/* Currency symbol with crossfade */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={symbol}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
          >
            {isNegative ? "-" : ""}
            {symbol}
          </motion.span>
        </AnimatePresence>
        {/* Animated number */}
        <span ref={displayRef}>
          {formatNumber(amount, compact)}
        </span>
      </span>
      {hasDifferentNativeCurrency && (
        <span
          className="text-body-sm text-muted-foreground font-normal"
          aria-label={`Native currency: ${nativeCurrency}`}
        >
          ({nativeCurrency})
        </span>
      )}
    </span>
  );

  // When currencies differ and showNative is on, show rich tooltip
  if (hasDifferentNativeCurrency) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{valueSpan}</TooltipTrigger>
          <TooltipContent className="bg-card border border-border rounded-lg p-2 shadow-lg">
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-xs">
                Converted from{" "}
                <span className="font-medium">
                  {formatCurrency(nativeAmount!, nativeCurrency!, {
                    showSymbol: true,
                  })}{" "}
                  {nativeCurrency}
                </span>
              </p>
              {effectiveRate !== null && (
                <p className="text-muted-foreground text-xs">
                  Rate: 1 {nativeCurrency} = {effectiveRate.toFixed(4)}{" "}
                  {currency}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // No conversion — render without tooltip
  return valueSpan;
}
