"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TransactionWithHolding {
  id: string;
  holdingId: string;
  date: string;
  action: "BUY" | "SELL" | "DIVIDEND" | "SPLIT";
  quantity: string;
  unitPrice: string;
  fees: string;
  currency: "AUD" | "NZD" | "USD";
  notes: string | null;
  holding: {
    id: string;
    name: string;
    symbol: string | null;
    type: string;
    currency: string;
    exchange: string | null;
  };
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
}

interface EditTransactionDialogProps {
  transaction: TransactionWithHolding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchHoldingQuantity(holdingId: string): Promise<number> {
  const response = await fetch(`/api/holdings/${holdingId}/quantity`);
  if (!response.ok) {
    throw new Error("Failed to fetch quantity");
  }
  const data = await response.json();
  return data.quantity;
}

interface UpdateTransactionData {
  date?: string;
  quantity?: string;
  unit_price?: string;
  fees?: string;
  notes?: string;
}

async function updateTransaction(id: string, data: UpdateTransactionData) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    date: transaction.date,
    quantity: transaction.quantity,
    unitPrice: transaction.unitPrice,
    fees: transaction.fees,
    notes: transaction.notes || "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  // Reset form data when transaction changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        date: transaction.date,
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        fees: transaction.fees,
        notes: transaction.notes || "",
      });
      setErrors({});
    }
  }, [open, transaction]);

  // Fetch current quantity for SELL validation
  const { data: currentQuantity, isLoading: quantityLoading } = useQuery({
    queryKey: ["holdings", transaction.holdingId, "quantity"],
    queryFn: () => fetchHoldingQuantity(transaction.holdingId),
    enabled: open && transaction.action === "SELL",
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateTransactionData) =>
      updateTransaction(transaction.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["holdings", transaction.holdingId, "quantity"],
      });
      toast.success("Transaction updated successfully");
      onOpenChange(false);
    },
    onError: (error: { errors?: FormErrors; error?: string }) => {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        toast.error(error.error || "Failed to update transaction");
      }
    },
  });

  // Calculate available quantity for SELL (current holdings + original sell quantity)
  // Because if we sold 10 shares, and we're editing that sell, we have "currentQuantity + 10" available
  const availableForSell = useMemo(() => {
    if (transaction.action !== "SELL" || currentQuantity === undefined) {
      return undefined;
    }
    // Current holdings already excludes this sell, but API returns holdings WITH all transactions
    // So we need to add back this transaction's original quantity
    return currentQuantity + Number(transaction.quantity);
  }, [transaction.action, transaction.quantity, currentQuantity]);

  // Calculate total for BUY/SELL and DIVIDEND
  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    const fees = parseFloat(formData.fees) || 0;

    if (qty <= 0) return null;

    // DIVIDEND: just qty * price (no fees)
    if (transaction.action === "DIVIDEND") {
      if (price <= 0) return null;
      return qty * price;
    }

    if (price <= 0) return null;

    const baseAmount = qty * price;
    if (transaction.action === "BUY") {
      return baseAmount + fees;
    } else if (transaction.action === "SELL") {
      return baseAmount - fees;
    }
    return baseAmount;
  }, [formData.quantity, formData.unitPrice, formData.fees, transaction.action]);

  // Check if selling all shares
  const isSellingAll = useMemo(() => {
    if (transaction.action !== "SELL" || availableForSell === undefined) {
      return false;
    }
    const sellQty = parseFloat(formData.quantity) || 0;
    return sellQty > 0 && Math.abs(sellQty - availableForSell) < 0.00000001;
  }, [transaction.action, availableForSell, formData.quantity]);

  // Check if exceeding holdings
  const exceedsHoldings = useMemo(() => {
    if (transaction.action !== "SELL" || availableForSell === undefined) {
      return false;
    }
    const sellQty = parseFloat(formData.quantity) || 0;
    return sellQty > availableForSell;
  }, [transaction.action, availableForSell, formData.quantity]);

  const handleSubmit = () => {
    const newErrors: FormErrors = {};

    // Validate date (required for all)
    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    // Validate quantity (required for all)
    const qty = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }

    // Validate unit price (required for BUY/SELL/DIVIDEND, not for SPLIT)
    if (transaction.action !== "SPLIT") {
      const price = parseFloat(formData.unitPrice);
      if (!formData.unitPrice || isNaN(price) || price < 0) {
        newErrors.unit_price = "Unit price must be a non-negative number";
      }
    }

    // Validate fees if provided (for BUY/SELL only, not DIVIDEND/SPLIT)
    if (
      (transaction.action === "BUY" || transaction.action === "SELL") &&
      formData.fees
    ) {
      const feesNum = parseFloat(formData.fees);
      if (isNaN(feesNum) || feesNum < 0) {
        newErrors.fees = "Fees must be a non-negative number";
      }
    }

    // For SELL: check if exceeds holdings
    if (transaction.action === "SELL" && exceedsHoldings) {
      newErrors.quantity = "Sell quantity exceeds holdings";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare update data
    const updateData: UpdateTransactionData = {
      date: formData.date,
      quantity: formData.quantity,
      notes: formData.notes.trim() || undefined,
    };

    // Only include unit_price for non-SPLIT
    if (transaction.action !== "SPLIT") {
      updateData.unit_price = formData.unitPrice;
    }

    // Only include fees for BUY/SELL
    if (transaction.action === "BUY" || transaction.action === "SELL") {
      updateData.fees = formData.fees || "0";
    }

    mutation.mutate(updateData);
  };

  const isBuySell = transaction.action === "BUY" || transaction.action === "SELL";
  const isDividend = transaction.action === "DIVIDEND";
  const isSplit = transaction.action === "SPLIT";

  const getDialogTitle = () => {
    switch (transaction.action) {
      case "BUY":
        return `Edit Buy - ${transaction.holding.symbol || transaction.holding.name}`;
      case "SELL":
        return `Edit Sell - ${transaction.holding.symbol || transaction.holding.name}`;
      case "DIVIDEND":
        return `Edit Dividend - ${transaction.holding.symbol || transaction.holding.name}`;
      case "SPLIT":
        return `Edit Split - ${transaction.holding.symbol || transaction.holding.name}`;
      default:
        return "Edit Transaction";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Edit the transaction details. Holding and action type cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Read-only info: Holding and Action */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Holding:</span>
              <span className="font-medium text-foreground">
                {transaction.holding.symbol || transaction.holding.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Action:</span>
              <span className="font-medium text-foreground">{transaction.action}</span>
            </div>
          </div>

          {/* Currency display (read-only) */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Currency:</span>
            <span className="font-medium text-foreground">
              {transaction.holding.currency}
            </span>
          </div>

          {/* Available quantity for SELL */}
          {transaction.action === "SELL" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Available to sell:</span>
              {quantityLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <span className="font-mono font-medium">
                  {availableForSell?.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })}{" "}
                  shares
                </span>
              )}
            </div>
          )}

          {/* Date field */}
          <div className="grid gap-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                if (errors.date) setErrors({ ...errors, date: undefined });
              }}
              className={errors.date ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
          </div>

          {/* Quantity field */}
          <div className="grid gap-2">
            <Label htmlFor="edit-quantity">
              {isSplit ? "Split Ratio" : isDividend ? "Shares Held" : "Quantity"}
            </Label>
            {isSplit ? (
              <div className="flex items-center gap-2">
                <Input
                  id="edit-quantity"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({ ...formData, quantity: e.target.value });
                    if (errors.quantity)
                      setErrors({ ...errors, quantity: undefined });
                  }}
                  className={`w-24 ${errors.quantity ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="text-muted-foreground">: 1</span>
              </div>
            ) : (
              <Input
                id="edit-quantity"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  if (errors.quantity)
                    setErrors({ ...errors, quantity: undefined });
                }}
                className={errors.quantity ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            )}
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
            {exceedsHoldings && !errors.quantity && availableForSell !== undefined && (
              <p className="text-sm text-red-500">
                Exceeds available holdings (
                {availableForSell.toLocaleString(undefined, {
                  maximumFractionDigits: 8,
                })}
                )
              </p>
            )}
            {isSplit && (
              <p className="text-xs text-muted-foreground">
                {formData.quantity && parseFloat(formData.quantity) > 0 ? (
                  parseFloat(formData.quantity) >= 1 ? (
                    <>A {formData.quantity}:1 split multiplies your shares by {formData.quantity}.</>
                  ) : (
                    <>
                      A {formData.quantity}:1 reverse split reduces your shares to{" "}
                      {(parseFloat(formData.quantity) * 100).toFixed(0)}% of the
                      original.
                    </>
                  )
                ) : (
                  "Enter 2 for a 2:1 split, 0.5 for a 1:2 reverse split"
                )}
              </p>
            )}
            {isDividend && (
              <p className="text-xs text-muted-foreground">
                The number of shares you held when this dividend was paid
              </p>
            )}
          </div>

          {/* Unit Price field (not for SPLIT) */}
          {!isSplit && (
            <div className="grid gap-2">
              <Label htmlFor="edit-unitPrice">
                {isDividend
                  ? `Dividend Per Share (${transaction.holding.currency})`
                  : `Unit Price (${transaction.holding.currency})`}
              </Label>
              <Input
                id="edit-unitPrice"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.unitPrice}
                onChange={(e) => {
                  setFormData({ ...formData, unitPrice: e.target.value });
                  if (errors.unit_price)
                    setErrors({ ...errors, unit_price: undefined });
                }}
                className={errors.unit_price ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.unit_price && (
                <p className="text-sm text-red-500">{errors.unit_price}</p>
              )}
            </div>
          )}

          {/* Fees field (only for BUY/SELL) */}
          {isBuySell && (
            <div className="grid gap-2">
              <Label htmlFor="edit-fees">Fees ({transaction.holding.currency})</Label>
              <Input
                id="edit-fees"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.fees}
                onChange={(e) => {
                  setFormData({ ...formData, fees: e.target.value });
                  if (errors.fees) setErrors({ ...errors, fees: undefined });
                }}
                className={errors.fees ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.fees && <p className="text-sm text-red-500">{errors.fees}</p>}
            </div>
          )}

          {/* Notes field */}
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Input
              id="edit-notes"
              placeholder="Add any notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Calculated total (for BUY/SELL/DIVIDEND) */}
          {calculatedTotal !== null && !isSplit && (
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {transaction.action === "DIVIDEND"
                    ? "Total Dividend"
                    : transaction.action === "BUY"
                      ? "Total Cost"
                      : "Total Proceeds"}
                </span>
                <span
                  className={`text-lg font-semibold font-mono ${
                    transaction.action === "DIVIDEND" ? "text-green-500" : ""
                  }`}
                >
                  {transaction.holding.currency}{" "}
                  {calculatedTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.quantity}{" "}
                {isDividend ? "shares" : ""} ×{" "}
                {transaction.holding.currency}{" "}
                {parseFloat(formData.unitPrice).toLocaleString(undefined, {
                  minimumFractionDigits: isDividend ? 4 : 2,
                  maximumFractionDigits: isDividend ? 4 : 2,
                })}
                {isDividend && " per share"}
                {isBuySell && parseFloat(formData.fees) > 0 && (
                  <>
                    {" "}
                    {transaction.action === "BUY" ? "+" : "−"}{" "}
                    {transaction.holding.currency}{" "}
                    {parseFloat(formData.fees).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    fees
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              mutation.isPending ||
              (transaction.action === "SELL" && quantityLoading)
            }
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
