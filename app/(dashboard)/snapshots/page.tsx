"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Camera, Filter } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { EditSnapshotModal } from "@/components/snapshots/edit-snapshot-modal";
import { DeleteSnapshotDialog } from "@/components/snapshots/delete-snapshot-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import type { Currency } from "@/lib/utils/currency";
import type { Holding } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Snapshot with holding info from API
interface SnapshotWithHolding {
  id: string;
  holdingId: string;
  date: string;
  balance: string;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  holdingName: string;
  holdingType: string;
}

const snapshotTypes = ["super", "cash", "debt"] as const;

async function fetchSnapshots(holdingId?: string): Promise<SnapshotWithHolding[]> {
  const url = holdingId
    ? `/api/snapshots?holding_id=${holdingId}`
    : "/api/snapshots";
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch snapshots");
  }
  return response.json();
}

async function fetchHoldings(): Promise<Holding[]> {
  const response = await fetch("/api/holdings?include_dormant=true");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  return response.json();
}

// Format date as "Month Year" (e.g., "January 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

// Capitalize holding type for display
function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function SnapshotsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, convert, isLoading: currencyLoading } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();

  const holdingFilter = searchParams.get("holding_id") || "";
  const typeFilter = searchParams.get("type") || "";

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotWithHolding | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<SnapshotWithHolding | null>(null);

  const handleEditClick = (snapshot: SnapshotWithHolding) => {
    setSelectedSnapshot(snapshot);
    setEditModalOpen(true);
  };

  const handleEditModalClose = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      setSelectedSnapshot(null);
    }
  };

  const handleDeleteClick = (snapshot: SnapshotWithHolding) => {
    setSnapshotToDelete(snapshot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSnapshotToDelete(null);
    }
  };

  const handleHoldingFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("holding_id", value);
    } else {
      params.delete("holding_id");
    }
    router.push(`/snapshots${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleTypeFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("type", value);
    } else {
      params.delete("type");
    }
    router.push(`/snapshots${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Fetch holdings for the dropdown filter
  const { data: holdings } = useQuery({
    queryKey: ["holdings", { showDormant: true }],
    queryFn: fetchHoldings,
    enabled: isLoaded && isSignedIn,
  });

  // Filter holdings to only snapshot types (super, cash, debt)
  const snapshotHoldings = holdings?.filter((h) =>
    snapshotTypes.includes(h.type as (typeof snapshotTypes)[number])
  );

  // Fetch snapshots (optionally filtered by holding)
  const {
    data: snapshots,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["snapshots", { holdingId: holdingFilter }],
    queryFn: () => fetchSnapshots(holdingFilter || undefined),
    enabled: isLoaded && isSignedIn,
  });

  // Apply type filter client-side (API doesn't support type filter directly)
  const filteredSnapshots = typeFilter
    ? snapshots?.filter((s) => s.holdingType === typeFilter)
    : snapshots;

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-white">Sign in to view your snapshots</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching snapshots
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Snapshots</h1>
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-gray-400">Loading snapshots...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Snapshots</h1>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-red-400">Failed to load snapshots</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!filteredSnapshots || filteredSnapshots.length === 0) {
    const hasFilters = holdingFilter || typeFilter;

    // Helper to clear all filters
    const handleClearFilters = () => {
      router.push("/snapshots");
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Snapshots</h1>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="w-48">
              <Select value={holdingFilter || "all"} onValueChange={handleHoldingFilterChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Holdings" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    All Holdings
                  </SelectItem>
                  {snapshotHoldings?.map((holding) => (
                    <SelectItem
                      key={holding.id}
                      value={holding.id}
                      className="text-white hover:bg-gray-700"
                    >
                      {holding.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={typeFilter || "all"} onValueChange={handleTypeFilterChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    All Types
                  </SelectItem>
                  {snapshotTypes.map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="text-white hover:bg-gray-700"
                    >
                      {formatType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <EmptyState
          icon={hasFilters ? Filter : Camera}
          title={hasFilters ? "No snapshots match your filters" : "No snapshots yet"}
          description={
            hasFilters
              ? "Try adjusting your filters to see more snapshots, or clear all filters to view everything."
              : "Use the monthly check-in to record balances for your superannuation, cash, and debt holdings."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear all filters
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  // Show snapshots table
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Snapshots</h1>
      </div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-48">
          <Select value={holdingFilter || "all"} onValueChange={handleHoldingFilterChange}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="All Holdings" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                All Holdings
              </SelectItem>
              {snapshotHoldings?.map((holding) => (
                <SelectItem
                  key={holding.id}
                  value={holding.id}
                  className="text-white hover:bg-gray-700"
                >
                  {holding.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={typeFilter || "all"} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                All Types
              </SelectItem>
              {snapshotTypes.map((type) => (
                <SelectItem
                  key={type}
                  value={type}
                  className="text-white hover:bg-gray-700"
                >
                  {formatType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-800/50">
              <TableHead className="text-gray-300">Date</TableHead>
              <TableHead className="text-gray-300">Holding</TableHead>
              <TableHead className="text-gray-300">Type</TableHead>
              <TableHead className="text-gray-300 text-right">Balance</TableHead>
              <TableHead className="text-gray-300">Currency</TableHead>
              <TableHead className="text-gray-300 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSnapshots.map((snapshot) => {
              const nativeBalance = Number(snapshot.balance);
              const nativeCurrency = snapshot.currency as Currency;
              const convertedBalance = convert(nativeBalance, nativeCurrency);
              const showNativeIndicator = nativeCurrency !== displayCurrency;

              return (
                <TableRow key={snapshot.id} className="border-gray-700 hover:bg-gray-800/50">
                  <TableCell className="text-white">
                    {formatMonthYear(snapshot.date)}
                  </TableCell>
                  <TableCell className="text-white">{snapshot.holdingName}</TableCell>
                  <TableCell className="text-gray-300">
                    {formatType(snapshot.holdingType)}
                  </TableCell>
                  <TableCell className="text-white text-right font-mono">
                    <CurrencyDisplay
                      amount={convertedBalance}
                      currency={displayCurrency}
                      showNative={showNativeIndicator}
                      nativeCurrency={nativeCurrency}
                      nativeAmount={nativeBalance}
                      isLoading={currencyLoading}
                    />
                  </TableCell>
                  <TableCell className="text-gray-300">{snapshot.currency}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(snapshot)}
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(snapshot)}
                        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Snapshot Modal */}
      <EditSnapshotModal
        snapshot={selectedSnapshot}
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
      />

      {/* Delete Snapshot Dialog */}
      <DeleteSnapshotDialog
        snapshot={snapshotToDelete}
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
      />
    </div>
  );
}
