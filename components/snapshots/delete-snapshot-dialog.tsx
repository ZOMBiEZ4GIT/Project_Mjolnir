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
  const symbols: Record<string, string> = {
    AUD: "A$",
    NZD: "NZ$",
    USD: "US$",
  };
  const symbol = symbols[currency] || currency;
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
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["check-in-status"] });
      queryClient.invalidateQueries({ queryKey: ["check-in-holdings"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });

      toast.success("Snapshot deleted successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete snapshot");
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Snapshot</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to delete this snapshot? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Holding:</span>
            <span className="text-white font-medium">{snapshot.holdingName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Date:</span>
            <span className="text-white">{formatMonthYear(snapshot.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white font-mono">
              {formatBalance(snapshot.balance, snapshot.currency)}
            </span>
          </div>
        </div>

        {isSuper && (
          <p className="text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded-lg border border-yellow-400/20">
            This will also delete any associated contribution record for this month.
          </p>
        )}

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
