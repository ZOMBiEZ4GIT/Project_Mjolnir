"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

// Holding data from check-in status API
interface HoldingToUpdate {
  id: string;
  name: string;
  type: string;
  currency: string;
  isDormant: boolean;
}

// Data structure for super holding entry with optional contributions
export interface SuperHoldingData {
  balance: string;
  employerContrib: string;
  employeeContrib: string;
  showContributions: boolean;
}

// Data structure for simple balance holdings (cash, debt)
export interface BalanceHoldingData {
  balance: string;
}

// Currency symbols for display
const currencySymbols: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

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

// Check-in save request body
interface CheckInSaveBody {
  month: string;
  super?: { holdingId: string; balance: string; employerContrib?: string; employeeContrib?: string }[];
  cash?: { holdingId: string; balance: string }[];
  debt?: { holdingId: string; balance: string }[];
}

// Save check-in data
async function saveCheckIn(body: CheckInSaveBody): Promise<{
  success: boolean;
  snapshotsCreated: number;
  contributionsCreated: number;
}> {
  const response = await fetch("/api/check-in/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to save check-in");
  }

  return response.json();
}

// Props for SuperHoldingEntry component
interface SuperHoldingEntryProps {
  holding: HoldingToUpdate;
  data: SuperHoldingData;
  onDataChange: (holdingId: string, data: SuperHoldingData) => void;
  error?: string;
}

// Props for cash holding entry component
interface CashHoldingEntryProps {
  holding: HoldingToUpdate;
  data: BalanceHoldingData;
  onDataChange: (holdingId: string, data: BalanceHoldingData) => void;
  error?: string;
}

// Cash holding entry component with balance input
function CashHoldingEntry({
  holding,
  data,
  onDataChange,
  error,
}: CashHoldingEntryProps) {
  const currencySymbol = currencySymbols[holding.currency] || holding.currency;

  const handleBalanceChange = (value: string) => {
    onDataChange(holding.id, { balance: value });
  };

  return (
    <div className={`p-3 rounded-lg bg-gray-800 border ${error ? "border-red-500" : "border-gray-700"}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {holding.currency}
            </span>
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-gray-900 text-white text-right ${error ? "border-red-500" : "border-gray-600"}`}
            step="0.01"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}

// Props for debt holding entry component
interface DebtHoldingEntryProps {
  holding: HoldingToUpdate;
  data: BalanceHoldingData;
  onDataChange: (holdingId: string, data: BalanceHoldingData) => void;
  error?: string;
}

// Debt holding entry component with balance input (displayed and stored as positive)
function DebtHoldingEntry({
  holding,
  data,
  onDataChange,
  error,
}: DebtHoldingEntryProps) {
  const currencySymbol = currencySymbols[holding.currency] || holding.currency;

  const handleBalanceChange = (value: string) => {
    onDataChange(holding.id, { balance: value });
  };

  return (
    <div className={`p-3 rounded-lg bg-gray-800 border ${error ? "border-red-500" : "border-gray-700"}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {holding.currency}
            </span>
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-gray-900 text-white text-right ${error ? "border-red-500" : "border-gray-600"}`}
            step="0.01"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}

// Super holding entry component with balance input and optional contributions
function SuperHoldingEntry({
  holding,
  data,
  onDataChange,
  error,
}: SuperHoldingEntryProps) {
  const currencySymbol = currencySymbols[holding.currency] || holding.currency;

  const handleBalanceChange = (value: string) => {
    onDataChange(holding.id, { ...data, balance: value });
  };

  const handleEmployerContribChange = (value: string) => {
    onDataChange(holding.id, { ...data, employerContrib: value });
  };

  const handleEmployeeContribChange = (value: string) => {
    onDataChange(holding.id, { ...data, employeeContrib: value });
  };

  const toggleContributions = () => {
    onDataChange(holding.id, {
      ...data,
      showContributions: !data.showContributions,
    });
  };

  return (
    <div className={`p-3 rounded-lg bg-gray-800 border ${error ? "border-red-500" : "border-gray-700"} space-y-3`}>
      {/* Holding name and balance input row */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {holding.currency}
            </span>
            {holding.isDormant && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                Dormant
              </span>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-gray-900 text-white text-right ${error ? "border-red-500" : "border-gray-600"}`}
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Contributions section - only for non-dormant super */}
      {!holding.isDormant && (
        <>
          <button
            type="button"
            onClick={toggleContributions}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {data.showContributions ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {data.showContributions
              ? "Hide Contributions"
              : "Add Contributions"}
          </button>

          {data.showContributions && (
            <div className="pl-4 space-y-3 border-l-2 border-gray-700">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">
                  Employer Contribution
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={data.employerContrib}
                    onChange={(e) => handleEmployerContribChange(e.target.value)}
                    className="w-28 bg-gray-900 border-gray-600 text-white text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">
                  Employee Contribution
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={data.employeeContrib}
                    onChange={(e) => handleEmployeeContribChange(e.target.value)}
                    className="w-28 bg-gray-900 border-gray-600 text-white text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CheckInModal({ open, onOpenChange }: CheckInModalProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const queryClient = useQueryClient();

  // Month selector: current or previous month
  const currentMonth = getFirstOfMonth(new Date());
  const previousMonth = getFirstOfPreviousMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Track which holdings have been "updated" (filled in) in this session
  const [updatedHoldingIds, setUpdatedHoldingIds] = useState<Set<string>>(
    new Set()
  );

  // Validation errors for inline display
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // State for super holdings data
  const [superHoldingsData, setSuperHoldingsData] = useState<
    Record<string, SuperHoldingData>
  >({});

  // State for cash holdings data
  const [cashHoldingsData, setCashHoldingsData] = useState<
    Record<string, BalanceHoldingData>
  >({});

  // State for debt holdings data
  const [debtHoldingsData, setDebtHoldingsData] = useState<
    Record<string, BalanceHoldingData>
  >({});

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
      setSuperHoldingsData({});
      setCashHoldingsData({});
      setDebtHoldingsData({});
      setValidationErrors({});
    }
    onOpenChange(newOpen);
  };

  // Handler for updating super holding data
  const handleSuperHoldingDataChange = (
    holdingId: string,
    newData: SuperHoldingData
  ) => {
    setSuperHoldingsData((prev) => ({
      ...prev,
      [holdingId]: newData,
    }));

    // Mark as updated if balance is entered
    if (newData.balance && newData.balance.trim() !== "") {
      setUpdatedHoldingIds((prev) => new Set([...prev, holdingId]));
    } else {
      setUpdatedHoldingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(holdingId);
        return newSet;
      });
    }
  };

  // Get or initialize super holding data
  const getSuperHoldingData = (holdingId: string): SuperHoldingData => {
    return (
      superHoldingsData[holdingId] || {
        balance: "",
        employerContrib: "",
        employeeContrib: "",
        showContributions: false,
      }
    );
  };

  // Handler for updating cash holding data
  const handleCashHoldingDataChange = (
    holdingId: string,
    newData: BalanceHoldingData
  ) => {
    setCashHoldingsData((prev) => ({
      ...prev,
      [holdingId]: newData,
    }));

    // Mark as updated if balance is entered
    if (newData.balance && newData.balance.trim() !== "") {
      setUpdatedHoldingIds((prev) => new Set([...prev, holdingId]));
    } else {
      setUpdatedHoldingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(holdingId);
        return newSet;
      });
    }
  };

  // Get or initialize cash holding data
  const getCashHoldingData = (holdingId: string): BalanceHoldingData => {
    return cashHoldingsData[holdingId] || { balance: "" };
  };

  // Handler for updating debt holding data
  const handleDebtHoldingDataChange = (
    holdingId: string,
    newData: BalanceHoldingData
  ) => {
    setDebtHoldingsData((prev) => ({
      ...prev,
      [holdingId]: newData,
    }));

    // Mark as updated if balance is entered
    if (newData.balance && newData.balance.trim() !== "") {
      setUpdatedHoldingIds((prev) => new Set([...prev, holdingId]));
    } else {
      setUpdatedHoldingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(holdingId);
        return newSet;
      });
    }
  };

  // Get or initialize debt holding data
  const getDebtHoldingData = (holdingId: string): BalanceHoldingData => {
    return debtHoldingsData[holdingId] || { balance: "" };
  };

  // Handle month change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // Reset updated holdings and data when month changes
    setUpdatedHoldingIds(new Set());
    setSuperHoldingsData({});
    setCashHoldingsData({});
    setDebtHoldingsData({});
    setValidationErrors({});
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: saveCheckIn,
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["check-in-holdings"] });
      queryClient.invalidateQueries({ queryKey: ["check-in-status"] });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });

      // Show success toast
      const count = result.snapshotsCreated;
      toast.success(
        `Check-in complete! ${count} snapshot${count !== 1 ? "s" : ""} saved.`
      );

      // Close modal
      handleOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save check-in");
    },
  });

  // Validate all entries and save
  const handleSaveAll = () => {
    const errors: Record<string, string> = {};

    // Validate all holdings have balances
    for (const holding of data?.holdings || []) {
      if (holding.type === "super") {
        const entryData = getSuperHoldingData(holding.id);
        if (!entryData.balance || entryData.balance.trim() === "") {
          errors[holding.id] = "Balance is required";
        }
      } else if (holding.type === "cash") {
        const entryData = getCashHoldingData(holding.id);
        if (!entryData.balance || entryData.balance.trim() === "") {
          errors[holding.id] = "Balance is required";
        }
      } else if (holding.type === "debt") {
        const entryData = getDebtHoldingData(holding.id);
        if (!entryData.balance || entryData.balance.trim() === "") {
          errors[holding.id] = "Balance is required";
        }
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required balances");
      return;
    }

    // Build the save request body
    const body: CheckInSaveBody = {
      month: selectedMonth,
    };

    // Collect super entries
    const superEntries = (data?.holdings || [])
      .filter((h) => h.type === "super")
      .map((h) => {
        const entryData = getSuperHoldingData(h.id);
        return {
          holdingId: h.id,
          balance: entryData.balance,
          employerContrib: entryData.employerContrib || undefined,
          employeeContrib: entryData.employeeContrib || undefined,
        };
      });

    if (superEntries.length > 0) {
      body.super = superEntries;
    }

    // Collect cash entries
    const cashEntries = (data?.holdings || [])
      .filter((h) => h.type === "cash")
      .map((h) => ({
        holdingId: h.id,
        balance: getCashHoldingData(h.id).balance,
      }));

    if (cashEntries.length > 0) {
      body.cash = cashEntries;
    }

    // Collect debt entries
    const debtEntries = (data?.holdings || [])
      .filter((h) => h.type === "debt")
      .map((h) => ({
        holdingId: h.id,
        balance: getDebtHoldingData(h.id).balance,
      }));

    if (debtEntries.length > 0) {
      body.debt = debtEntries;
    }

    // Execute the mutation
    saveMutation.mutate(body);
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
                  {/* Debt section explanatory text */}
                  {type === "debt" && (
                    <p className="text-sm text-gray-400">
                      Enter as positive number (e.g., 5000 for $5,000 owed)
                    </p>
                  )}
                  <div className="space-y-2">
                    {holdings.map((holding) => {
                      // Render SuperHoldingEntry for super type
                      if (type === "super") {
                        return (
                          <SuperHoldingEntry
                            key={holding.id}
                            holding={holding}
                            data={getSuperHoldingData(holding.id)}
                            onDataChange={handleSuperHoldingDataChange}
                            error={validationErrors[holding.id]}
                          />
                        );
                      }

                      // Render CashHoldingEntry for cash type
                      if (type === "cash") {
                        return (
                          <CashHoldingEntry
                            key={holding.id}
                            holding={holding}
                            data={getCashHoldingData(holding.id)}
                            onDataChange={handleCashHoldingDataChange}
                            error={validationErrors[holding.id]}
                          />
                        );
                      }

                      // Render DebtHoldingEntry for debt type
                      if (type === "debt") {
                        return (
                          <DebtHoldingEntry
                            key={holding.id}
                            holding={holding}
                            data={getDebtHoldingData(holding.id)}
                            onDataChange={handleDebtHoldingDataChange}
                            error={validationErrors[holding.id]}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with Skip and Save All Buttons */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={saveMutation.isPending}
          >
            Skip
          </Button>
          {totalHoldings > 0 && (
            <Button
              onClick={handleSaveAll}
              disabled={saveMutation.isPending || updatedCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save All"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
