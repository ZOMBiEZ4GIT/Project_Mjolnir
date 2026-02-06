"use client";

import { useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TypeSelector } from "./type-selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface EditTransactionDialogProps {
  transaction: TransactionWithHolding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionSaved?: (transactionId: string) => void;
}

// ---------------------------------------------------------------------------
// Zod schema — same as add dialog
// ---------------------------------------------------------------------------

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce
    .number()
    .min(0, "Unit price must be non-negative")
    .default(0),
  fees: z.coerce
    .number()
    .min(0, "Fees must be non-negative")
    .default(0),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onTransactionSaved,
}: EditTransactionDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      date: transaction.date,
      quantity: Number(transaction.quantity),
      unitPrice: Number(transaction.unitPrice),
      fees: Number(transaction.fees),
      notes: transaction.notes || "",
    },
  });

  // Reset form data when transaction changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        date: transaction.date,
        quantity: Number(transaction.quantity),
        unitPrice: Number(transaction.unitPrice),
        fees: Number(transaction.fees),
        notes: transaction.notes || "",
      });
    }
  }, [open, transaction, form]);

  // Fetch current quantity for SELL validation
  const { data: currentQuantity, isLoading: quantityLoading } = useQuery({
    queryKey: ["holdings", transaction.holdingId, "quantity"],
    queryFn: () => fetchHoldingQuantity(transaction.holdingId),
    enabled: open && transaction.action === "SELL",
  });

  // Calculate available quantity for SELL (current holdings + original sell quantity)
  // Because if we sold 10 shares, and we're editing that sell, we have "currentQuantity + 10" available
  const availableForSell = useMemo(() => {
    if (transaction.action !== "SELL" || currentQuantity === undefined) {
      return undefined;
    }
    return currentQuantity + Number(transaction.quantity);
  }, [transaction.action, transaction.quantity, currentQuantity]);

  const watchQuantity = form.watch("quantity");
  const watchUnitPrice = form.watch("unitPrice");
  const watchFees = form.watch("fees");

  // Calculated total
  const calculatedTotal = useMemo(() => {
    const qty = Number(watchQuantity) || 0;
    const price = Number(watchUnitPrice) || 0;
    const fees = Number(watchFees) || 0;
    if (qty <= 0 || (transaction.action !== "SPLIT" && price <= 0)) return null;
    if (transaction.action === "SPLIT") return null;
    const base = qty * price;
    if (transaction.action === "BUY") return base + fees;
    if (transaction.action === "SELL") return base - fees;
    return base; // DIVIDEND
  }, [watchQuantity, watchUnitPrice, watchFees, transaction.action]);

  // Sell validation helpers
  const isSellingAll = useMemo(() => {
    if (transaction.action !== "SELL" || availableForSell === undefined)
      return false;
    const qty = Number(watchQuantity) || 0;
    return qty > 0 && Math.abs(qty - availableForSell) < 0.00000001;
  }, [transaction.action, availableForSell, watchQuantity]);

  const exceedsHoldings = useMemo(() => {
    if (transaction.action !== "SELL" || availableForSell === undefined)
      return false;
    return (Number(watchQuantity) || 0) > availableForSell;
  }, [transaction.action, availableForSell, watchQuantity]);

  const mutation = useMutation({
    mutationFn: (data: UpdateTransactionData) =>
      updateTransaction(transaction.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["holdings", transaction.holdingId, "quantity"],
      });
      toast.success("Transaction updated successfully");
      onTransactionSaved?.(transaction.id);
      onOpenChange(false);
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || "Failed to update transaction");
    },
  });

  const onSubmit = (values: FormValues) => {
    // Per-action validation
    if (
      transaction.action !== "SPLIT" &&
      (!values.unitPrice || values.unitPrice <= 0)
    ) {
      form.setError("unitPrice", {
        message:
          transaction.action === "DIVIDEND"
            ? "Dividend per share must be positive"
            : "Unit price must be positive",
      });
      return;
    }
    if (transaction.action === "SELL" && exceedsHoldings) {
      form.setError("quantity", { message: "Sell quantity exceeds holdings" });
      return;
    }

    const unitPrice =
      transaction.action === "SPLIT" ? "0" : String(values.unitPrice || 0);
    const fees =
      transaction.action === "BUY" || transaction.action === "SELL"
        ? String(values.fees || 0)
        : "0";

    mutation.mutate({
      date: values.date,
      quantity: String(values.quantity),
      unit_price: unitPrice,
      fees,
      notes: values.notes?.trim() || undefined,
    });
  };

  const isBuySell =
    transaction.action === "BUY" || transaction.action === "SELL";
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-0"
          >
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              <DialogDescription>
                Edit the transaction details. Holding and action type cannot be
                changed.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Read-only info: Holding */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Holding:</span>
                <span className="font-medium text-foreground">
                  {transaction.holding.symbol || transaction.holding.name}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium text-foreground">
                  {transaction.holding.currency}
                </span>
              </div>

              {/* TypeSelector in disabled mode */}
              <TypeSelector
                value={transaction.action}
                onChange={() => {}}
                disabled
              />

              {/* Available quantity for SELL */}
              {transaction.action === "SELL" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Available to sell:
                  </span>
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
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity field */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isSplit
                        ? "Split Ratio"
                        : isDividend
                          ? "Shares Held"
                          : "Quantity"}
                    </FormLabel>
                    {isSplit ? (
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="2"
                            className="w-24"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? "" : e.target.value
                              )
                            }
                          />
                        </FormControl>
                        <span className="text-muted-foreground">: 1</span>
                      </div>
                    ) : (
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : e.target.value
                            )
                          }
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                    {/* Sell-specific warnings */}
                    {isSellingAll && !form.formState.errors.quantity && (
                      <p className="text-sm text-yellow-500">
                        This will sell all your shares
                      </p>
                    )}
                    {exceedsHoldings &&
                      !form.formState.errors.quantity &&
                      availableForSell !== undefined && (
                        <p className="text-sm text-destructive">
                          Exceeds available holdings (
                          {availableForSell.toLocaleString(undefined, {
                            maximumFractionDigits: 8,
                          })}
                          )
                        </p>
                      )}
                    {isDividend && (
                      <FormDescription>
                        The number of shares you held when this dividend was paid
                      </FormDescription>
                    )}
                    {isSplit && (
                      <FormDescription>
                        {watchQuantity && Number(watchQuantity) > 0
                          ? Number(watchQuantity) >= 1
                            ? `A ${watchQuantity}:1 split multiplies your shares by ${watchQuantity}.`
                            : `A ${watchQuantity}:1 reverse split reduces your shares to ${(Number(watchQuantity) * 100).toFixed(0)}% of the original.`
                          : "Enter 2 for a 2:1 split, 0.5 for a 1:2 reverse split"}
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />

              {/* Unit Price field (not for SPLIT) */}
              {!isSplit && (
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isDividend
                          ? `Dividend Per Share (${transaction.holding.currency})`
                          : `Unit Price (${transaction.holding.currency})`}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : e.target.value
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fees field (only for BUY/SELL) */}
              {isBuySell && (
                <FormField
                  control={form.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fees ({transaction.holding.currency})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? "" : e.target.value
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Add any notes..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Calculated total (for BUY/SELL/DIVIDEND) */}
              {calculatedTotal !== null && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isDividend
                        ? "Total Dividend"
                        : transaction.action === "BUY"
                          ? "Total Cost"
                          : "Total Proceeds"}
                    </span>
                    <span
                      className={`text-lg font-semibold font-mono ${isDividend ? "text-positive" : ""}`}
                    >
                      {transaction.holding.currency}{" "}
                      {calculatedTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {watchQuantity}
                    {isDividend && " shares"} ×{" "}
                    {transaction.holding.currency}{" "}
                    {(Number(watchUnitPrice) || 0).toLocaleString(undefined, {
                      minimumFractionDigits: isDividend ? 4 : 2,
                      maximumFractionDigits: isDividend ? 4 : 2,
                    })}
                    {isDividend && " per share"}
                    {isBuySell && Number(watchFees) > 0 && (
                      <>
                        {" "}
                        {transaction.action === "BUY" ? "+" : "−"}{" "}
                        {transaction.holding.currency}{" "}
                        {Number(watchFees).toLocaleString(undefined, {
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  mutation.isPending ||
                  (transaction.action === "SELL" && quantityLoading)
                }
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
