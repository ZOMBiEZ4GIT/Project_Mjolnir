"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { Loader2 } from "lucide-react";
import { CURRENCY_SYMBOLS, type Currency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
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

interface SnapshotToDelete {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
  holdingName: string;
  holdingType: string;
}

interface DeleteSnapshotDialogProps {
  snapshot: SnapshotToDelete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Format date as "Month Year" (e.g., "January 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

// Format balance with currency symbol
function formatBalance(balance: string, currency: string): string {
  const num = Number(balance);
  const symbol = CURRENCY_SYMBOLS[currency as Currency] || currency;
  return `${symbol}${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function deleteSnapshot(id: string): Promise<void> {
  const response = await fetch(`/api/snapshots/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete snapshot");
  }
}

export function DeleteSnapshotDialog({
  snapshot,
  open,
  onOpenChange,
}: DeleteSnapshotDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteSnapshot,
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIn.status });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIn.holdings });
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });

      showSuccess("Snapshot deleted successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to delete snapshot");
    },
  });

  const handleDelete = () => {
    if (snapshot) {
      mutation.mutate(snapshot.id);
    }
  };

  if (!snapshot) return null;

  const isSuper = snapshot.holdingType === "super";

  return (
    <AnimatedAlertDialog open={open} onOpenChange={onOpenChange}>
      <AnimatedAlertDialogContent className="bg-background border-border">
        <AnimatedAlertDialogHeader>
          <AnimatedAlertDialogTitle className="text-foreground">Delete Snapshot</AnimatedAlertDialogTitle>
          <AnimatedAlertDialogDescription className="text-muted-foreground">
            Are you sure you want to delete this snapshot? This action cannot be undone.
          </AnimatedAlertDialogDescription>
        </AnimatedAlertDialogHeader>

        <div className="my-4 p-4 bg-card rounded-lg border border-border space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Holding:</span>
            <span className="text-foreground font-medium">{snapshot.holdingName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="text-foreground">{formatMonthYear(snapshot.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance:</span>
            <span className="text-foreground font-mono">
              {formatBalance(snapshot.balance, snapshot.currency)}
            </span>
          </div>
        </div>

        {isSuper && (
          <p className="text-sm text-warning bg-warning/10 p-3 rounded-lg border border-warning/20">
            This will also delete any associated contribution record for this month.
          </p>
        )}

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
