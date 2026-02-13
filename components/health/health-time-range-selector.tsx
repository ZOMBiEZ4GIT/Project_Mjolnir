"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HEALTH_TIME_RANGES } from "@/lib/health/constants";
import { useRovingTabIndex } from "@/hooks/use-roving-tabindex";

const RANGE_VALUES = HEALTH_TIME_RANGES.map((r) => r.value);

interface HealthTimeRangeSelectorProps {
  value: string;
  onChange: (range: string) => void;
}

/**
 * Time range selector for health charts.
 * Options: 30D, 90D, 6M, 1Y, All — with Framer Motion sliding indicator.
 */
export function HealthTimeRangeSelector({
  value,
  onChange,
}: HealthTimeRangeSelectorProps) {
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
      {HEALTH_TIME_RANGES.map((option) => {
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
                layoutId="health-time-range-indicator"
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
