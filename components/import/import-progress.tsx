"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImportProgressProps {
  /** Whether the import is currently in progress */
  isLoading: boolean;
  /** Optional total number of rows to process */
  rowCount?: number;
  /** Optional current row being processed */
  currentRow?: number;
  /** Optional progress percentage (0-100). If not provided, derived from currentRow/rowCount or indeterminate */
  progress?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ImportProgress({
  isLoading,
  rowCount,
  currentRow,
  progress,
  className,
}: ImportProgressProps) {
  const [animatedProgress, setAnimatedProgress] = React.useState(0);
  const reducedMotion = useReducedMotion();

  // Determine the actual progress percentage
  const targetProgress = React.useMemo(() => {
    if (progress !== undefined) return progress;
    if (currentRow !== undefined && rowCount !== undefined && rowCount > 0) {
      return Math.round((currentRow / rowCount) * 100);
    }
    return undefined;
  }, [progress, currentRow, rowCount]);

  const isDeterminate = targetProgress !== undefined;

  // Animate progress for determinate mode
  React.useEffect(() => {
    if (!isLoading) {
      setAnimatedProgress(0);
      return;
    }
    if (isDeterminate) {
      setAnimatedProgress(targetProgress);
      return;
    }
    // Indeterminate: animate from 0 to ~90%
    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) / 10);
        return Math.min(90, prev + increment);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isLoading, isDeterminate, targetProgress]);

  if (!isLoading) {
    return null;
  }

  const statusText = (() => {
    if (isDeterminate && currentRow !== undefined && rowCount !== undefined) {
      return `Processing row ${currentRow} of ${rowCount}...`;
    }
    if (rowCount !== undefined) {
      return `Processing ${rowCount} row${rowCount === 1 ? "" : "s"}...`;
    }
    return "Processing...";
  })();

  return (
    <motion.div
      className={cn("space-y-3", className)}
      initial={reducedMotion ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">{statusText}</span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {isDeterminate ? (
          /* Determinate fill */
          <div
            className="h-full rounded-full bg-accent shadow-glow-sm"
            style={{
              width: `${animatedProgress}%`,
              transition: "width 300ms ease-out",
            }}
          />
        ) : (
          /* Indeterminate shimmer */
          <div className="absolute inset-0">
            <div
              className="h-full rounded-full bg-accent shadow-glow-sm"
              style={{
                width: `${animatedProgress}%`,
                transition: "width 300ms ease-out",
              }}
            />
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.3) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
