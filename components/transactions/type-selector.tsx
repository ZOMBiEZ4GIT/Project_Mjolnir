"use client";

import { motion } from "framer-motion";
import { useRovingTabIndex } from "@/hooks/use-roving-tabindex";

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "SPLIT";

const TYPES: { value: TransactionType; label: string }[] = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "SPLIT", label: "Split" },
];

const TYPE_VALUES = TYPES.map((t) => t.value);

/** Colour classes per transaction type */
const TYPE_COLOURS: Record<
  TransactionType,
  { active: string; indicator: string }
> = {
  BUY: {
    active: "text-positive",
    indicator: "bg-positive/20",
  },
  SELL: {
    active: "text-destructive",
    indicator: "bg-destructive/20",
  },
  DIVIDEND: {
    active: "text-accent",
    indicator: "bg-accent/20",
  },
  SPLIT: {
    active: "text-blue-400",
    indicator: "bg-blue-500/20",
  },
};

interface TypeSelectorProps {
  value: TransactionType | "";
  onChange: (value: TransactionType) => void;
  disabled?: boolean;
}

export function TypeSelector({ value, onChange, disabled }: TypeSelectorProps) {
  const activeValue = (value || "BUY") as TransactionType;
  const { containerRef, handleKeyDown, getTabIndex } = useRovingTabIndex(
    TYPE_VALUES,
    activeValue,
    onChange
  );

  return (
    <div
      ref={containerRef}
      className="flex gap-1 rounded-lg bg-muted p-1"
      role="tablist"
      aria-label="Transaction type"
      onKeyDown={disabled ? undefined : handleKeyDown}
    >
      {TYPES.map((type) => {
        const isActive = type.value === value;
        const colours = TYPE_COLOURS[type.value];

        return (
          <button
            key={type.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={getTabIndex(type.value)}
            disabled={disabled && !isActive}
            onClick={() => !disabled && onChange(type.value)}
            className={`relative flex-1 rounded-md px-3 py-2 min-h-[44px] sm:min-h-0 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isActive
                ? colours.active
                : disabled
                  ? "text-muted-foreground/40 cursor-default"
                  : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="active-transaction-type"
                className={`absolute inset-0 rounded-md ${colours.indicator}`}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
            )}
            <span className="relative z-10">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
