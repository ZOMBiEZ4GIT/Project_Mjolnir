"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Holding data from check-in status API
interface HoldingToUpdate {
  id: string;
  name: string;
  type: string;
  currency: string;
  isDormant: boolean;
}

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get first of current month as YYYY-MM-01
function getFirstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// Get previous month as YYYY-MM-01
function getFirstOfPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return getFirstOfMonth(prev);
}

// Format month for display (e.g., "February 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

// Fetch holdings needing updates for a specific month
async function fetchHoldingsForMonth(month: string): Promise<{
  holdings: HoldingToUpdate[];
  currentMonth: string;
}> {
  const response = await fetch(`/api/check-in/status?month=${month}`);
  if (!response.ok) {
    throw new Error("Failed to fetch holdings");
  }
  return response.json();
}

// Type labels for display
const typeLabels: Record<string, string> = {
  super: "Superannuation",
  cash: "Cash",
  debt: "Debt",
};

// Type order for grouping
const typeOrder = ["super", "cash", "debt"];

export function CheckInModal({ open, onOpenChange }: CheckInModalProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();

  // Month selector: current or previous month
  const currentMonth = getFirstOfMonth(new Date());
  const previousMonth = getFirstOfPreviousMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Track which holdings have been "updated" (filled in) in this session
  const [updatedHoldingIds, setUpdatedHoldingIds] = useState<Set<string>>(
    new Set()
  );

  // Fetch holdings needing updates for selected month
  const { data, isLoading, error } = useQuery({
    queryKey: ["check-in-holdings", selectedMonth],
    queryFn: () => fetchHoldingsForMonth(selectedMonth),
    enabled: isLoaded && isSignedIn && open,
  });

  // Group holdings by type
  const groupedHoldings = useMemo(() => {
    if (!data?.holdings) return {};

    const groups: Record<string, HoldingToUpdate[]> = {};

    for (const holding of data.holdings) {
      if (!groups[holding.type]) {
        groups[holding.type] = [];
      }
      groups[holding.type].push(holding);
    }

    return groups;
  }, [data?.holdings]);

  // Calculate progress
  const totalHoldings = data?.holdings?.length ?? 0;
  const updatedCount = updatedHoldingIds.size;

  // Reset state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on close
      setUpdatedHoldingIds(new Set());
      setSelectedMonth(currentMonth);
    }
    onOpenChange(newOpen);
  };

  // Handle month change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // Reset updated holdings when month changes
    setUpdatedHoldingIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-gray-700 bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-white">Monthly Check-in</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update your balances for the selected month
          </DialogDescription>
        </DialogHeader>

        {/* Month Selector */}
        <div className="flex items-center gap-4 py-4">
          <label className="text-sm font-medium text-gray-300">Month:</label>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value={currentMonth} className="text-white">
                {formatMonthYear(currentMonth)} (Current)
              </SelectItem>
              <SelectItem value={previousMonth} className="text-white">
                {formatMonthYear(previousMonth)}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress Indicator */}
        {totalHoldings > 0 && (
          <div className="text-sm text-gray-400 mb-4">
            {updatedCount} of {totalHoldings} holding
            {totalHoldings !== 1 ? "s" : ""} updated
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center text-gray-400">
            Loading holdings...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-8 text-center text-red-400">
            Failed to load holdings. Please try again.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalHoldings === 0 && (
          <div className="py-8 text-center text-gray-400">
            All holdings are up to date for {formatMonthYear(selectedMonth)}!
          </div>
        )}

        {/* Holdings List Grouped by Type */}
        {!isLoading && !error && totalHoldings > 0 && (
          <div className="space-y-6">
            {typeOrder.map((type) => {
              const holdings = groupedHoldings[type];
              if (!holdings || holdings.length === 0) return null;

              return (
                <div key={type} className="space-y-3">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                    {typeLabels[type] || type}
                  </h3>
                  <div className="space-y-2">
                    {holdings.map((holding) => (
                      <div
                        key={holding.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">
                            {holding.name}
                          </span>
                          {holding.isDormant && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                              Dormant
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">
                          {holding.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with Skip Button */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
