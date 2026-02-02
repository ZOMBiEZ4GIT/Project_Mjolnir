"use client";

import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GroupByValue = "type" | "currency";

interface GroupBySelectorProps {
  value: GroupByValue;
  onChange: (value: GroupByValue) => void;
  className?: string;
}

const GROUP_BY_OPTIONS: { value: GroupByValue; label: string }[] = [
  { value: "type", label: "Group by Type" },
  { value: "currency", label: "Group by Currency" },
];

export function GroupBySelector({ value, onChange, className }: GroupBySelectorProps) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as GroupByValue)}>
        <SelectTrigger className="w-[170px] h-9 bg-gray-900 border-gray-700 text-gray-300">
          <Layers className="h-4 w-4 mr-2 text-gray-400" />
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {GROUP_BY_OPTIONS.map((option) => (
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
