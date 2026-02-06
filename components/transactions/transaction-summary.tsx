"use client";

import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import type { Currency } from "@/lib/utils/currency";

interface SummaryCardData {
  label: string;
  amount: number;
  count: number;
  colorClass: string;
}

interface TransactionSummaryProps {
  totalBuys: number;
  totalSells: number;
  totalDividends: number;
  netCashFlow: number;
  buyCount: number;
  sellCount: number;
  dividendCount: number;
  totalCount: number;
  currency: Currency;
  isLoading?: boolean;
}

export function TransactionSummary({
  totalBuys,
  totalSells,
  totalDividends,
  netCashFlow,
  buyCount,
  sellCount,
  dividendCount,
  totalCount,
  currency,
  isLoading,
}: TransactionSummaryProps) {
  const prefersReducedMotion = useReducedMotion();

  const cards: SummaryCardData[] = [
    {
      label: "Total Bought",
      amount: totalBuys,
      count: buyCount,
      colorClass: "text-positive",
    },
    {
      label: "Total Sold",
      amount: totalSells,
      count: sellCount,
      colorClass: "text-destructive",
    },
    {
      label: "Dividends Received",
      amount: totalDividends,
      count: dividendCount,
      colorClass: "text-accent",
    },
    {
      label: "Net Cash Flow",
      amount: netCashFlow,
      count: totalCount,
      colorClass: netCashFlow >= 0 ? "text-positive" : "text-destructive",
    },
  ];

  const containerVariants = prefersReducedMotion ? undefined : staggerContainer;
  const itemVariants = prefersReducedMotion ? undefined : staggerItem;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      variants={containerVariants}
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={itemVariants}
          className="rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <span className="text-xs text-muted-foreground">
              {card.count} {card.count === 1 ? "txn" : "txns"}
            </span>
          </div>
          <div className={`text-lg font-semibold font-mono ${card.colorClass}`}>
            <CurrencyDisplay
              amount={card.amount}
              currency={currency}
              isLoading={isLoading}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
