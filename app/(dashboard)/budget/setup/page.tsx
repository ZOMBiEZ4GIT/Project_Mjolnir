"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  DollarSign,
  Check,
  AlertTriangle,
  Sparkles,
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  HelpCircle,
  Settings2,
} from "lucide-react";
import { CategoryManager } from "@/components/budget/CategoryManager";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaydayConfig {
  id: string;
  paydayDay: number;
  adjustForWeekends: boolean;
  incomeSourcePattern: string | null;
  currentPeriod: {
    startDate: string;
    endDate: string;
    daysInPeriod: number;
  };
}

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  colour: string;
  sortOrder: number;
  isIncome: boolean;
  isSystem: boolean;
}

interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  allocations: {
    categoryId: string;
    percentage?: number;
    fixedCents?: number;
  }[];
}

// ---------------------------------------------------------------------------
// Lucide icon lookup (matches seed-categories icon names)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  DollarSign,
  HelpCircle,
};

// ---------------------------------------------------------------------------
// Steps definition
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Payday", icon: Calendar },
  { label: "Income", icon: DollarSign },
  { label: "Budget", icon: Check },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchPaydayConfig(): Promise<PaydayConfig> {
  const res = await fetch("/api/budget/payday");
  if (!res.ok) throw new Error("Failed to fetch payday config");
  return res.json();
}

async function updatePaydayConfig(data: {
  paydayDay: number;
  adjustForWeekends: boolean;
}): Promise<PaydayConfig> {
  const res = await fetch("/api/budget/payday", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save payday config");
  return res.json();
}

async function fetchCategories(): Promise<BudgetCategory[]> {
  const res = await fetch("/api/budget/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function fetchTemplates(): Promise<BudgetTemplate[]> {
  const res = await fetch("/api/budget/templates");
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

async function createBudgetPeriod(data: {
  startDate: string;
  endDate: string;
  expectedIncomeCents: number;
  allocations: { categoryId: string; allocatedCents: number }[];
}) {
  const res = await fetch("/api/budget/periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create budget period");
  return res.json();
}

// ---------------------------------------------------------------------------
// Template helper (client-side version of applyTemplate)
// ---------------------------------------------------------------------------

function applyTemplateClient(
  template: BudgetTemplate,
  incomeCents: number
): Map<string, number> {
  const totalFixed = template.allocations.reduce(
    (sum, a) => sum + (a.fixedCents ?? 0),
    0
  );
  const remaining = Math.max(0, incomeCents - totalFixed);

  const result = new Map<string, number>();
  for (const alloc of template.allocations) {
    if (alloc.fixedCents !== undefined) {
      result.set(alloc.categoryId, alloc.fixedCents);
    } else {
      result.set(
        alloc.categoryId,
        Math.round((remaining * (alloc.percentage ?? 0)) / 100)
      );
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BudgetSetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuthSafe();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(0);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Step 1
  const [paydayDay, setPaydayDay] = useState<number | null>(null);
  const [adjustForWeekends, setAdjustForWeekends] = useState(true);

  // Step 2
  const [expectedIncome, setExpectedIncome] = useState("");

  // Step 3
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [allocations, setAllocations] = useState<Map<string, number>>(
    new Map()
  );

  // ---- Queries ---------------------------------------------------------

  const { data: paydayData, isLoading: isLoadingConfig } = useQuery({
    queryKey: queryKeys.budget.payday,
    queryFn: fetchPaydayConfig,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories } = useQuery({
    queryKey: queryKeys.budget.categories,
    queryFn: fetchCategories,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
  });

  const { data: templates } = useQuery({
    queryKey: queryKeys.budget.templates,
    queryFn: fetchTemplates,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 10,
  });

  // Sync payday config into local state on first load
  useEffect(() => {
    if (paydayData && paydayDay === null) {
      setPaydayDay(paydayData.paydayDay);
      setAdjustForWeekends(paydayData.adjustForWeekends);
    }
  }, [paydayData, paydayDay]);

  // ---- Mutations -------------------------------------------------------

  const paydayMutation = useMutation({
    mutationFn: updatePaydayConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.payday });
      toast.success("Payday settings saved");
      setCurrentStep(1);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const periodMutation = useMutation({
    mutationFn: createBudgetPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.periods.all,
      });
      toast.success("Budget created successfully!");
      router.push("/dashboard");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ---- Derived values --------------------------------------------------

  const effectivePaydayDay = paydayDay ?? 15;

  const incomeCents = useMemo(() => {
    const val = Math.round(parseFloat(expectedIncome) * 100);
    return isNaN(val) ? 0 : val;
  }, [expectedIncome]);

  const isValidIncome = incomeCents > 0;

  // Filter to spendable categories (no income, no uncategorised)
  const spendableCategories = useMemo(
    () =>
      (categories ?? []).filter((c) => !c.isIncome && c.id !== "uncategorised"),
    [categories]
  );

  const totalAllocated = useMemo(() => {
    let sum = 0;
    allocations.forEach((v) => (sum += v));
    return sum;
  }, [allocations]);

  const unallocatedCents = incomeCents - totalAllocated;
  const savingsPercentage =
    incomeCents > 0 ? ((unallocatedCents / incomeCents) * 100).toFixed(1) : "0";
  const isOverBudget = totalAllocated > incomeCents;

  // ---- Handlers --------------------------------------------------------

  function handleStep1Save() {
    paydayMutation.mutate({
      paydayDay: effectivePaydayDay,
      adjustForWeekends,
    });
  }

  function handleStep2Next() {
    if (!isValidIncome) {
      toast.error("Please enter a valid income amount");
      return;
    }
    setCurrentStep(2);
  }

  function handleSelectTemplate(templateId: string | null) {
    setSelectedTemplateId(templateId);

    if (templateId === null) {
      // Start from scratch — zero out allocations
      const empty = new Map<string, number>();
      for (const cat of spendableCategories) {
        empty.set(cat.id, 0);
      }
      setAllocations(empty);
      return;
    }

    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;

    const resolved = applyTemplateClient(template, incomeCents);
    // Ensure all spendable categories are represented
    const full = new Map<string, number>();
    for (const cat of spendableCategories) {
      full.set(cat.id, resolved.get(cat.id) ?? 0);
    }
    setAllocations(full);
  }

  function updateAllocation(categoryId: string, value: string) {
    const cents = Math.round(parseFloat(value) * 100);
    setAllocations((prev) => {
      const next = new Map(prev);
      next.set(categoryId, isNaN(cents) || cents < 0 ? 0 : cents);
      return next;
    });
  }

  function handleSaveBudget() {
    if (!paydayData) {
      toast.error("Payday configuration not loaded");
      return;
    }

    const allocationEntries: { categoryId: string; allocatedCents: number }[] =
      [];
    allocations.forEach((cents, categoryId) => {
      if (cents > 0) {
        allocationEntries.push({ categoryId, allocatedCents: cents });
      }
    });

    periodMutation.mutate({
      startDate: paydayData.currentPeriod.startDate,
      endDate: paydayData.currentPeriod.endDate,
      expectedIncomeCents: incomeCents,
      allocations: allocationEntries,
    });
  }

  // ---- Early returns ---------------------------------------------------

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to continue.</p>
      </div>
    );
  }

  // ---- Render ----------------------------------------------------------

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Budget Setup</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryManager(!showCategoryManager)}
        >
          <Settings2 className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Manage Categories</span>
          <span className="sm:hidden">Categories</span>
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        Configure your pay cycle and monthly income to get started.
      </p>

      {/* Category Manager Panel */}
      {showCategoryManager && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <CategoryManager onClose={() => setShowCategoryManager(false)} />
          </CardContent>
        </Card>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={`h-px w-8 sm:w-12 ${
                    isCompleted ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Payday Configuration */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>When do you get paid?</CardTitle>
            <CardDescription>
              Your budget periods will align with your pay cycle. Choose which
              day of the month you receive your salary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingConfig ? (
              <p className="text-muted-foreground">Loading settings...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payday-day">Payday (day of month)</Label>
                  <Select
                    value={String(effectivePaydayDay)}
                    onValueChange={(val) => setPaydayDay(parseInt(val, 10))}
                  >
                    <SelectTrigger id="payday-day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(
                        (day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                            {getOrdinalSuffix(day)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Days 1–28 supported. Your budget period runs from payday to
                    the day before your next payday.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekend-adjust">
                      Adjust for weekends
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If payday falls on a weekend, shift to the preceding
                      Friday.
                    </p>
                  </div>
                  <Switch
                    id="weekend-adjust"
                    checked={adjustForWeekends}
                    onCheckedChange={setAdjustForWeekends}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleStep1Save}
                    disabled={paydayMutation.isPending}
                  >
                    {paydayMutation.isPending ? "Saving..." : "Next"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Expected Income */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s your expected monthly income?</CardTitle>
            <CardDescription>
              Enter your take-home pay (after tax) for a typical pay period. This
              will be used to calculate your budget allocations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="income">Monthly income (AUD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="income"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expectedIncome}
                  onChange={(e) => setExpectedIncome(e.target.value)}
                  className="pl-7"
                />
              </div>
              {expectedIncome && isValidIncome && (
                <p className="text-xs text-muted-foreground">
                  $
                  {(incomeCents / 100).toLocaleString("en-AU", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  per pay period
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleStep2Next} disabled={!isValidIncome}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Template Selection & Allocations */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Template selection cards */}
          <Card>
            <CardHeader>
              <CardTitle>Choose a template</CardTitle>
              <CardDescription>
                Pick a starting template or start from scratch. You can adjust
                amounts after selecting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(templates ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      selectedTemplateId === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <p className="font-medium text-foreground text-sm">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate(null)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selectedTemplateId === null && allocations.size > 0
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-foreground text-sm">
                      Start from Scratch
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set each category amount manually.
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Allocation editor */}
          {allocations.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Allocations</CardTitle>
                <CardDescription>
                  Adjust how much you want to allocate to each category. Any
                  unallocated amount becomes savings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {spendableCategories.map((cat) => {
                  const cents = allocations.get(cat.id) ?? 0;
                  const percentage =
                    incomeCents > 0
                      ? ((cents / incomeCents) * 100).toFixed(1)
                      : "0";
                  const IconComp = ICON_MAP[cat.icon];

                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: cat.colour + "20" }}
                      >
                        {IconComp ? (
                          <IconComp className="h-4 w-4" />
                        ) : (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.colour }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground w-28 truncate">
                        {cat.name}
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cents > 0 ? (cents / 100).toFixed(2) : ""}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateAllocation(cat.id, e.target.value)
                          }
                          className="pl-7 h-9"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-14 text-right tabular-nums">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}

                {/* Running total bar */}
                <div className="border-t border-border pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total allocated
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      $
                      {(totalAllocated / 100).toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Unallocated (savings)
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        isOverBudget ? "text-destructive" : "text-emerald-400"
                      }`}
                    >
                      {isOverBudget ? "-" : ""}$
                      {(Math.abs(unallocatedCents) / 100).toLocaleString(
                        "en-AU",
                        { minimumFractionDigits: 2 }
                      )}{" "}
                      ({savingsPercentage}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverBudget ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(100, (totalAllocated / Math.max(1, incomeCents)) * 100)}%`,
                      }}
                    />
                  </div>

                  {isOverBudget && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Allocations exceed income by $
                        {(Math.abs(unallocatedCents) / 100).toLocaleString(
                          "en-AU",
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleSaveBudget}
              disabled={
                allocations.size === 0 || periodMutation.isPending
              }
            >
              {periodMutation.isPending ? "Saving..." : "Create Budget"}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
