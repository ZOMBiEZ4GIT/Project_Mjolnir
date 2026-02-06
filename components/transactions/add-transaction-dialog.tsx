"use client";

import { useState, useMemo } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TypeSelector, type TransactionType } from "./type-selector";
import type { Holding } from "@/lib/db/schema";

// Re-export for backwards compat
export type TransactionAction = TransactionType;

// ---------------------------------------------------------------------------
// Zod schemas — conditional validation per transaction type
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

async function fetchTradeableHoldings(): Promise<Holding[]> {
  const response = await fetch("/api/holdings?include_dormant=true");
  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch holdings");
  }
  const holdings: Holding[] = await response.json();
  return holdings.filter((h) => ["stock", "etf", "crypto"].includes(h.type));
}

async function fetchHoldingQuantity(holdingId: string): Promise<number> {
  const response = await fetch(`/api/holdings/${holdingId}/quantity`);
  if (!response.ok) throw new Error("Failed to fetch quantity");
  const data = await response.json();
  return data.quantity;
}

interface CreateTransactionData {
  holding_id: string;
  date: string;
  action: TransactionType;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AddTransactionDialogProps {
  children?: React.ReactNode;
  defaultHoldingId?: string;
}

export function AddTransactionDialog({
  children,
  defaultHoldingId,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(
    defaultHoldingId || ""
  );
  const [selectedAction, setSelectedAction] = useState<TransactionType | "">(
    ""
  );

  const queryClient = useQueryClient();

  // Fetch tradeable holdings for the dropdown
  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings", "tradeable"],
    queryFn: fetchTradeableHoldings,
    enabled: open,
  });

  const selectedHolding = holdings?.find((h) => h.id === selectedHoldingId);

  // Fetch current quantity for SELL validation
  const { data: currentQuantity, isLoading: quantityLoading } = useQuery({
    queryKey: ["holdings", selectedHoldingId, "quantity"],
    queryFn: () => fetchHoldingQuantity(selectedHoldingId),
    enabled:
      open && step === 2 && selectedAction === "SELL" && !!selectedHoldingId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      quantity: undefined as unknown as number,
      unitPrice: undefined as unknown as number,
      fees: 0,
      notes: "",
    },
  });

  const watchQuantity = form.watch("quantity");
  const watchUnitPrice = form.watch("unitPrice");
  const watchFees = form.watch("fees");

  // Calculated total
  const calculatedTotal = useMemo(() => {
    const qty = Number(watchQuantity) || 0;
    const price = Number(watchUnitPrice) || 0;
    const fees = Number(watchFees) || 0;
    if (qty <= 0 || (selectedAction !== "SPLIT" && price <= 0)) return null;
    if (selectedAction === "SPLIT") return null;
    const base = qty * price;
    if (selectedAction === "BUY") return base + fees;
    if (selectedAction === "SELL") return base - fees;
    return base; // DIVIDEND
  }, [watchQuantity, watchUnitPrice, watchFees, selectedAction]);

  // Sell validation helpers
  const isSellingAll = useMemo(() => {
    if (selectedAction !== "SELL" || currentQuantity === undefined) return false;
    const qty = Number(watchQuantity) || 0;
    return qty > 0 && Math.abs(qty - currentQuantity) < 0.00000001;
  }, [selectedAction, currentQuantity, watchQuantity]);

  const exceedsHoldings = useMemo(() => {
    if (selectedAction !== "SELL" || currentQuantity === undefined) return false;
    return (Number(watchQuantity) || 0) > currentQuantity;
  }, [selectedAction, currentQuantity, watchQuantity]);

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["holdings", selectedHoldingId, "quantity"],
      });
      toast.success("Transaction added successfully");
      handleClose();
    },
    onError: (error: { error?: string }) => {
      toast.error(error.error || "Failed to add transaction");
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setSelectedHoldingId(defaultHoldingId || "");
    setSelectedAction("");
    form.reset({
      date: new Date().toISOString().split("T")[0],
      quantity: undefined as unknown as number,
      unitPrice: undefined as unknown as number,
      fees: 0,
      notes: "",
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) handleClose();
    else setOpen(true);
  };

  const handleContinue = () => {
    if (selectedHoldingId && selectedAction) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    form.reset({
      date: new Date().toISOString().split("T")[0],
      quantity: undefined as unknown as number,
      unitPrice: undefined as unknown as number,
      fees: 0,
      notes: "",
    });
  };

  const onSubmit = (values: FormValues) => {
    // Per-action validation
    if (selectedAction !== "SPLIT" && (!values.unitPrice || values.unitPrice <= 0)) {
      form.setError("unitPrice", {
        message:
          selectedAction === "DIVIDEND"
            ? "Dividend per share must be positive"
            : "Unit price must be positive",
      });
      return;
    }
    if (selectedAction === "SELL" && exceedsHoldings) {
      form.setError("quantity", { message: "Sell quantity exceeds holdings" });
      return;
    }

    const unitPrice =
      selectedAction === "SPLIT" ? "0" : String(values.unitPrice || 0);
    const fees =
      selectedAction === "BUY" || selectedAction === "SELL"
        ? String(values.fees || 0)
        : "0";

    mutation.mutate({
      holding_id: selectedHoldingId,
      date: values.date,
      action: selectedAction as TransactionType,
      quantity: String(values.quantity),
      unit_price: unitPrice,
      fees,
      currency: selectedHolding?.currency || "AUD",
      notes: values.notes?.trim() || undefined,
    });
  };

  const canContinue = selectedHoldingId && selectedAction;
  const isBuySell = selectedAction === "BUY" || selectedAction === "SELL";
  const isDividend = selectedAction === "DIVIDEND";
  const isSplit = selectedAction === "SPLIT";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
                <label className="text-sm font-medium">Holding</label>
                <Select
                  value={selectedHoldingId}
                  onValueChange={setSelectedHoldingId}
                  disabled={holdingsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        holdingsLoading ? "Loading..." : "Select a holding"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {holdings?.map((holding) => (
                      <SelectItem key={holding.id} value={holding.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {holding.symbol || holding.name}
                          </span>
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
                        No tradeable holdings found. Add a stock, ETF, or crypto
                        first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedHolding && (
                  <p className="text-sm text-muted-foreground">
                    {selectedHolding.type.toUpperCase()} ·{" "}
                    {selectedHolding.currency}
                    {selectedHolding.exchange &&
                      ` · ${selectedHolding.exchange}`}
                  </p>
                )}
              </div>

              {/* Type selector */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Transaction Type</label>
                <TypeSelector
                  value={selectedAction}
                  onChange={setSelectedAction}
                />
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
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-0"
            >
              <DialogHeader>
                <DialogTitle>
                  {isSplit
                    ? `Stock Split - ${selectedHolding?.symbol || selectedHolding?.name}`
                    : isDividend
                      ? `Dividend - ${selectedHolding?.symbol || selectedHolding?.name}`
                      : `${selectedAction === "BUY" ? "Buy" : "Sell"} ${selectedHolding?.symbol || selectedHolding?.name}`}
                </DialogTitle>
                <DialogDescription>
                  {isSplit
                    ? "Record a stock split or reverse split."
                    : isDividend
                      ? "Record a dividend payment received."
                      : "Enter the transaction details."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Currency display (read-only) */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Currency:</span>
                  <span className="font-medium text-foreground">
                    {selectedHolding?.currency}
                  </span>
                </div>

                {/* Current quantity for SELL */}
                {selectedAction === "SELL" && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Current holdings:
                    </span>
                    {quantityLoading ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : (
                      <span className="font-mono font-medium">
                        {currentQuantity?.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        shares
                      </span>
                    )}
                  </div>
                )}

                {/* Split explanation */}
                {isSplit && (
                  <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-3">
                    <p className="text-sm text-blue-400">
                      <strong>How splits work:</strong> A 2:1 split doubles your
                      shares and halves the price per share. Your total
                      investment value stays the same.
                    </p>
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
                                  e.target.value === ""
                                    ? ""
                                    : e.target.value
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
                            placeholder={
                              isDividend
                                ? "Number of shares at dividend date"
                                : "0"
                            }
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? ""
                                  : e.target.value
                              )
                            }
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                      {/* Sell-specific warnings */}
                      {isSellingAll &&
                        !form.formState.errors.quantity && (
                          <p className="text-sm text-yellow-500">
                            This will sell all your shares
                          </p>
                        )}
                      {exceedsHoldings &&
                        !form.formState.errors.quantity &&
                        currentQuantity !== undefined && (
                          <p className="text-sm text-destructive">
                            Exceeds current holdings (
                            {currentQuantity.toLocaleString(undefined, {
                              maximumFractionDigits: 8,
                            })}
                            )
                          </p>
                        )}
                      {isDividend && (
                        <FormDescription>
                          Enter the number of shares you held when this dividend
                          was paid
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
                            ? `Dividend Per Share (${selectedHolding?.currency})`
                            : `Unit Price (${selectedHolding?.currency})`}
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
                                e.target.value === ""
                                  ? ""
                                  : e.target.value
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
                          Fees ({selectedHolding?.currency})
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
                                e.target.value === ""
                                  ? ""
                                  : e.target.value
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
                        <Input
                          placeholder={
                            isDividend
                              ? "e.g., Q4 2025 dividend"
                              : isSplit
                                ? "e.g., 2-for-1 stock split"
                                : "Add any notes..."
                          }
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Calculated total */}
                {calculatedTotal !== null && (
                  <div className="rounded-md border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isDividend
                          ? "Total Dividend"
                          : selectedAction === "BUY"
                            ? "Total Cost"
                            : "Total Proceeds"}
                      </span>
                      <span
                        className={`text-lg font-semibold font-mono ${isDividend ? "text-positive" : ""}`}
                      >
                        {selectedHolding?.currency}{" "}
                        {calculatedTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {watchQuantity}
                      {isDividend && " shares"} ×{" "}
                      {selectedHolding?.currency}{" "}
                      {(Number(watchUnitPrice) || 0).toLocaleString(undefined, {
                        minimumFractionDigits: isDividend ? 4 : 2,
                        maximumFractionDigits: isDividend ? 4 : 2,
                      })}
                      {isDividend && " per share"}
                      {isBuySell && Number(watchFees) > 0 && (
                        <>
                          {" "}
                          {selectedAction === "BUY" ? "+" : "−"}{" "}
                          {selectedHolding?.currency}{" "}
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
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    mutation.isPending ||
                    (selectedAction === "SELL" && quantityLoading)
                  }
                >
                  {mutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
