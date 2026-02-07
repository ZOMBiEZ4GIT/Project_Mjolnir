"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRovingTabIndex } from "@/hooks/use-roving-tabindex";

/**
 * Time range options for chart filtering.
 */
export type TimeRange = "3m" | "6m" | "1y" | "all";

export const TIME_RANGE_OPTIONS: {
  value: TimeRange;
  label: string;
  months: number;
}[] = [
  { value: "3m", label: "3M", months: 3 },
  { value: "6m", label: "6M", months: 6 },
  { value: "1y", label: "1Y", months: 12 },
  { value: "all", label: "All", months: 60 },
];

const RANGE_VALUES = TIME_RANGE_OPTIONS.map((o) => o.value);

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

/**
 * Animated time range selector with Framer Motion sliding indicator.
 * Options: 3M, 6M, 1Y, All
 */
export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const reducedMotion = useReducedMotion();
  const { containerRef, handleKeyDown, getTabIndex } = useRovingTabIndex(
    RANGE_VALUES,
    value,
    onChange
  );

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 bg-muted/50 rounded-lg p-1"
      role="tablist"
      aria-label="Select time range"
      onKeyDown={handleKeyDown}
    >
      {TIME_RANGE_OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            tabIndex={getTabIndex(option.value)}
            onClick={() => onChange(option.value)}
            className={`relative px-3 py-1 min-h-[44px] sm:min-h-0 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="time-range-indicator"
                className="absolute inset-0 rounded-md bg-accent/20"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.2, ease: "easeInOut" }
                }
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
