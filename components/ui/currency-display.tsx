"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  formatCurrency,
  type Currency,
  type FormatCurrencyOptions,
} from "@/lib/utils/currency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * CurrencyDisplay Component
 *
 * A reusable component for displaying currency values with:
 * - Hover/tooltip showing the currency code
 * - Optional native currency indicator when currencies differ
 * - Loading skeleton state
 *
 * @example
 * // Basic usage
 * <CurrencyDisplay amount={1234.56} currency="AUD" />
 *
 * // With native currency indicator
 * <CurrencyDisplay
 *   amount={1890.00} // converted to display currency
 *   currency="AUD"
 *   showNative={true}
 *   nativeCurrency="USD"
 *   nativeAmount={1234.56}
 * />
 *
 * // Loading state
 * <CurrencyDisplay amount={0} currency="AUD" isLoading />
 *
 * // Compact notation
 * <CurrencyDisplay amount={1234567} currency="AUD" compact />
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
  // Show loading skeleton
  if (isLoading) {
    return <CurrencyDisplaySkeleton className={className} />;
  }

  const formatOptions: FormatCurrencyOptions = {
    compact,
    showSymbol: true,
  };

  const formattedAmount = formatCurrency(amount, currency, formatOptions);

  // Check if native currency is different from display currency
  const hasDifferentNativeCurrency =
    showNative &&
    nativeCurrency &&
    nativeAmount !== undefined &&
    nativeCurrency !== currency;

  // Build tooltip content
  const tooltipContent = hasDifferentNativeCurrency
    ? `${formattedAmount} ${currency} (Native: ${formatCurrency(
        nativeAmount,
        nativeCurrency,
        { showSymbol: true }
      )} ${nativeCurrency})`
    : `${formattedAmount} ${currency}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-default inline-flex items-center gap-1",
              className
            )}
          >
            <span>{formattedAmount}</span>
            {hasDifferentNativeCurrency && (
              <span
                className="text-xs text-muted-foreground font-normal"
                aria-label={`Native currency: ${nativeCurrency}`}
              >
                ({nativeCurrency})
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
