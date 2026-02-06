"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { type Currency } from "@/lib/utils/currency";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Currency options with display information.
 */
const CURRENCY_OPTIONS: Array<{
  value: Currency;
  label: string;
  symbol: string;
  flag: string;
}> = [
  { value: "AUD", label: "Australian Dollar", symbol: "$", flag: "🇦🇺" },
  { value: "NZD", label: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
  { value: "USD", label: "US Dollar", symbol: "US$", flag: "🇺🇸" },
];

/**
 * Props for the CurrencySelector component.
 */
export interface CurrencySelectorProps {
  /**
   * Additional CSS classes.
   */
  className?: string;

  /**
   * Show loading skeleton while currency context is loading.
   * Default: true
   */
  showLoadingState?: boolean;

  /**
   * Compact mode - shows only the currency code instead of full label.
   * Default: true
   */
  compact?: boolean;
}

/**
 * Loading skeleton for currency selector.
 */
function CurrencySelectorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 w-20 items-center justify-center rounded-md bg-muted animate-pulse",
        className
      )}
      aria-label="Loading currency selector"
    />
  );
}

/**
 * CurrencySelector Component
 *
 * A dropdown selector for switching the user's display currency preference.
 * Uses the CurrencyProvider context for state management and API updates.
 *
 * Features:
 * - Shows current display currency
 * - Options: AUD, NZD, USD with symbols
 * - Optimistic updates (UI updates immediately, persists async)
 * - Loading skeleton while currency context loads
 *
 * @example
 * // Basic usage
 * <CurrencySelector />
 *
 * // Compact mode (default)
 * <CurrencySelector compact />
 *
 * // Full width
 * <CurrencySelector className="w-full" compact={false} />
 */
export function CurrencySelector({
  className,
  showLoadingState = true,
  compact = true,
}: CurrencySelectorProps) {
  const { displayCurrency, setDisplayCurrency, isLoading } = useCurrency();

  // Show loading skeleton while context is loading
  if (showLoadingState && isLoading) {
    return <CurrencySelectorSkeleton className={className} />;
  }

  const handleCurrencyChange = (value: string) => {
    setDisplayCurrency(value as Currency);
  };

  // Get the current currency option for display
  const currentOption = CURRENCY_OPTIONS.find(
    (opt) => opt.value === displayCurrency
  );

  return (
    <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
      <SelectTrigger
        className={cn(
          "gap-1.5 bg-card border-border text-foreground",
          compact ? "w-auto min-w-[80px]" : "w-[220px]",
          className
        )}
        aria-label="Select display currency"
      >
        <SelectValue>
          {compact
            ? currentOption?.value
            : `${currentOption?.flag} ${currentOption?.value}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {CURRENCY_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="focus:bg-accent/10 focus:text-foreground"
          >
            <span className="flex items-center gap-2">
              <span>{option.flag}</span>
              <span className="font-medium">{option.value}</span>
              {!compact && (
                <span className="text-muted-foreground text-sm">
                  — {option.label}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
