"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Wallet,
  CreditCard,
  AlertTriangle,
  Check,
} from "lucide-react";
import { CheckinStepper } from "@/components/check-in/checkin-stepper";
import { MonthSelector } from "@/components/check-in/month-selector";

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

// Latest contributions data from API
interface LatestContributions {
  [holdingId: string]: {
    employerContrib: string;
    employeeContrib: string;
  };
}

// Previous balances keyed by holding ID
interface PreviousBalances {
  [holdingId: string]: string;
}

// Fetch holdings needing updates for a specific month
async function fetchHoldingsForMonth(month: string): Promise<{
  holdings: HoldingToUpdate[];
  currentMonth: string;
  latestContributions: LatestContributions;
  previousBalances: PreviousBalances;
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

// Type icons for display
const typeIcons: Record<string, typeof Landmark> = {
  super: Landmark,
  cash: Wallet,
  debt: CreditCard,
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
    <div className={`p-3 rounded-lg bg-card border ${error ? "border-destructive" : "border-border"}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {holding.currency}
            </span>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-background text-foreground text-right ${error ? "border-destructive" : "border-border"}`}
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
    <div className={`p-3 rounded-lg bg-card border ${error ? "border-destructive" : "border-border"}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {holding.currency}
            </span>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-background text-foreground text-right ${error ? "border-destructive" : "border-border"}`}
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
  const reducedMotion = useReducedMotion();

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
    <div className={`p-3 rounded-lg bg-card border ${error ? "border-destructive" : "border-border"} space-y-3`}>
      {/* Holding name and balance input row */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-foreground font-medium">{holding.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {holding.currency}
            </span>
            {holding.isDormant && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Dormant
              </span>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{currencySymbol}</span>
          <Input
            type="number"
            placeholder="Balance"
            value={data.balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className={`w-32 bg-background text-foreground text-right ${error ? "border-destructive" : "border-border"}`}
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
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
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

          <AnimatePresence initial={false}>
            {data.showContributions && (
              <motion.div
                key="contributions"
                initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="pl-4 space-y-3 border-l-2 border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">
                      Employer Contribution
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={data.employerContrib}
                        onChange={(e) => handleEmployerContribChange(e.target.value)}
                        className="w-28 bg-background border-border text-foreground text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">
                      Employee Contribution
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={data.employeeContrib}
                        onChange={(e) => handleEmployeeContribChange(e.target.value)}
                        className="w-28 bg-background border-border text-foreground text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// Format currency amount for review display
function formatCurrency(amount: string, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  const num = parseFloat(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CheckInModal({ open, onOpenChange }: CheckInModalProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const queryClient = useQueryClient();

  // Wizard step: 0 = Select Month, 1 = Update Holdings, 2 = Review & Save
  const [currentStep, setCurrentStep] = useState(0);
  // Direction: 1 = forward (slide left), -1 = backward (slide right)
  const [direction, setDirection] = useState(1);
  const reducedMotion = useReducedMotion();

  // Error shake state for validation
  const [shakeStep2, setShakeStep2] = useState(false);
  const step2Ref = useRef<HTMLDivElement>(null);

  // Success state after save
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    snapshotsCreated: number;
    contributionsCreated: number;
  } | null>(null);

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

  // Pre-populate super holdings with previous contribution values
  useEffect(() => {
    if (!data?.latestContributions || !data?.holdings) return;

    const contribs = data.latestContributions;
    const superHoldings = data.holdings.filter(
      (h) => h.type === "super" && !h.isDormant
    );

    const initialData: Record<string, SuperHoldingData> = {};
    for (const holding of superHoldings) {
      const prev = contribs[holding.id];
      if (prev) {
        const employer = parseFloat(prev.employerContrib);
        const employee = parseFloat(prev.employeeContrib);
        if (employer > 0 || employee > 0) {
          initialData[holding.id] = {
            balance: "",
            employerContrib: prev.employerContrib,
            employeeContrib: prev.employeeContrib,
            showContributions: true,
          };
        }
      }
    }

    if (Object.keys(initialData).length > 0) {
      setSuperHoldingsData((prev) => {
        // Only set initial data for holdings not already modified by user
        const merged = { ...initialData };
        for (const [id, val] of Object.entries(prev)) {
          if (val.balance || val.employerContrib || val.employeeContrib) {
            merged[id] = val;
          }
        }
        return merged;
      });
    }
  }, [data?.latestContributions, data?.holdings]);

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
      // Invalidate net-worth queries on close (covers both success and cancel)
      if (showSuccess) {
        queryClient.invalidateQueries({ queryKey: ["net-worth"] });
        queryClient.invalidateQueries({ queryKey: ["net-worth-history"] });
      }
      // Reset on close
      setCurrentStep(0);
      setDirection(1);
      setUpdatedHoldingIds(new Set());
      setSelectedMonth(currentMonth);
      setSuperHoldingsData({});
      setCashHoldingsData({});
      setDebtHoldingsData({});
      setValidationErrors({});
      setShakeStep2(false);
      setShowSuccess(false);
      setSaveResult(null);
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

  // Handle month change (from MonthSelector on Step 1)
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // Reset updated holdings and data when month changes
    setUpdatedHoldingIds(new Set());
    setSuperHoldingsData({});
    setCashHoldingsData({});
    setDebtHoldingsData({});
    setValidationErrors({});
  };

  // Validate all balances are filled (for Step 2 Continue)
  const validateBalances = (): boolean => {
    const errors: Record<string, string> = {};

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
    return Object.keys(errors).length === 0;
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep === 1) {
      // Validate before moving to review
      if (!validateBalances()) {
        // Trigger shake animation
        setShakeStep2(true);
        setTimeout(() => setShakeStep2(false), 500);
        toast.error("Please fill in all required balances");

        // Focus first empty balance input
        if (step2Ref.current) {
          const firstErrorInput = step2Ref.current.querySelector(
            ".border-destructive input"
          ) as HTMLInputElement | null;
          firstErrorInput?.focus();
        }
        return;
      }
    }
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const goToPreviousStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
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

      // Show success summary instead of closing
      setSaveResult(result);
      setShowSuccess(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save check-in");
    },
  });

  // Build save body and execute
  const handleSaveAll = () => {
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

  // Directional slide variants for step transitions
  const stepVariants = {
    enter: (d: number) =>
      reducedMotion ? {} : { x: `${100 * d}%`, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (d: number) =>
      reducedMotion ? {} : { x: `${-100 * d}%`, opacity: 0 },
  };

  const stepTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeInOut" as const };

  // Step descriptions for the header
  const stepDescriptions = [
    "Choose which month to log balances for",
    "Enter current balances for your holdings",
    "Review your entries before saving",
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">Monthly Check-in</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {showSuccess
              ? "Your balances have been saved successfully"
              : stepDescriptions[currentStep]}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper - show all complete when success */}
        <div className="py-2">
          <CheckinStepper currentStep={showSuccess ? 3 : currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[200px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Select Month */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <MonthSelector
                  currentMonth={currentMonth}
                  previousMonth={previousMonth}
                  selectedMonth={selectedMonth}
                  onSelectMonth={handleMonthChange}
                />

                {/* Holdings info */}
                {isLoading && (
                  <div className="py-4 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading holdings...
                  </div>
                )}

                {error && (
                  <div className="py-4 text-center text-destructive">
                    Failed to load holdings. Please try again.
                  </div>
                )}

                {!isLoading && !error && totalHoldings === 0 && (
                  <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
                    <p className="text-muted-foreground">
                      All holdings are up to date for {formatMonthYear(selectedMonth)}!
                    </p>
                  </div>
                )}

                {!isLoading && !error && totalHoldings > 0 && (
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{totalHoldings} holding{totalHoldings !== 1 ? "s" : ""}</span>
                      {" "}need updating for {formatMonthYear(selectedMonth)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {typeOrder.map((type) => {
                        const count = groupedHoldings[type]?.length ?? 0;
                        if (count === 0) return null;
                        const Icon = typeIcons[type];
                        return (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {Icon && <Icon className="h-3 w-3" />}
                            {count} {typeLabels[type] || type}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Update Holdings */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
              >
                <div
                  ref={step2Ref}
                  className={`space-y-6 ${shakeStep2 ? "animate-shake" : ""}`}
                >
                  {/* Progress Indicator */}
                  {totalHoldings > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {updatedCount} of {totalHoldings} holding
                      {totalHoldings !== 1 ? "s" : ""} updated
                    </div>
                  )}

                  {/* Loading State */}
                  {isLoading && (
                    <div className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading holdings...
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="py-8 text-center text-destructive">
                      Failed to load holdings. Please try again.
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
                            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                              {typeLabels[type] || type}
                            </h3>
                            {/* Debt section explanatory text */}
                            {type === "debt" && (
                              <p className="text-sm text-muted-foreground">
                                Enter as positive number (e.g., 5000 for $5,000 owed)
                              </p>
                            )}
                            <div className="space-y-2">
                              {holdings.map((holding) => {
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
                </div>
              </motion.div>
            )}

            {/* Step 3: Review & Save / Success Summary */}
            {currentStep === 2 && (
              <motion.div
                key={showSuccess ? "step-2-success" : "step-2"}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                {showSuccess && saveResult ? (
                  /* Success Summary */
                  <div className="space-y-6">
                    {/* Checkmark animation */}
                    <div className="flex flex-col items-center py-4">
                      <motion.div
                        initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-positive/20 mb-4"
                      >
                        <motion.div
                          initial={reducedMotion ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                        >
                          <Check className="h-8 w-8 text-positive" />
                        </motion.div>
                      </motion.div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Check-in Complete!
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {saveResult.snapshotsCreated} snapshot{saveResult.snapshotsCreated !== 1 ? "s" : ""} saved for {formatMonthYear(selectedMonth)}
                      </p>
                    </div>

                    {/* Brief list of what was saved */}
                    <div className="space-y-1.5">
                      {(data?.holdings || []).map((holding) => {
                        let balance = "";
                        if (holding.type === "super") {
                          balance = getSuperHoldingData(holding.id).balance;
                        } else if (holding.type === "cash") {
                          balance = getCashHoldingData(holding.id).balance;
                        } else if (holding.type === "debt") {
                          balance = getDebtHoldingData(holding.id).balance;
                        }

                        const Icon = typeIcons[holding.type];

                        return (
                          <div
                            key={holding.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <span className="text-sm text-foreground truncate">
                                {holding.name}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground shrink-0 ml-3">
                              {formatCurrency(balance, holding.currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Net worth change indicator */}
                    {(() => {
                      // Calculate total change across all holdings (approximate, same-currency only)
                      let totalChange = 0;
                      let hasAnyChange = false;

                      for (const holding of data?.holdings || []) {
                        const prevBalance = data?.previousBalances?.[holding.id];
                        if (!prevBalance) continue;

                        let balance = "";
                        if (holding.type === "super") {
                          balance = getSuperHoldingData(holding.id).balance;
                        } else if (holding.type === "cash") {
                          balance = getCashHoldingData(holding.id).balance;
                        } else if (holding.type === "debt") {
                          balance = getDebtHoldingData(holding.id).balance;
                        }

                        const newNum = parseFloat(balance);
                        const prevNum = parseFloat(prevBalance);
                        if (isNaN(newNum) || isNaN(prevNum)) continue;

                        // For debt, a decrease improves net worth
                        const change = holding.type === "debt"
                          ? -(newNum - prevNum)
                          : newNum - prevNum;
                        totalChange += change;
                        hasAnyChange = true;
                      }

                      if (!hasAnyChange || totalChange === 0) return null;

                      const isPositive = totalChange > 0;

                      return (
                        <div className={`rounded-lg border p-3 text-center ${
                          isPositive
                            ? "border-positive/30 bg-positive/5"
                            : "border-destructive/30 bg-destructive/5"
                        }`}>
                          <p className="text-xs text-muted-foreground mb-1">
                            Estimated net worth change
                          </p>
                          <p className={`text-sm font-medium ${
                            isPositive ? "text-positive" : "text-destructive"
                          }`}>
                            {isPositive ? (
                              <ArrowUpRight className="inline h-4 w-4 mr-1" />
                            ) : (
                              <ArrowDownRight className="inline h-4 w-4 mr-1" />
                            )}
                            {isPositive ? "+" : ""}
                            {formatCurrency(String(totalChange), "AUD")}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Review entries */
                  <>
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        Saving snapshots for <span className="text-foreground font-medium">{formatMonthYear(selectedMonth)}</span>
                      </p>
                    </div>

                    {/* Review entries grouped by type */}
                    {typeOrder.map((type) => {
                      const holdings = groupedHoldings[type];
                      if (!holdings || holdings.length === 0) return null;

                      const Icon = typeIcons[type];

                      return (
                        <div key={type} className="space-y-2">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                            {typeLabels[type] || type}
                          </h3>
                          <div className="space-y-1.5">
                            {holdings.map((holding) => {
                              let balance = "";
                              let employerContrib = "";
                              let employeeContrib = "";

                              if (type === "super") {
                                const d = getSuperHoldingData(holding.id);
                                balance = d.balance;
                                employerContrib = d.employerContrib;
                                employeeContrib = d.employeeContrib;
                              } else if (type === "cash") {
                                balance = getCashHoldingData(holding.id).balance;
                              } else if (type === "debt") {
                                balance = getDebtHoldingData(holding.id).balance;
                              }

                              const prevBalance = data?.previousBalances?.[holding.id];
                              const newNum = parseFloat(balance);
                              const prevNum = prevBalance ? parseFloat(prevBalance) : null;
                              const hasPrevious = prevNum !== null && !isNaN(prevNum);
                              const changeAmount = hasPrevious ? newNum - prevNum : null;

                              // For debt: decrease is positive (green), increase is negative (red)
                              const isDebt = type === "debt";
                              const isPositiveChange = changeAmount !== null
                                ? (isDebt ? changeAmount < 0 : changeAmount > 0)
                                : false;
                              const isNegativeChange = changeAmount !== null
                                ? (isDebt ? changeAmount > 0 : changeAmount < 0)
                                : false;

                              // Large change warning: >50% change from previous
                              const percentChange = hasPrevious && prevNum !== 0
                                ? Math.abs((newNum - prevNum) / prevNum) * 100
                                : 0;
                              const isLargeChange = hasPrevious && percentChange > 50;

                              return (
                                <div
                                  key={holding.id}
                                  className={`rounded-lg border bg-card p-3 ${
                                    isLargeChange ? "border-yellow-500/40" : "border-border"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-foreground">
                                        {holding.name}
                                      </span>

                                      {/* Previous balance */}
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {hasPrevious
                                          ? `Previous: ${formatCurrency(prevBalance!, holding.currency)}`
                                          : "First entry"}
                                      </div>

                                      {/* Contributions for super */}
                                      {type === "super" && (employerContrib || employeeContrib) && (
                                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                                          {employerContrib && (
                                            <span>Employer: {formatCurrency(employerContrib, holding.currency)}</span>
                                          )}
                                          {employeeContrib && (
                                            <span>Employee: {formatCurrency(employeeContrib, holding.currency)}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-right shrink-0">
                                      {/* New balance */}
                                      <span className="text-sm font-medium text-foreground">
                                        {formatCurrency(balance, holding.currency)}
                                      </span>

                                      {/* Change amount with direction arrow */}
                                      {changeAmount !== null && changeAmount !== 0 && (
                                        <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                                          isPositiveChange ? "text-positive" : isNegativeChange ? "text-destructive" : "text-muted-foreground"
                                        }`}>
                                          {isPositiveChange ? (
                                            <ArrowUpRight className="h-3 w-3" />
                                          ) : isNegativeChange ? (
                                            <ArrowDownRight className="h-3 w-3" />
                                          ) : null}
                                          <span>
                                            {changeAmount > 0 ? "+" : ""}
                                            {formatCurrency(String(changeAmount), holding.currency)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Large change warning */}
                                  {isLargeChange && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-500">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Large change detected ({Math.round(percentChange)}%)</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-border">
          {showSuccess ? (
            /* Success state: Done button only */
            <div className="flex w-full justify-end">
              <Button
                onClick={() => handleOpenChange(false)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Done
              </Button>
            </div>
          ) : (
            /* Normal navigation */
            <>
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    className="border-border text-foreground hover:bg-muted"
                    disabled={saveMutation.isPending}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {currentStep === 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Cancel
                  </Button>
                )}
                {currentStep === 0 && (
                  <Button
                    onClick={goToNextStep}
                    disabled={isLoading || !!error || totalHoldings === 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    onClick={goToNextStep}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {currentStep === 2 && (
                  <Button
                    onClick={handleSaveAll}
                    disabled={saveMutation.isPending}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
