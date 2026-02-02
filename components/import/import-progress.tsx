"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ImportProgressProps {
  /** Whether the import is currently in progress */
  isLoading: boolean;
  /** Optional number of rows being processed */
  rowCount?: number;
  /** Optional progress percentage (0-100). If not provided, shows indeterminate state */
  progress?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ImportProgress({
  isLoading,
  rowCount,
  progress,
  className,
}: ImportProgressProps) {
  const [animatedProgress, setAnimatedProgress] = React.useState(0);

  // Simulate progress when no actual progress is provided (indeterminate mode)
  React.useEffect(() => {
    if (!isLoading) {
      setAnimatedProgress(0);
      return;
    }

    if (progress !== undefined) {
      setAnimatedProgress(progress);
      return;
    }

    // Indeterminate mode: animate from 0 to ~90% over time
    // This gives a sense of progress even when we don't know the exact state
    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        // Slow down as we approach 90%
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) / 10);
        return Math.min(90, prev + increment);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading, progress]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {rowCount !== undefined
            ? `Processing ${rowCount} row${rowCount === 1 ? "" : "s"}...`
            : "Processing..."}
        </span>
      </div>
      <Progress value={animatedProgress} className="h-2" />
    </div>
  );
}
