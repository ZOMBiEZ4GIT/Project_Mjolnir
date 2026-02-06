"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import type { Currency } from "@/lib/utils/currency";

interface GroupHeaderProps {
  label: string;
  count: number;
  totalValue: number;
  portfolioPercent: number | null;
  displayCurrency: Currency;
  currencyLoading?: boolean;
  isDebt?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  /** ID of the controlled content region for aria-controls */
  contentId?: string;
}

export function GroupHeader({
  label,
  count,
  totalValue,
  portfolioPercent,
  displayCurrency,
  currencyLoading,
  isDebt = false,
  isExpanded,
  onToggle,
  contentId,
}: GroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full mb-3 group cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-expanded={isExpanded}
      aria-controls={contentId}
    >
      <div className="flex items-center gap-2">
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
        <h2 className="text-lg font-semibold text-foreground">
          {label}{" "}
          <span className="text-muted-foreground font-normal">({count})</span>
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {currencyLoading ? (
          <span className="inline-block w-20 h-5 bg-muted rounded animate-pulse" />
        ) : (
          <CurrencyDisplay
            amount={totalValue}
            currency={displayCurrency}
            className={`font-semibold ${isDebt ? "text-destructive" : "text-foreground"}`}
          />
        )}
        {portfolioPercent !== null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
            {portfolioPercent.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}
