"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogTitle,
  AnimatedDialogDescription,
  AnimatedDialogFooter,
} from "@/components/ui/animated-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormTextareaField } from "@/components/ui/form-textarea-field";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useFormShake } from "@/hooks/use-form-shake";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

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

// Zod schema — balance required, notes optional, contributions optional non-negative
const editSnapshotSchema = z.object({
  balance: z.coerce.number({ error: "Balance is required" }),
  notes: z.string().optional().default(""),
  employerContrib: z.coerce
    .number()
    .min(0, "Must be a non-negative number")
    .optional()
    .default(0),
  employeeContrib: z.coerce
    .number()
    .min(0, "Must be a non-negative number")
    .optional()
    .default(0),
  // Hidden field to conditionally validate balance sign
  _holdingType: z.string().optional(),
}).superRefine((data, ctx) => {
  // Non-debt holdings must have non-negative balance
  if (data._holdingType !== "debt" && data.balance < 0) {
    ctx.addIssue({
      code: "custom",
      message: "Balance must be non-negative",
      path: ["balance"],
    });
  }
});

type FormValues = z.infer<typeof editSnapshotSchema>;

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
  const { formRef, triggerShake } = useFormShake();
  const [showContributions, setShowContributions] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(editSnapshotSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      balance: 0,
      notes: "",
      employerContrib: 0,
      employeeContrib: 0,
      _holdingType: "",
    },
  });

  // Fetch contribution if this is a super holding
  const { data: contribution, isLoading: isLoadingContribution } = useQuery({
    queryKey: snapshot?.holdingId && snapshot?.date
      ? queryKeys.contributions.single(snapshot.holdingId, snapshot.date)
      : ["contribution"],
    queryFn: () => fetchContribution(snapshot!.holdingId, snapshot!.date),
    enabled: open && snapshot?.holdingType === "super",
  });

  // Initialize form state when snapshot changes or dialog opens
  useEffect(() => {
    if (snapshot && open) {
      form.reset({
        balance: parseFloat(snapshot.balance) || 0,
        notes: snapshot.notes || "",
        employerContrib: 0,
        employeeContrib: 0,
        _holdingType: snapshot.holdingType,
      });
    }
  }, [snapshot, open, form]);

  // Populate contribution data when loaded
  useEffect(() => {
    if (contribution) {
      form.setValue("employerContrib", parseFloat(contribution.employerContrib) || 0);
      form.setValue("employeeContrib", parseFloat(contribution.employeeContrib) || 0);
      setShowContributions(true);
    } else {
      form.setValue("employerContrib", 0);
      form.setValue("employeeContrib", 0);
      setShowContributions(false);
    }
  }, [contribution, form]);

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

  const onValid = async (data: FormValues) => {
    if (!snapshot) return;

    try {
      // Update snapshot
      await updateSnapshotMutation.mutateAsync({
        balance: String(data.balance),
        notes: data.notes || undefined,
      });

      // Handle contributions for super holdings
      if (snapshot.holdingType === "super" && showContributions) {
        const employer = data.employerContrib ?? 0;
        const employee = data.employeeContrib ?? 0;
        const hasContribValues = employer > 0 || employee > 0;

        if (hasContribValues) {
          if (contribution) {
            await updateContributionMutation.mutateAsync({
              employer_contribution: String(employer),
              employee_contribution: String(employee),
            });
          } else {
            await createContributionMutation.mutateAsync({
              holding_id: snapshot.holdingId,
              date: snapshot.date,
              employer_contribution: String(employer),
              employee_contribution: String(employee),
            });
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all });
      queryClient.invalidateQueries({ queryKey: ["contribution"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });

      showSuccess("Snapshot updated successfully");
      onOpenChange(false);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    }
  };

  const handleSubmit = form.handleSubmit(onValid, () => {
    triggerShake();
  });

  const isPending =
    updateSnapshotMutation.isPending ||
    updateContributionMutation.isPending ||
    createContributionMutation.isPending;

  if (!snapshot) return null;

  const currencySymbol = CURRENCY_SYMBOLS[snapshot.currency as keyof typeof CURRENCY_SYMBOLS] || snapshot.currency;

  return (
    <AnimatedDialog open={open} onOpenChange={onOpenChange}>
      <AnimatedDialogContent className="max-w-md">
        <AnimatedDialogHeader>
          <AnimatedDialogTitle>Edit Snapshot</AnimatedDialogTitle>
          <AnimatedDialogDescription>
            Update the balance and notes for this snapshot
          </AnimatedDialogDescription>
        </AnimatedDialogHeader>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit}>
            <div
              ref={formRef as React.RefObject<HTMLDivElement | null>}
              className="space-y-4 py-4"
            >
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
                <FormField<FormValues>
                  name="balance"
                  label={`Balance (${currencySymbol})`}
                  type="number"
                  placeholder="0.00"
                />

                {/* Notes input */}
                <FormTextareaField<FormValues>
                  name="notes"
                  label="Notes"
                  placeholder="Optional notes..."
                  rows={2}
                  className="mt-4"
                />

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
                            <FormField<FormValues>
                              name="employerContrib"
                              label={`Employer Contribution (${currencySymbol})`}
                              type="number"
                              placeholder="0.00"
                            />
                            <FormField<FormValues>
                              name="employeeContrib"
                              label={`Employee Contribution (${currencySymbol})`}
                              type="number"
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Cancel and Save buttons */}
            <AnimatedDialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
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
            </AnimatedDialogFooter>
          </form>
        </FormProvider>
      </AnimatedDialogContent>
    </AnimatedDialog>
  );
}
