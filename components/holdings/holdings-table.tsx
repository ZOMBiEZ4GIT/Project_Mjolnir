"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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

interface HoldingsTableProps {
  holdings: Holding[];
}

function groupHoldingsByType(holdings: Holding[]): Map<Holding["type"], Holding[]> {
  const groups = new Map<Holding["type"], Holding[]>();

  for (const holding of holdings) {
    const existing = groups.get(holding.type) || [];
    groups.set(holding.type, [...existing, holding]);
  }

  return groups;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<Holding | null>(null);
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
  holdings: Holding[];
  onEdit: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
}

function HoldingsTypeSection({ type, holdings, onEdit, onDelete }: HoldingsTypeSectionProps) {
  const label = HOLDING_TYPE_LABELS[type];
  const showSymbol = type === "stock" || type === "etf" || type === "crypto";

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
              <TableHead className="text-gray-400">Currency</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.id} className="border-gray-800">
                <TableCell className="text-white font-medium">
                  {holding.name}
                </TableCell>
                {showSymbol && (
                  <TableCell className="text-gray-300">
                    {holding.symbol || "—"}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
