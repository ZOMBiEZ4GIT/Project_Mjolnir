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
  compact?: boolean;
}

/**
 * Animated number ticker that counts up from 0 on mount,
 * then morphs between values on change. Digits animate
 * individually for a slot-machine feel.
 *
 * On subsequent value changes, briefly flashes the text colour
 * green (increase) or red (decrease) before settling back.
 *
 * Uses tabular-nums to prevent layout shift during animation.
 * Respects prefers-reduced-motion (shows final value instantly).
 */
export function NumberTicker({
  value,
  currency,
  className,
  prefix,
  compact,
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
  const prevValueRef = useRef(value);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Update the motion value when target value changes
  useEffect(() => {
    if (shouldReduceMotion) {
      // Skip animation — show final value immediately
      motionValue.set(value);
      if (displayRef.current) {
        displayRef.current.textContent = formatCurrency(value, currency, { compact });
      }
      prevValueRef.current = value;
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
      // Subsequent changes: morph to new value + flash colour
      motionValue.set(value);

      if (displayRef.current && value !== prevValueRef.current) {
        // Flash positive (green) or negative (red)
        const flashColour =
          value > prevValueRef.current
            ? "hsl(142 71% 45%)"  // positive
            : "hsl(0 84% 63%)";  // negative
        displayRef.current.style.color = flashColour;
        displayRef.current.style.transition = "color 0s";

        // Clear any pending timer
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

        // Fade back to inherited colour after 400ms
        flashTimerRef.current = setTimeout(() => {
          if (displayRef.current) {
            displayRef.current.style.transition = "color 0.4s ease";
            displayRef.current.style.color = "";
          }
        }, 400);
      }
    }

    prevValueRef.current = value;
  }, [value, currency, motionValue, shouldReduceMotion, compact]);

  // Cleanup flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Subscribe to spring changes and update the display
  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = formatCurrency(latest, currency, { compact });
      }
    });
    return unsubscribe;
  }, [springValue, currency, compact]);

  // Set initial display for reduced motion or SSR
  const initialDisplay = shouldReduceMotion
    ? formatCurrency(value, currency, { compact })
    : formatCurrency(0, currency, { compact });

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
