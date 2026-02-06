"use client";

import { Calendar, CalendarClock } from "lucide-react";

interface MonthSelectorProps {
  currentMonth: string;
  previousMonth: string;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function MonthSelector({
  currentMonth,
  previousMonth,
  selectedMonth,
  onSelectMonth,
}: MonthSelectorProps) {
  const options = [
    {
      value: currentMonth,
      label: formatMonthYear(currentMonth),
      sublabel: "Current month",
      icon: Calendar,
    },
    {
      value: previousMonth,
      label: formatMonthYear(previousMonth),
      sublabel: "Previous month",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Select month">
        {options.map((option) => {
          const isSelected = selectedMonth === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectMonth(option.value)}
              className={`
                flex items-center gap-3 rounded-lg border p-4 text-left
                transition-colors duration-150
                ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card/50 hover:border-muted-foreground/30 hover:bg-card"
                }
              `}
            >
              <div
                className={`
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                  ${isSelected ? "bg-accent/20" : "bg-muted"}
                `}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isSelected ? "text-accent-foreground" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    isSelected ? "text-foreground" : "text-foreground"
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        You can log on the 5th for the previous month
      </p>
    </div>
  );
}
