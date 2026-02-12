"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

async function fetchUncategorisedCount(): Promise<number> {
  const response = await fetch("/api/budget/transactions/uncategorised-count");
  if (!response.ok) return 0;
  const data = await response.json();
  return data.count;
}

/**
 * Badge that displays the count of uncategorised transactions.
 * Renders nothing when count is 0.
 */
export function UncategorisedBadge() {
  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.budget.transactions.uncategorisedCount,
    queryFn: fetchUncategorisedCount,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (count === 0) return null;

  return (
    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-warning/20 px-1.5 py-0.5 text-xs font-medium text-warning min-w-[20px]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
