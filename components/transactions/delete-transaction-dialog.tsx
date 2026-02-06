"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/lib/toast-helpers";
import {
  AnimatedAlertDialog,
  AnimatedAlertDialogAction,
  AnimatedAlertDialogCancel,
  AnimatedAlertDialogContent,
  AnimatedAlertDialogDescription,
  AnimatedAlertDialogFooter,
  AnimatedAlertDialogHeader,
  AnimatedAlertDialogTitle,
} from "@/components/ui/animated-alert-dialog";

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

interface DeleteTransactionDialogProps {
  transaction: TransactionWithHolding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (transactionId: string) => void;
}

async function deleteTransaction(id: string) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete transaction");
  }

  return response.json();
}

/**
 * Format a date string (YYYY-MM-DD) to display format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a number as currency
 */
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate the total value of a transaction
 */
function calculateTotal(transaction: TransactionWithHolding): number {
  const quantity = Number(transaction.quantity);
  const unitPrice = Number(transaction.unitPrice);
  const fees = Number(transaction.fees);

  if (transaction.action === "SPLIT") {
    return 0;
  }

  const baseValue = quantity * unitPrice;

  if (transaction.action === "BUY") {
    return baseValue + fees;
  }

  if (transaction.action === "SELL") {
    return baseValue - fees;
  }

  // DIVIDEND
  return baseValue;
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteTransaction(transaction.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["holdings", transaction.holdingId, "quantity"],
      });
      showSuccess("Transaction deleted");
      onDeleted?.(transaction.id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to delete transaction");
    },
  });

  const handleDelete = () => {
    mutation.mutate();
  };

  const total = calculateTotal(transaction);

  return (
    <AnimatedAlertDialog open={open} onOpenChange={onOpenChange}>
      <AnimatedAlertDialogContent>
        <AnimatedAlertDialogHeader>
          <AnimatedAlertDialogTitle>Delete Transaction</AnimatedAlertDialogTitle>
          <AnimatedAlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete this transaction? This action cannot
              be undone.
            </p>

            {/* Transaction details */}
            <div className="rounded-md border border-border bg-muted/50 p-3 mt-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Holding:</span>
                  <span className="font-medium text-foreground">
                    {transaction.holding.symbol || transaction.holding.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground">
                    {formatDate(transaction.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="text-foreground">{transaction.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-mono text-foreground">
                    {transaction.action === "SPLIT"
                      ? `${transaction.quantity}:1`
                      : Number(transaction.quantity).toLocaleString("en-AU", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 8,
                        })}
                  </span>
                </div>
                {transaction.action !== "SPLIT" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(total, transaction.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning about cost basis */}
            <div className="rounded-md border border-warning/20 bg-warning/10 p-3 mt-3">
              <p className="text-sm text-warning">
                <strong>Warning:</strong> Deleting this transaction will affect
                cost basis calculations for this holding.
              </p>
            </div>
          </AnimatedAlertDialogDescription>
        </AnimatedAlertDialogHeader>
        <AnimatedAlertDialogFooter>
          <AnimatedAlertDialogCancel disabled={mutation.isPending}>Cancel</AnimatedAlertDialogCancel>
          <AnimatedAlertDialogAction
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
          >
            {mutation.isPending ? "Deleting..." : "Delete Transaction"}
          </AnimatedAlertDialogAction>
        </AnimatedAlertDialogFooter>
      </AnimatedAlertDialogContent>
    </AnimatedAlertDialog>
  );
}
