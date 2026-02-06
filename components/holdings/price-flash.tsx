"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

interface PriceFlashProps {
  value: number;
  children: ReactNode;
  className?: string;
}

/**
 * PriceFlash — wraps children with a brief colour flash when value changes.
 * Green flash on increase, red flash on decrease. Respects prefers-reduced-motion.
 */
export function PriceFlash({ value, children, className }: PriceFlashProps) {
  const prevValueRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Skip flash on initial mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    const prevValue = prevValueRef.current;
    prevValueRef.current = value;

    // No flash if value hasn't changed or if reduced motion is preferred
    if (prevValue === null || prevValue === value || shouldReduceMotion) {
      return;
    }

    // Determine flash direction
    const direction = value > prevValue ? "increase" : "decrease";
    setFlashClass(
      direction === "increase"
        ? "bg-positive/20"
        : "bg-destructive/20"
    );

    // Clear flash after animation duration
    const timer = setTimeout(() => {
      setFlashClass(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [value, shouldReduceMotion]);

  return (
    <span
      className={`inline-block rounded-sm transition-colors duration-[400ms] ${
        flashClass ?? "bg-transparent"
      } ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
