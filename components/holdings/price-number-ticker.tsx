"use client";

import { useEffect, useRef } from "react";
import { useSpring, useMotionValue, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PriceNumberTickerProps {
  /** Numeric price value to animate */
  value: number;
  /** Static prefix displayed before the animated digits (e.g. "A$") */
  prefix?: string;
  /** Number of decimal places (default 2) */
  decimals?: number;
  className?: string;
}

/**
 * Lightweight number ticker for price cells.
 * Animates only the numeric digits — the prefix remains static.
 * Initial mount: counts from 0 (600ms). Updates: morphs to new value (400ms).
 * Uses will-change: transform for table row performance.
 */
export function PriceNumberTicker({
  value,
  prefix,
  decimals = 2,
  className,
}: PriceNumberTickerProps) {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
  });
  const displayRef = useRef<HTMLSpanElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      if (displayRef.current) {
        displayRef.current.textContent = formatNumber(value, decimals);
      }
      return;
    }

    if (isInitialMount.current) {
      motionValue.set(0);
      requestAnimationFrame(() => {
        motionValue.set(value);
      });
      isInitialMount.current = false;
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, shouldReduceMotion, decimals]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = formatNumber(latest, decimals);
      }
    });
    return unsubscribe;
  }, [springValue, decimals]);

  const initialDisplay = shouldReduceMotion
    ? formatNumber(value, decimals)
    : formatNumber(0, decimals);

  return (
    <span
      className={cn("tabular-nums", className)}
      style={{ fontVariantNumeric: "tabular-nums", willChange: "transform" }}
    >
      {prefix && <span>{prefix}</span>}
      <motion.span ref={displayRef}>
        {initialDisplay}
      </motion.span>
    </span>
  );
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
