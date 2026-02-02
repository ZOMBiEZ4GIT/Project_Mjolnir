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

const CURRENCY_OPTIONS: { value: CurrencyFilterValue; label: string }[] = [
  { value: "all", label: "All Currencies" },
  { value: "AUD", label: "AUD ($)" },
  { value: "NZD", label: "NZD (NZ$)" },
  { value: "USD", label: "USD (US$)" },
];

export function CurrencyFilter({ value, onChange, className }: CurrencyFilterProps) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as CurrencyFilterValue)}>
        <SelectTrigger className="w-[160px] h-9 bg-gray-900 border-gray-700 text-gray-300">
          <Filter className="h-4 w-4 mr-2 text-gray-400" />
          <SelectValue placeholder="Filter by currency" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {CURRENCY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-gray-300 focus:bg-gray-800 focus:text-white"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
