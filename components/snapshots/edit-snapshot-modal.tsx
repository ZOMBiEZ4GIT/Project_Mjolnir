"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

// Currency symbols for display
const currencySymbols: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

// Format date as "Month Year" (e.g., "January 2026")
function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

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

// Contribution data from API
interface Contribution {
  id: string;
  holdingId: string;
  date: string;
  employerContrib: string;
  employeeContrib: string;
  notes: string | null;
  holdingName: string;
}

interface EditSnapshotModalProps {
  snapshot: SnapshotWithHolding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fetch contribution for a specific holding and date
async function fetchContribution(
  holdingId: string,
  date: string
): Promise<Contribution | null> {
  const response = await fetch(`/api/contributions?holding_id=${holdingId}`);
  if (!response.ok) {
    return null;
  }
  const contributions: Contribution[] = await response.json();
  // Find contribution for the same date
  return contributions.find((c) => c.date === date) || null;
}

// Update snapshot
async function updateSnapshot(
  id: string,
  data: { balance: string; notes?: string }
): Promise<SnapshotWithHolding> {
  const response = await fetch(`/api/snapshots/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update snapshot");
  }

  return response.json();
}

// Update contribution
async function updateContribution(
  id: string,
  data: { employer_contribution: string; employee_contribution: string }
): Promise<Contribution> {
  const response = await fetch(`/api/contributions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update contribution");
  }

  return response.json();
}

// Create contribution
async function createContribution(data: {
  holding_id: string;
  date: string;
  employer_contribution: string;
  employee_contribution: string;
}): Promise<Contribution> {
  const response = await fetch("/api/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create contribution");
  }

  return response.json();
}

export function EditSnapshotModal({
  snapshot,
  open,
  onOpenChange,
}: EditSnapshotModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [showContributions, setShowContributions] = useState(false);
  const [employerContrib, setEmployerContrib] = useState("");
  const [employeeContrib, setEmployeeContrib] = useState("");

  // Form errors
  const [errors, setErrors] = useState<{
    balance?: string;
    employerContrib?: string;
    employeeContrib?: string;
  }>({});

  // Fetch contribution if this is a super holding
  const { data: contribution, isLoading: isLoadingContribution } = useQuery({
    queryKey: ["contribution", snapshot?.holdingId, snapshot?.date],
    queryFn: () => fetchContribution(snapshot!.holdingId, snapshot!.date),
    enabled: open && snapshot?.holdingType === "super",
  });

  // Initialize form state when snapshot or contribution changes
  useEffect(() => {
    if (snapshot) {
      setBalance(snapshot.balance);
      setNotes(snapshot.notes || "");
      setErrors({});
    }
  }, [snapshot]);

  useEffect(() => {
    if (contribution) {
      setEmployerContrib(contribution.employerContrib || "");
      setEmployeeContrib(contribution.employeeContrib || "");
      setShowContributions(true);
    } else {
      setEmployerContrib("");
      setEmployeeContrib("");
      setShowContributions(false);
    }
  }, [contribution]);

  // Snapshot update mutation
  const updateSnapshotMutation = useMutation({
    mutationFn: (data: { balance: string; notes?: string }) =>
      updateSnapshot(snapshot!.id, data),
  });

  // Contribution update mutation
  const updateContributionMutation = useMutation({
    mutationFn: (data: { employer_contribution: string; employee_contribution: string }) =>
      updateContribution(contribution!.id, data),
  });

  // Contribution create mutation
  const createContributionMutation = useMutation({
    mutationFn: (data: {
      holding_id: string;
      date: string;
      employer_contribution: string;
      employee_contribution: string;
    }) => createContribution(data),
  });

  const handleSave = async () => {
    if (!snapshot) return;

    // Validate form
    const newErrors: typeof errors = {};

    // Validate balance
    const balanceNum = parseFloat(balance);
    if (!balance || isNaN(balanceNum)) {
      newErrors.balance = "Balance is required";
    } else if (balanceNum < 0 && snapshot.holdingType !== "debt") {
      newErrors.balance = "Balance must be non-negative";
    }

    // Validate contributions if shown
    if (showContributions) {
      if (employerContrib) {
        const empNum = parseFloat(employerContrib);
        if (isNaN(empNum) || empNum < 0) {
          newErrors.employerContrib = "Must be a non-negative number";
        }
      }
      if (employeeContrib) {
        const eeNum = parseFloat(employeeContrib);
        if (isNaN(eeNum) || eeNum < 0) {
          newErrors.employeeContrib = "Must be a non-negative number";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Update snapshot
      await updateSnapshotMutation.mutateAsync({
        balance,
        notes: notes || undefined,
      });

      // Handle contributions for super holdings
      if (snapshot.holdingType === "super" && showContributions) {
        const hasContribValues =
          (employerContrib && employerContrib !== "0") ||
          (employeeContrib && employeeContrib !== "0");

        if (hasContribValues) {
          if (contribution) {
            // Update existing contribution
            await updateContributionMutation.mutateAsync({
              employer_contribution: employerContrib || "0",
              employee_contribution: employeeContrib || "0",
            });
          } else {
            // Create new contribution
            await createContributionMutation.mutateAsync({
              holding_id: snapshot.holdingId,
              date: snapshot.date,
              employer_contribution: employerContrib || "0",
              employee_contribution: employeeContrib || "0",
            });
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["contribution"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });

      toast.success("Snapshot updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    }
  };

  const isPending =
    updateSnapshotMutation.isPending ||
    updateContributionMutation.isPending ||
    createContributionMutation.isPending;

  if (!snapshot) return null;

  const currencySymbol = currencySymbols[snapshot.currency] || snapshot.currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Snapshot</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the balance and notes for this snapshot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only holding and date info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Holding</span>
              <span className="text-foreground font-medium">
                {snapshot.holdingName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">{formatMonthYear(snapshot.date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="text-muted-foreground capitalize">
                {snapshot.holdingType}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {/* Balance input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Balance
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                <Input
                  type="number"
                  value={balance}
                  onChange={(e) => {
                    setBalance(e.target.value);
                    if (errors.balance) setErrors({ ...errors, balance: undefined });
                  }}
                  className={`bg-card border-border text-foreground text-right ${
                    errors.balance ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  step="0.01"
                  min="0"
                />
              </div>
              {errors.balance && (
                <p className="text-sm text-destructive">{errors.balance}</p>
              )}
            </div>

            {/* Notes input */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-card border-border text-foreground resize-none"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {/* Contributions section for super holdings */}
            {snapshot.holdingType === "super" && (
              <div className="mt-4 pt-4 border-t border-border">
                {isLoadingContribution ? (
                  <div className="text-sm text-muted-foreground">
                    Loading contributions...
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowContributions(!showContributions)}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      {showContributions ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {contribution
                        ? showContributions
                          ? "Hide Contributions"
                          : "Edit Contributions"
                        : showContributions
                          ? "Hide Contributions"
                          : "Add Contributions"}
                    </button>

                    {showContributions && (
                      <div className="mt-3 pl-4 space-y-3 border-l-2 border-border">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-muted-foreground">
                              Employer Contribution
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {currencySymbol}
                              </span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={employerContrib}
                                onChange={(e) => {
                                  setEmployerContrib(e.target.value);
                                  if (errors.employerContrib) setErrors({ ...errors, employerContrib: undefined });
                                }}
                                className={`w-28 bg-card border-border text-foreground text-right ${
                                  errors.employerContrib ? "border-destructive focus-visible:ring-destructive" : ""
                                }`}
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                          {errors.employerContrib && (
                            <p className="text-xs text-destructive text-right">{errors.employerContrib}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-muted-foreground">
                              Employee Contribution
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {currencySymbol}
                              </span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={employeeContrib}
                                onChange={(e) => {
                                  setEmployeeContrib(e.target.value);
                                  if (errors.employeeContrib) setErrors({ ...errors, employeeContrib: undefined });
                                }}
                                className={`w-28 bg-card border-border text-foreground text-right ${
                                  errors.employeeContrib ? "border-destructive focus-visible:ring-destructive" : ""
                                }`}
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                          {errors.employeeContrib && (
                            <p className="text-xs text-destructive text-right">{errors.employeeContrib}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Cancel and Save buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-muted"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !balance}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
