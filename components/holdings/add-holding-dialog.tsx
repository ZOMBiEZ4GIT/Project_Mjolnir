"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { showSuccess, showError } from "@/lib/toast-helpers";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogDescription,
  AnimatedDialogFooter,
  AnimatedDialogHeader,
  AnimatedDialogTitle,
  AnimatedDialogTrigger,
} from "@/components/ui/animated-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { FormSelectField } from "@/components/ui/form-select-field";
import { useFormShake } from "@/hooks/use-form-shake";
import { CURRENCIES, EXCHANGES, TRADEABLE_TYPES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

const HOLDING_TYPES = [
  { value: "stock", label: "Stock", description: "Individual company shares" },
  { value: "etf", label: "ETF", description: "Exchange-traded funds" },
  { value: "crypto", label: "Crypto", description: "Cryptocurrency" },
  { value: "super", label: "Super", description: "Superannuation funds" },
  { value: "cash", label: "Cash", description: "Bank accounts and cash" },
  { value: "debt", label: "Debt", description: "Loans and liabilities" },
] as const;
// Types that require exchange
const EXCHANGE_REQUIRED_TYPES = ["stock", "etf"] as const;

export type HoldingType = (typeof HOLDING_TYPES)[number]["value"];

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const EXCHANGE_OPTIONS = EXCHANGES.map((e) => ({ value: e, label: e }));

// Zod schema for step 2 form
const holdingFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    symbol: z.string().optional().default(""),
    currency: z.string().min(1, "Currency is required"),
    exchange: z.string().optional().default(""),
    isDormant: z.boolean().default(false),
    // Hidden field to drive conditional validation
    _type: z.enum(["stock", "etf", "crypto", "super", "cash", "debt"]),
  })
  .superRefine((data, ctx) => {
    const isTradeable = (TRADEABLE_TYPES as readonly string[]).includes(data._type);
    const requiresExchange = (EXCHANGE_REQUIRED_TYPES as readonly string[]).includes(data._type);

    // Symbol required for tradeable types
    if (isTradeable && !data.symbol.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Symbol is required",
        path: ["symbol"],
      });
    }

    // Validate symbol format for ASX/NZX
    if (isTradeable && data.symbol.trim()) {
      const upperSymbol = data.symbol.trim().toUpperCase();
      if (data.exchange === "ASX" && !upperSymbol.endsWith(".AX")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ASX symbols must end with .AX (e.g., VAS.AX)",
          path: ["symbol"],
        });
      }
      if (data.exchange === "NZX" && !upperSymbol.endsWith(".NZ")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "NZX symbols must end with .NZ (e.g., SPK.NZ)",
          path: ["symbol"],
        });
      }
    }

    // Exchange required for stock/etf
    if (requiresExchange && !data.exchange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exchange is required",
        path: ["exchange"],
      });
    }
  });

type HoldingFormValues = z.infer<typeof holdingFormSchema>;

interface AddHoldingDialogProps {
  children?: React.ReactNode;
}

async function createHolding(data: {
  type: HoldingType;
  name: string;
  symbol?: string;
  currency: string;
  exchange?: string;
  isDormant?: boolean;
}) {
  const response = await fetch("/api/holdings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export function AddHoldingDialog({ children }: AddHoldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<HoldingType | null>(null);
  const { formRef, triggerShake } = useFormShake();

  const queryClient = useQueryClient();

  const form = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema) as unknown as Resolver<HoldingFormValues>,
    defaultValues: {
      name: "",
      symbol: "",
      currency: "",
      exchange: "",
      isDormant: false,
      _type: "stock",
    },
  });

  const isTradeable = selectedType && (TRADEABLE_TYPES as readonly string[]).includes(selectedType);
  const requiresExchange = selectedType && (EXCHANGE_REQUIRED_TYPES as readonly string[]).includes(selectedType);
  const isSuper = selectedType === "super";

  const mutation = useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      showSuccess("Holding created successfully");
      handleClose();
    },
    onError: (error: { errors?: Record<string, string>; error?: string }) => {
      if (error.errors) {
        // Set server errors on individual fields
        Object.entries(error.errors).forEach(([field, message]) => {
          form.setError(field as keyof HoldingFormValues, { message });
        });
      } else {
        showError(error.error || "Failed to create holding");
      }
    },
  });

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setSelectedType(null);
    form.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      setOpen(true);
    }
  };

  const handleContinue = () => {
    if (selectedType) {
      form.setValue("_type", selectedType);
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    form.clearErrors();
  };

  const onValid = (data: HoldingFormValues) => {
    mutation.mutate({
      type: selectedType!,
      name: data.name.trim(),
      symbol: isTradeable ? data.symbol.trim().toUpperCase() : undefined,
      currency: data.currency,
      exchange: requiresExchange ? data.exchange : undefined,
      isDormant: isSuper ? data.isDormant : undefined,
    });
  };

  const onSubmit = form.handleSubmit(onValid, () => {
    triggerShake();
  });

  const getNamePlaceholder = () => {
    if (isTradeable) return "e.g., Vanguard Australian Shares";
    if (selectedType === "super") return "e.g., AustralianSuper";
    if (selectedType === "cash") return "e.g., Savings Account";
    if (selectedType === "debt") return "e.g., Home Loan";
    return "e.g., My Holding";
  };

  const getSymbolPlaceholder = () => {
    if (requiresExchange) {
      const exchange = form.watch("exchange");
      if (exchange === "ASX") return "e.g., VAS.AX";
      if (exchange === "NZX") return "e.g., SPK.NZ";
      return "e.g., AAPL";
    }
    return "e.g., BTC";
  };

  return (
    <AnimatedDialog open={open} onOpenChange={handleOpenChange}>
      <AnimatedDialogTrigger asChild>
        {children ?? <Button>Add Holding</Button>}
      </AnimatedDialogTrigger>
      <AnimatedDialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <AnimatedDialogHeader>
              <AnimatedDialogTitle>Add New Holding</AnimatedDialogTitle>
              <AnimatedDialogDescription>
                Select the type of asset you want to track.
              </AnimatedDialogDescription>
            </AnimatedDialogHeader>

            <div className="py-4">
              <RadioGroup
                value={selectedType ?? ""}
                onValueChange={(value) => setSelectedType(value as HoldingType)}
                className="grid grid-cols-2 gap-3"
              >
                {HOLDING_TYPES.map((type) => (
                  <div key={type.value}>
                    <RadioGroupItem
                      value={type.value}
                      id={`type-${type.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`type-${type.value}`}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-sm font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {type.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <AnimatedDialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!selectedType}>
                Continue
              </Button>
            </AnimatedDialogFooter>
          </>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={onSubmit}>
              <AnimatedDialogHeader>
                <AnimatedDialogTitle>
                  Add {HOLDING_TYPES.find((t) => t.value === selectedType)?.label}
                </AnimatedDialogTitle>
                <AnimatedDialogDescription>
                  Enter the details for your {selectedType} holding.
                </AnimatedDialogDescription>
              </AnimatedDialogHeader>

              <div ref={formRef as React.RefObject<HTMLDivElement | null>} className="grid gap-4 py-4">
                {/* Name field - always shown */}
                <FormField<HoldingFormValues>
                  name="name"
                  label="Name"
                  placeholder={getNamePlaceholder()}
                />

                {/* Symbol field - only for tradeable types */}
                {isTradeable && (
                  <FormField<HoldingFormValues>
                    name="symbol"
                    label="Symbol"
                    placeholder={getSymbolPlaceholder()}
                  />
                )}

                {/* Currency field - always shown */}
                <FormSelectField<HoldingFormValues>
                  name="currency"
                  label="Currency"
                  placeholder="Select currency"
                  options={CURRENCY_OPTIONS}
                />

                {/* Exchange field - only for stock/etf */}
                {requiresExchange && (
                  <FormSelectField<HoldingFormValues>
                    name="exchange"
                    label="Exchange"
                    placeholder="Select exchange"
                    options={EXCHANGE_OPTIONS}
                  />
                )}

                {/* Is Dormant checkbox - only for super type */}
                {isSuper && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isDormant"
                      checked={form.watch("isDormant")}
                      onCheckedChange={(checked) => {
                        form.setValue("isDormant", checked === true);
                      }}
                    />
                    <Label
                      htmlFor="isDormant"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mark as dormant (e.g., inactive Kiwisaver)
                    </Label>
                  </div>
                )}
              </div>

              <AnimatedDialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save"}
                </Button>
              </AnimatedDialogFooter>
            </form>
          </FormProvider>
        )}
      </AnimatedDialogContent>
    </AnimatedDialog>
  );
}
