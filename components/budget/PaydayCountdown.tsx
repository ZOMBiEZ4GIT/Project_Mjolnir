"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getDaysUntilPayday, findNextPayday } from "@/lib/budget/payday";
import { Calendar } from "lucide-react";

interface PaydayCountdownProps {
  daysElapsed: number;
  totalDays: number;
}

interface PaydayApiResponse {
  paydayDay: number;
  adjustForWeekends: boolean;
}

export function PaydayCountdown({
  daysElapsed,
  totalDays,
}: PaydayCountdownProps) {
  const { data: config } = useQuery<PaydayApiResponse>({
    queryKey: queryKeys.budget.payday,
    queryFn: async () => {
      const res = await fetch("/api/budget/payday");
      if (!res.ok) throw new Error("Failed to fetch payday config");
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!config) return null;

  const settings = {
    paydayDay: config.paydayDay,
    adjustForWeekends: config.adjustForWeekends,
  };
  const daysUntil = getDaysUntilPayday(settings);
  const nextPayday = findNextPayday(new Date(), settings);

  const countdownText =
    daysUntil === 0
      ? "Payday today!"
      : daysUntil === 1
        ? "Payday tomorrow!"
        : `${daysUntil} days until payday`;

  const paydayDateText = nextPayday.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Payday</span>
      </div>
      <p className="text-lg font-semibold text-foreground">{countdownText}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{paydayDateText}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Day {daysElapsed} of {totalDays}
      </p>
    </div>
  );
}
