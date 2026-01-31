"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
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

interface FormData {
  date: string;
  quantity: string;
  unitPrice: string;
  fees: string;
  notes: string;
}

interface FormErrors {
  date?: string;
  quantity?: string;
  unit_price?: string;
  fees?: string;
  notes?: string;
  holding_id?: string;
  action?: string;
  currency?: string;
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

async function fetchHoldingQuantity(holdingId: string): Promise<number> {
  const response = await fetch(`/api/holdings/${holdingId}/quantity`);
  if (!response.ok) {
    throw new Error("Failed to fetch quantity");
  }
  const data = await response.json();
  return data.quantity;
}

interface CreateTransactionData {
  holding_id: string;
  date: string;
  action: TransactionAction;
  quantity: string;
  unit_price: string;
  fees: string;
  currency: string;
  notes?: string;
}

async function createTransaction(data: CreateTransactionData) {
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export function AddTransactionDialog({ children, defaultHoldingId }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(defaultHoldingId || "");
  const [selectedAction, setSelectedAction] = useState<TransactionAction | "">("");
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split("T")[0],
    quantity: "",
    unitPrice: "",
    fees: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  // Fetch tradeable holdings for the dropdown
  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings", "tradeable"],
    queryFn: fetchTradeableHoldings,
    enabled: open,
  });

  // Fetch current quantity for SELL validation
  const { data: currentQuantity, isLoading: quantityLoading } = useQuery({
    queryKey: ["holdings", selectedHoldingId, "quantity"],
    queryFn: () => fetchHoldingQuantity(selectedHoldingId),
    enabled: open && step === 2 && selectedAction === "SELL" && !!selectedHoldingId,
  });

  const selectedHolding = holdings?.find((h) => h.id === selectedHoldingId);

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings", selectedHoldingId, "quantity"] });
      toast.success("Transaction added successfully");
      handleClose();
    },
    onError: (error: { errors?: FormErrors; error?: string }) => {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        toast.error(error.error || "Failed to add transaction");
      }
    },
  });

  // Calculate total for BUY/SELL
  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    const fees = parseFloat(formData.fees) || 0;

    if (qty <= 0 || price <= 0) return null;

    const baseAmount = qty * price;
    if (selectedAction === "BUY") {
      return baseAmount + fees;
    } else if (selectedAction === "SELL") {
      return baseAmount - fees;
    }
    return baseAmount;
  }, [formData.quantity, formData.unitPrice, formData.fees, selectedAction]);

  // Check if selling all shares
  const isSellingAll = useMemo(() => {
    if (selectedAction !== "SELL" || currentQuantity === undefined) return false;
    const sellQty = parseFloat(formData.quantity) || 0;
    return sellQty > 0 && Math.abs(sellQty - currentQuantity) < 0.00000001;
  }, [selectedAction, currentQuantity, formData.quantity]);

  // Check if exceeding holdings
  const exceedsHoldings = useMemo(() => {
    if (selectedAction !== "SELL" || currentQuantity === undefined) return false;
    const sellQty = parseFloat(formData.quantity) || 0;
    return sellQty > currentQuantity;
  }, [selectedAction, currentQuantity, formData.quantity]);

  const handleClose = () => {
    setOpen(false);
    // Reset state when closing
    setStep(1);
    setSelectedHoldingId(defaultHoldingId || "");
    setSelectedAction("");
    setFormData({
      date: new Date().toISOString().split("T")[0],
      quantity: "",
      unitPrice: "",
      fees: "",
      notes: "",
    });
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      setOpen(true);
    }
  };

  const handleContinue = () => {
    if (selectedHoldingId && selectedAction) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
    setFormData({
      date: new Date().toISOString().split("T")[0],
      quantity: "",
      unitPrice: "",
      fees: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    const newErrors: FormErrors = {};

    // Validate date
    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    // Validate quantity
    const qty = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }

    // Validate unit price
    const price = parseFloat(formData.unitPrice);
    if (!formData.unitPrice || isNaN(price) || price < 0) {
      newErrors.unit_price = "Unit price must be a non-negative number";
    }

    // Validate fees if provided
    if (formData.fees) {
      const feesNum = parseFloat(formData.fees);
      if (isNaN(feesNum) || feesNum < 0) {
        newErrors.fees = "Fees must be a non-negative number";
      }
    }

    // For SELL: check if exceeds holdings
    if (selectedAction === "SELL" && exceedsHoldings) {
      newErrors.quantity = "Sell quantity exceeds holdings";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit the transaction
    mutation.mutate({
      holding_id: selectedHoldingId,
      date: formData.date,
      action: selectedAction as TransactionAction,
      quantity: formData.quantity,
      unit_price: formData.unitPrice,
      fees: formData.fees || "0",
      currency: selectedHolding?.currency || "AUD",
      notes: formData.notes.trim() || undefined,
    });
  };

  const canContinue = selectedHoldingId && selectedAction;
  const isBuySell = selectedAction === "BUY" || selectedAction === "SELL";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? <Button>Add Transaction</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
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
              <Button onClick={handleContinue} disabled={!canContinue}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : isBuySell ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedAction === "BUY" ? "Buy" : "Sell"} {selectedHolding?.symbol || selectedHolding?.name}
              </DialogTitle>
              <DialogDescription>
                Enter the transaction details.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Currency display (read-only) */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Currency:</span>
                <span className="font-medium text-foreground">{selectedHolding?.currency}</span>
              </div>

              {/* Current quantity for SELL */}
              {selectedAction === "SELL" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Current holdings:</span>
                  {quantityLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    <span className="font-mono font-medium">
                      {currentQuantity?.toLocaleString(undefined, { maximumFractionDigits: 8 })} shares
                    </span>
                  )}
                </div>
              )}

              {/* Date field */}
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    if (errors.date) setErrors({ ...errors, date: undefined });
                  }}
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date}</p>
                )}
              </div>

              {/* Quantity field */}
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({ ...formData, quantity: e.target.value });
                    if (errors.quantity) setErrors({ ...errors, quantity: undefined });
                  }}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity}</p>
                )}
                {/* Warning when selling all shares */}
                {isSellingAll && !errors.quantity && (
                  <p className="text-sm text-yellow-500">
                    ⚠️ This will sell all your shares
                  </p>
                )}
                {/* Warning when exceeding holdings - not an error yet */}
                {exceedsHoldings && !errors.quantity && currentQuantity !== undefined && (
                  <p className="text-sm text-red-500">
                    Exceeds current holdings ({currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })})
                  </p>
                )}
              </div>

              {/* Unit Price field */}
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit Price ({selectedHolding?.currency})</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, unitPrice: e.target.value });
                    if (errors.unit_price) setErrors({ ...errors, unit_price: undefined });
                  }}
                />
                {errors.unit_price && (
                  <p className="text-sm text-red-500">{errors.unit_price}</p>
                )}
              </div>

              {/* Fees field */}
              <div className="grid gap-2">
                <Label htmlFor="fees">Fees ({selectedHolding?.currency})</Label>
                <Input
                  id="fees"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={formData.fees}
                  onChange={(e) => {
                    setFormData({ ...formData, fees: e.target.value });
                    if (errors.fees) setErrors({ ...errors, fees: undefined });
                  }}
                />
                {errors.fees && (
                  <p className="text-sm text-red-500">{errors.fees}</p>
                )}
              </div>

              {/* Notes field */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Calculated total */}
              {calculatedTotal !== null && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total {selectedAction === "BUY" ? "Cost" : "Proceeds"}
                    </span>
                    <span className="text-lg font-semibold font-mono">
                      {selectedHolding?.currency} {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.quantity} × {selectedHolding?.currency} {parseFloat(formData.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {parseFloat(formData.fees) > 0 && (
                      <> {selectedAction === "BUY" ? "+" : "−"} {selectedHolding?.currency} {parseFloat(formData.fees).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fees</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending || (selectedAction === "SELL" && quantityLoading)}
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Placeholder for DIVIDEND and SPLIT forms (US-013)
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedAction === "DIVIDEND" ? "Dividend" : "Stock Split"} - {selectedHolding?.symbol || selectedHolding?.name}
              </DialogTitle>
              <DialogDescription>
                This form will be implemented in a future update.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center text-muted-foreground">
              <p>DIVIDEND and SPLIT forms coming soon...</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button disabled>
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
