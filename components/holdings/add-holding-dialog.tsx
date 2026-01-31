"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const HOLDING_TYPES = [
  { value: "stock", label: "Stock", description: "Individual company shares" },
  { value: "etf", label: "ETF", description: "Exchange-traded funds" },
  { value: "crypto", label: "Crypto", description: "Cryptocurrency" },
  { value: "super", label: "Super", description: "Superannuation funds" },
  { value: "cash", label: "Cash", description: "Bank accounts and cash" },
  { value: "debt", label: "Debt", description: "Loans and liabilities" },
] as const;

export type HoldingType = (typeof HOLDING_TYPES)[number]["value"];

interface AddHoldingDialogProps {
  children?: React.ReactNode;
}

export function AddHoldingDialog({ children }: AddHoldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<HoldingType | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Reset state when closing
    if (!newOpen) {
      setSelectedType(null);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? <Button>Add Holding</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
          <DialogDescription>
            Select the type of asset you want to track.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedType ?? ""}
            onValueChange={(value) => setSelectedType(value as HoldingType)}
            className="grid grid-cols-2 gap-3"
          >
            {HOLDING_TYPES.map((type) => (
              <div key={type.value}>
                <RadioGroupItem
                  value={type.value}
                  id={`type-${type.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`type-${type.value}`}
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-sm font-medium">{type.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={!selectedType}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
