"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Currency } from "@/lib/utils/currency";
import { useCurrency } from "@/components/providers/currency-provider";
import { useRovingTabIndex } from "@/hooks/use-roving-tabindex";

const CURRENCY_OPTIONS: Array<{
  value: Currency;
  flag: string;
  label: string;
}> = [
  { value: "AUD", flag: "\u{1F1E6}\u{1F1FA}", label: "Australian Dollar" },
  { value: "NZD", flag: "\u{1F1F3}\u{1F1FF}", label: "New Zealand Dollar" },
  { value: "USD", flag: "\u{1F1FA}\u{1F1F8}", label: "US Dollar" },
];

interface CurrencyToggleProps {
  className?: string;
}

function CurrencyToggleSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 w-[220px] items-center rounded-full bg-muted animate-pulse",
        className
      )}
      aria-label="Loading currency toggle"
    />
  );
}

const CURRENCY_VALUES = CURRENCY_OPTIONS.map((o) => o.value);

export function CurrencyToggle({ className }: CurrencyToggleProps) {
  const { displayCurrency, setDisplayCurrency, isLoading } = useCurrency();
  const prefersReducedMotion = useReducedMotion();
  const { containerRef, handleKeyDown, getTabIndex } = useRovingTabIndex(
    CURRENCY_VALUES,
    displayCurrency,
    setDisplayCurrency
  );

  if (isLoading) {
    return <CurrencyToggleSkeleton className={className} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "inline-flex items-center rounded-full bg-muted p-1 gap-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Display currency"
      onKeyDown={handleKeyDown}
    >
      {CURRENCY_OPTIONS.map((option) => {
        const isActive = displayCurrency === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            aria-label={`${option.label} (${option.value})`}
            tabIndex={getTabIndex(option.value)}
            onClick={() => setDisplayCurrency(option.value)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[44px] sm:min-h-0 text-body-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="currency-indicator"
                className="absolute inset-0 rounded-full bg-accent/20"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 25 }
                }
              />
            )}
            <span className="relative z-10">{option.flag}</span>
            <span className="relative z-10">{option.value}</span>
          </button>
        );
      })}
    </div>
  );
}
