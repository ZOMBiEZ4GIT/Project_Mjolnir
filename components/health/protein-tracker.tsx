"use client";

import { cn } from "@/lib/utils";
import { DEFAULT_PROTEIN_TARGET_G } from "@/lib/health/constants";

interface ProteinDay {
  logDate: string;
  proteinG: number | null;
}

interface ProteinTrackerProps {
  data: ProteinDay[];
}

/**
 * 30-day protein target tracker — green/red dots for hit/miss days.
 */
export function ProteinTracker({ data }: ProteinTrackerProps) {
  // Take last 30 days
  const last30 = data.slice(-30);
  const hits = last30.filter(
    (d) => d.proteinG !== null && d.proteinG >= DEFAULT_PROTEIN_TARGET_G
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {hits}/{last30.length} days hit {DEFAULT_PROTEIN_TARGET_G}g target
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {last30.map((d) => {
          const hit =
            d.proteinG !== null && d.proteinG >= DEFAULT_PROTEIN_TARGET_G;
          const noData = d.proteinG === null;
          return (
            <div
              key={d.logDate}
              title={`${d.logDate}: ${d.proteinG !== null ? `${d.proteinG.toFixed(0)}g` : "No data"}`}
              className={cn(
                "h-4 w-4 rounded-sm",
                noData && "bg-muted/50",
                !noData && hit && "bg-green-500",
                !noData && !hit && "bg-red-500/70"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
