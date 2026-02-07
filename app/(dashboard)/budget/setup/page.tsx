"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, ArrowRight, Calendar, DollarSign, Check } from "lucide-react";

export const dynamic = "force-dynamic";

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

const STEPS = [
  { label: "Payday", icon: Calendar },
  { label: "Income", icon: DollarSign },
  { label: "Budget", icon: Check },
];

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

export default function BudgetSetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuthSafe();

  const [currentStep, setCurrentStep] = useState(0);
  const [paydayDay, setPaydayDay] = useState<number | null>(null);
  const [adjustForWeekends, setAdjustForWeekends] = useState(true);
  const [expectedIncome, setExpectedIncome] = useState("");

  // Load existing payday config
  const { data: paydayData, isLoading: isLoadingConfig } = useQuery({
    queryKey: queryKeys.budget.payday,
    queryFn: fetchPaydayConfig,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
  });

  // Sync fetched config into local state (only on first load)
  useEffect(() => {
    if (paydayData && paydayDay === null) {
      setPaydayDay(paydayData.paydayDay);
      setAdjustForWeekends(paydayData.adjustForWeekends);
    }
  }, [paydayData, paydayDay]);

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

  const effectivePaydayDay = paydayDay ?? 15;

  function handleStep1Save() {
    paydayMutation.mutate({
      paydayDay: effectivePaydayDay,
      adjustForWeekends,
    });
  }

  function handleStep2Next() {
    const cents = Math.round(parseFloat(expectedIncome) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid income amount");
      return;
    }
    // Store income in session for the next step (template selection page)
    sessionStorage.setItem("budget_setup_income_cents", String(cents));
    router.push("/budget/setup/allocations");
  }

  const incomeCents = Math.round(parseFloat(expectedIncome) * 100);
  const isValidIncome = !isNaN(incomeCents) && incomeCents > 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Budget Setup</h1>
      <p className="text-muted-foreground mb-8">
        Configure your pay cycle and monthly income to get started.
      </p>

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
                  ${(incomeCents / 100).toLocaleString("en-AU", {
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
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
