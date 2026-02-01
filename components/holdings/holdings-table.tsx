"use client";

import { useState } from "react";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Holding } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { EditHoldingDialog } from "./edit-holding-dialog";

// Display names for holding types
const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// Order in which types should be displayed
const HOLDING_TYPE_ORDER: Holding["type"][] = [
  "stock",
  "etf",
  "crypto",
  "super",
  "cash",
  "debt",
];

// Types that use snapshot-based balance tracking
const SNAPSHOT_TYPES = ["super", "cash", "debt"] as const;

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

// Latest snapshot data shape from API
interface LatestSnapshot {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
}

// Holding with optional latest snapshot
export interface HoldingWithSnapshot extends Holding {
  latestSnapshot: LatestSnapshot | null;
}

interface HoldingsTableProps {
  holdings: HoldingWithSnapshot[];
}

function groupHoldingsByType(holdings: HoldingWithSnapshot[]): Map<Holding["type"], HoldingWithSnapshot[]> {
  const groups = new Map<Holding["type"], HoldingWithSnapshot[]>();

  for (const holding of holdings) {
    const existing = groups.get(holding.type) || [];
    groups.set(holding.type, [...existing, holding]);
  }

  return groups;
}

/**
 * Check if a snapshot date is stale (older than 2 months from now)
 */
function isSnapshotStale(dateString: string): boolean {
  const snapshotDate = new Date(dateString);
  const now = new Date();

  // Calculate 2 months ago
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  return snapshotDate < twoMonthsAgo;
}

/**
 * Format balance as currency
 */
function formatBalance(balance: string, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(balance);
  return `${symbol}${num.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date as "Month Year" (e.g., "January 2026")
 */
function formatSnapshotDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [editingHolding, setEditingHolding] = useState<HoldingWithSnapshot | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithSnapshot | null>(null);
  const groupedHoldings = groupHoldingsByType(holdings);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (holdingId: string) => {
      const response = await fetch(`/api/holdings/${holdingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete holding");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      toast.success("Holding deleted successfully");
      setDeletingHolding(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (deletingHolding) {
      deleteMutation.mutate(deletingHolding.id);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {HOLDING_TYPE_ORDER.map((type) => {
          const typeHoldings = groupedHoldings.get(type);

          // Skip empty sections
          if (!typeHoldings || typeHoldings.length === 0) {
            return null;
          }

          return (
            <HoldingsTypeSection
              key={type}
              type={type}
              holdings={typeHoldings}
              onEdit={setEditingHolding}
              onDelete={setDeletingHolding}
            />
          );
        })}
      </div>

      {editingHolding && (
        <EditHoldingDialog
          holding={editingHolding}
          open={!!editingHolding}
          onOpenChange={(open) => {
            if (!open) setEditingHolding(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deletingHolding}
        onOpenChange={(open) => {
          if (!open) setDeletingHolding(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holding</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingHolding?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface HoldingsTypeSectionProps {
  type: Holding["type"];
  holdings: HoldingWithSnapshot[];
  onEdit: (holding: HoldingWithSnapshot) => void;
  onDelete: (holding: HoldingWithSnapshot) => void;
}

function HoldingsTypeSection({ type, holdings, onEdit, onDelete }: HoldingsTypeSectionProps) {
  const label = HOLDING_TYPE_LABELS[type];
  const showSymbol = type === "stock" || type === "etf" || type === "crypto";
  const showBalance = SNAPSHOT_TYPES.includes(type as (typeof SNAPSHOT_TYPES)[number]);

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">
        {label}{" "}
        <span className="text-gray-400 font-normal">({holdings.length})</span>
      </h2>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              {showSymbol && (
                <TableHead className="text-gray-400">Symbol</TableHead>
              )}
              {showBalance && (
                <TableHead className="text-gray-400">Balance</TableHead>
              )}
              <TableHead className="text-gray-400">Currency</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => {
              const snapshot = holding.latestSnapshot;
              const isStale = snapshot ? isSnapshotStale(snapshot.date) : false;

              return (
                <TableRow
                  key={holding.id}
                  className={`border-gray-800 ${holding.isDormant ? "opacity-60" : ""}`}
                >
                  <TableCell className="text-white font-medium">
                    {holding.name}
                  </TableCell>
                  {showSymbol && (
                    <TableCell className="text-gray-300">
                      {holding.symbol || "—"}
                    </TableCell>
                  )}
                  {showBalance && (
                    <TableCell>
                      {snapshot ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white">
                            {formatBalance(snapshot.balance, snapshot.currency)}
                          </span>
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isStale ? "text-yellow-400" : "text-gray-500"
                            }`}
                          >
                            {isStale && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            as of {formatSnapshotDate(snapshot.date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No data</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-gray-300">
                    {holding.currency}
                  </TableCell>
                  <TableCell>
                    {holding.isDormant ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                        Dormant
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        onClick={() => onEdit(holding)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit {holding.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => onDelete(holding)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {holding.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
