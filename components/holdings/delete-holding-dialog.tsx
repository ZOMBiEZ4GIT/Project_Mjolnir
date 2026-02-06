"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import type { Holding } from "@/lib/db/schema";

// Display names for holding types
const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

// Latest snapshot data shape
interface LatestSnapshot {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
}

// Holding with both cost basis and snapshot data
export interface HoldingWithData extends Holding {
  quantity: number | null;
  costBasis: number | null;
  avgCost: number | null;
  latestSnapshot: LatestSnapshot | null;
}

interface DeleteHoldingDialogProps {
  holding: HoldingWithData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function deleteHolding(id: string): Promise<void> {
  const response = await fetch(`/api/holdings/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete holding");
  }
}

/**
 * Format balance with currency symbol
 */
function formatBalance(balance: string | number, currency: string): string {
  const num = typeof balance === "string" ? Number(balance) : balance;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${num.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format quantity with appropriate decimal places
 */
function formatQuantity(value: number | null): string {
  if (value === null || value === 0) return "0";
  if (value < 1) {
    return value.toLocaleString("en-AU", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    });
  }
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function DeleteHoldingDialog({
  holding,
  open,
  onOpenChange,
}: DeleteHoldingDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["prices"] });

      toast.success("Holding deleted successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete holding");
    },
  });

  const handleDelete = () => {
    if (holding) {
      mutation.mutate(holding.id);
    }
  };

  if (!holding) return null;

  const isTradeable = ["stock", "etf", "crypto"].includes(holding.type);
  const isSnapshotType = ["super", "cash", "debt"].includes(holding.type);

  return (
    <AnimatedAlertDialog open={open} onOpenChange={onOpenChange}>
      <AnimatedAlertDialogContent className="bg-background border-border">
        <AnimatedAlertDialogHeader>
          <AnimatedAlertDialogTitle className="text-foreground">Delete Holding</AnimatedAlertDialogTitle>
          <AnimatedAlertDialogDescription className="text-muted-foreground">
            Are you sure you want to delete this holding? This action cannot be undone.
          </AnimatedAlertDialogDescription>
        </AnimatedAlertDialogHeader>

        {/* Holding details */}
        <div className="my-4 p-4 bg-card rounded-lg border border-border space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="text-foreground font-medium">{holding.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="text-foreground">{HOLDING_TYPE_LABELS[holding.type]}</span>
          </div>
          {holding.symbol && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Symbol:</span>
              <span className="text-foreground font-mono">{holding.symbol}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency:</span>
            <span className="text-foreground">{holding.currency}</span>
          </div>
          {isTradeable && holding.quantity !== null && holding.quantity > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="text-foreground font-mono">{formatQuantity(holding.quantity)}</span>
            </div>
          )}
          {isTradeable && holding.costBasis !== null && holding.costBasis > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost Basis:</span>
              <span className="text-foreground font-mono">
                {formatBalance(holding.costBasis, holding.currency)}
              </span>
            </div>
          )}
          {isSnapshotType && holding.latestSnapshot && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest Balance:</span>
              <span className="text-foreground font-mono">
                {formatBalance(holding.latestSnapshot.balance, holding.latestSnapshot.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Warning about associated data */}
        <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
          <p className="text-sm text-warning">
            <strong>Warning:</strong> This will also delete all associated{" "}
            {isTradeable ? "transactions and price history" : "snapshots"}
            {holding.type === "super" ? " and contribution records" : ""} for this holding.
          </p>
        </div>

        <AnimatedAlertDialogFooter>
          <AnimatedAlertDialogCancel
            className="bg-card border-border text-foreground hover:bg-muted"
            disabled={mutation.isPending}
          >
            Cancel
          </AnimatedAlertDialogCancel>
          <AnimatedAlertDialogAction
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="bg-destructive hover:bg-destructive/90 text-foreground"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AnimatedAlertDialogAction>
        </AnimatedAlertDialogFooter>
      </AnimatedAlertDialogContent>
    </AnimatedAlertDialog>
  );
}
