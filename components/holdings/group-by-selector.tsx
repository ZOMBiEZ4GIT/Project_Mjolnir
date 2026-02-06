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
        <SelectTrigger className="w-[170px] h-9 bg-background border-border text-muted-foreground">
          <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border">
          {GROUP_BY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-muted-foreground focus:bg-card focus:text-foreground"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
