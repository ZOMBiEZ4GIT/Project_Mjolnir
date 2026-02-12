"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Period {
  id: string;
  startDate: string;
  endDate: string;
}

interface PeriodSelectorProps {
  currentPeriodId: string;
  onPeriodChange: (periodId: string) => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function PeriodSelector({
  currentPeriodId,
  onPeriodChange,
}: PeriodSelectorProps) {
  const { data: periods } = useQuery<Period[]>({
    queryKey: queryKeys.budget.periods.all,
    queryFn: async () => {
      const res = await fetch("/api/budget/periods");
      if (!res.ok) throw new Error("Failed to fetch periods");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!periods || periods.length === 0) return null;

  // Periods come sorted by startDate desc — reverse for chronological navigation
  const sorted = [...periods].sort(
    (a, b) => a.startDate.localeCompare(b.startDate)
  );

  const currentIndex = sorted.findIndex((p) => p.id === currentPeriodId);
  const activePeriod = currentIndex >= 0 ? sorted[currentIndex] : sorted[sorted.length - 1];
  const activeIndex = currentIndex >= 0 ? currentIndex : sorted.length - 1;

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < sorted.length - 1;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => hasPrev && onPeriodChange(sorted[activeIndex - 1].id)}
        disabled={!hasPrev}
        className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous period"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm text-foreground font-medium text-center">
        {formatDateRange(activePeriod.startDate, activePeriod.endDate)}
      </span>
      <button
        onClick={() => hasNext && onPeriodChange(sorted[activeIndex + 1].id)}
        disabled={!hasNext}
        className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next period"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
