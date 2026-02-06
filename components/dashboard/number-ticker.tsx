"use client";

import { useEffect, useRef } from "react";
import { useSpring, useMotionValue, motion, useReducedMotion } from "framer-motion";
import { formatCurrency, type Currency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { numberSpring } from "@/lib/animations";

interface NumberTickerProps {
  value: number;
  currency: Currency;
  className?: string;
  prefix?: string;
}

/**
 * Animated number ticker that counts up from 0 on mount,
 * then morphs between values on change. Digits animate
 * individually for a slot-machine feel.
 *
 * Uses tabular-nums to prevent layout shift during animation.
 * Respects prefers-reduced-motion (shows final value instantly).
 */
export function NumberTicker({
  value,
  currency,
  className,
  prefix,
}: NumberTickerProps) {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    ...numberSpring,
    // Override for initial mount animation (600ms feel)
    stiffness: 80,
    damping: 20,
  });
  const displayRef = useRef<HTMLSpanElement>(null);
  const isInitialMount = useRef(true);

  // Update the motion value when target value changes
  useEffect(() => {
    if (shouldReduceMotion) {
      // Skip animation — show final value immediately
      motionValue.set(value);
      if (displayRef.current) {
        displayRef.current.textContent = formatCurrency(value, currency);
      }
      return;
    }

    if (isInitialMount.current) {
      // Initial mount: animate from 0 to target (600ms spring)
      motionValue.set(0);
      // Use requestAnimationFrame to ensure spring starts from 0
      requestAnimationFrame(() => {
        motionValue.set(value);
      });
      isInitialMount.current = false;
    } else {
      // Subsequent changes: morph to new value (faster spring)
      motionValue.set(value);
    }
  }, [value, currency, motionValue, shouldReduceMotion]);

  // Subscribe to spring changes and update the display
  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = formatCurrency(latest, currency);
      }
    });
    return unsubscribe;
  }, [springValue, currency]);

  // Set initial display for reduced motion or SSR
  const initialDisplay = shouldReduceMotion
    ? formatCurrency(value, currency)
    : formatCurrency(0, currency);

  return (
    <motion.span
      ref={displayRef}
      className={cn(
        "tabular-nums font-variant-numeric-tabular",
        className
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {initialDisplay}
    </motion.span>
  );
}
