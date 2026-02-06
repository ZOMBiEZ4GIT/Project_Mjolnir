"use client";

import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CurrencyFilterValue = "all" | "AUD" | "NZD" | "USD";

interface CurrencyFilterProps {
  value: CurrencyFilterValue;
  onChange: (value: CurrencyFilterValue) => void;
  className?: string;
}

const CURRENCY_OPTIONS: { value: CurrencyFilterValue; label: string; flag?: string }[] = [
  { value: "all", label: "All Currencies" },
  { value: "AUD", label: "AUD", flag: "🇦🇺" },
  { value: "NZD", label: "NZD", flag: "🇳🇿" },
  { value: "USD", label: "USD", flag: "🇺🇸" },
];

export function CurrencyFilter({ value, onChange, className }: CurrencyFilterProps) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as CurrencyFilterValue)}>
        <SelectTrigger className="w-[180px] h-9 bg-card border border-border text-foreground">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Filter by currency" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {CURRENCY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-foreground focus:bg-accent/10 focus:text-foreground"
            >
              {option.flag ? `${option.flag} ${option.label}` : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
