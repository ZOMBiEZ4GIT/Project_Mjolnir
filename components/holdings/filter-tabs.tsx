"use client";

import { motion } from "framer-motion";
import type { Holding } from "@/lib/db/schema";

export type HoldingTypeFilter = "all" | Holding["type"];

const FILTER_TABS: { value: HoldingTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "super", label: "Super" },
  { value: "cash", label: "Cash" },
  { value: "debt", label: "Debt" },
];

interface FilterTabsProps {
  value: HoldingTypeFilter;
  onChange: (value: HoldingTypeFilter) => void;
}

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto scrollbar-hide"
      role="tablist"
      aria-label="Filter holdings by type"
    >
      {FILTER_TABS.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`relative whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="active-holding-filter"
                className="absolute inset-0 rounded-md bg-accent/20"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
