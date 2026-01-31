"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Holding } from "@/lib/db/schema";

const TRANSACTION_ACTIONS = [
  { value: "BUY", label: "Buy", description: "Purchase shares/units" },
  { value: "SELL", label: "Sell", description: "Sell shares/units" },
  { value: "DIVIDEND", label: "Dividend", description: "Dividend payment received" },
  { value: "SPLIT", label: "Split", description: "Stock split adjustment" },
] as const;

export type TransactionAction = (typeof TRANSACTION_ACTIONS)[number]["value"];

interface AddTransactionDialogProps {
  children?: React.ReactNode;
  /** Pre-select a holding when opening the dialog */
  defaultHoldingId?: string;
}

async function fetchTradeableHoldings(): Promise<Holding[]> {
  const response = await fetch("/api/holdings?include_dormant=true");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  const holdings: Holding[] = await response.json();
  // Filter to tradeable types only (stock, etf, crypto)
  return holdings.filter((h) =>
    ["stock", "etf", "crypto"].includes(h.type)
  );
}

export function AddTransactionDialog({ children, defaultHoldingId }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(defaultHoldingId || "");
  const [selectedAction, setSelectedAction] = useState<TransactionAction | "">("");

  // Fetch tradeable holdings for the dropdown
  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings", "tradeable"],
    queryFn: fetchTradeableHoldings,
    enabled: open,
  });

  const selectedHolding = holdings?.find((h) => h.id === selectedHoldingId);

  const handleClose = () => {
    setOpen(false);
    // Reset state when closing
    setSelectedHoldingId(defaultHoldingId || "");
    setSelectedAction("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      setOpen(true);
    }
  };

  const canContinue = selectedHoldingId && selectedAction;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? <Button>Add Transaction</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Select a holding and transaction type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Holding selector */}
          <div className="grid gap-2">
            <Label htmlFor="holding">Holding</Label>
            <Select
              value={selectedHoldingId}
              onValueChange={setSelectedHoldingId}
              disabled={holdingsLoading}
            >
              <SelectTrigger id="holding">
                <SelectValue placeholder={holdingsLoading ? "Loading..." : "Select a holding"} />
              </SelectTrigger>
              <SelectContent>
                {holdings?.map((holding) => (
                  <SelectItem key={holding.id} value={holding.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{holding.symbol || holding.name}</span>
                      {holding.symbol && (
                        <span className="text-muted-foreground text-sm">
                          {holding.name}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {holdings?.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No tradeable holdings found. Add a stock, ETF, or crypto first.
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedHolding && (
              <p className="text-sm text-muted-foreground">
                {selectedHolding.type.toUpperCase()} · {selectedHolding.currency}
                {selectedHolding.exchange && ` · ${selectedHolding.exchange}`}
              </p>
            )}
          </div>

          {/* Action type selector */}
          <div className="grid gap-2">
            <Label>Transaction Type</Label>
            <RadioGroup
              value={selectedAction}
              onValueChange={(value) => setSelectedAction(value as TransactionAction)}
              className="grid grid-cols-2 gap-3"
            >
              {TRANSACTION_ACTIONS.map((action) => (
                <div key={action.value}>
                  <RadioGroupItem
                    value={action.value}
                    id={`action-${action.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`action-${action.value}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="text-sm font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={!canContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
