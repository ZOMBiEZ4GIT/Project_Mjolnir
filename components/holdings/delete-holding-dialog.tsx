"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Holding</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to delete this holding? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Holding details */}
        <div className="my-4 p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Name:</span>
            <span className="text-white font-medium">{holding.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="text-white">{HOLDING_TYPE_LABELS[holding.type]}</span>
          </div>
          {holding.symbol && (
            <div className="flex justify-between">
              <span className="text-gray-400">Symbol:</span>
              <span className="text-white font-mono">{holding.symbol}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Currency:</span>
            <span className="text-white">{holding.currency}</span>
          </div>
          {isTradeable && holding.quantity !== null && holding.quantity > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-white font-mono">{formatQuantity(holding.quantity)}</span>
            </div>
          )}
          {isTradeable && holding.costBasis !== null && holding.costBasis > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Cost Basis:</span>
              <span className="text-white font-mono">
                {formatBalance(holding.costBasis, holding.currency)}
              </span>
            </div>
          )}
          {isSnapshotType && holding.latestSnapshot && (
            <div className="flex justify-between">
              <span className="text-gray-400">Latest Balance:</span>
              <span className="text-white font-mono">
                {formatBalance(holding.latestSnapshot.balance, holding.latestSnapshot.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Warning about associated data */}
        <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3">
          <p className="text-sm text-yellow-400">
            <strong>Warning:</strong> This will also delete all associated{" "}
            {isTradeable ? "transactions and price history" : "snapshots"}
            {holding.type === "super" ? " and contribution records" : ""} for this holding.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            disabled={mutation.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
