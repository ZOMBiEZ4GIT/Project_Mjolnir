"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { showSuccess, showError, showInfo } from "@/lib/toast-helpers";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogDescription,
  AnimatedDialogFooter,
  AnimatedDialogHeader,
  AnimatedDialogTitle,
} from "@/components/ui/animated-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { FormSelectField } from "@/components/ui/form-select-field";
import { useFormShake } from "@/hooks/use-form-shake";
import type { Holding } from "@/lib/db/schema";
import { CURRENCIES, EXCHANGES, TRADEABLE_TYPES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

// Singular labels used in this dialog context
const HOLDING_TYPE_LABELS_SINGULAR: Record<Holding["type"], string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
  super: "Super",
  cash: "Cash",
  debt: "Debt",
};
// Types that require exchange
const EXCHANGE_REQUIRED_TYPES = ["stock", "etf"] as const;

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const EXCHANGE_OPTIONS = EXCHANGES.map((e) => ({ value: e, label: e }));

// Zod schema for edit form
const editHoldingSchema = z
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

type EditFormValues = z.infer<typeof editHoldingSchema>;

interface EditHoldingDialogProps {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function updateHolding(
  id: string,
  data: {
    name?: string;
    symbol?: string;
    currency?: string;
    exchange?: string;
    isDormant?: boolean;
  }
) {
  const response = await fetch(`/api/holdings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export function EditHoldingDialog({
  holding,
  open,
  onOpenChange,
}: EditHoldingDialogProps) {
  const queryClient = useQueryClient();
  const { formRef, triggerShake } = useFormShake();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editHoldingSchema) as unknown as Resolver<EditFormValues>,
    defaultValues: {
      name: "",
      symbol: "",
      currency: "",
      exchange: "",
      isDormant: false,
      _type: "stock",
    },
  });

  // Reset form data when holding changes or dialog opens
  useEffect(() => {
    if (open && holding) {
      form.reset({
        name: holding.name,
        symbol: holding.symbol || "",
        currency: holding.currency || "",
        exchange: holding.exchange || "",
        isDormant: holding.isDormant ?? false,
        _type: holding.type,
      });
    }
  }, [open, holding, form]);

  const isTradeable = (TRADEABLE_TYPES as readonly string[]).includes(holding.type);
  const requiresExchange = (EXCHANGE_REQUIRED_TYPES as readonly string[]).includes(holding.type);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateHolding>[1]) =>
      updateHolding(holding.id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      if (variables.isDormant !== undefined) {
        const statusText = variables.isDormant ? "marked as dormant" : "marked as active";
        showSuccess(`Holding ${statusText}`);
      } else {
        showSuccess("Holding updated successfully");
      }
      onOpenChange(false);
    },
    onError: (error: { errors?: Record<string, string>; error?: string }) => {
      if (error.errors) {
        Object.entries(error.errors).forEach(([field, message]) => {
          form.setError(field as keyof EditFormValues, { message });
        });
      } else {
        showError(error.error || "Failed to update holding");
      }
    },
  });

  const onValid = (data: EditFormValues) => {
    // Build update payload - only include changed fields
    const updateData: Parameters<typeof updateHolding>[1] = {};

    if (data.name.trim() !== holding.name) {
      updateData.name = data.name.trim();
    }
    if (data.currency !== holding.currency) {
      updateData.currency = data.currency;
    }
    if (isTradeable && data.symbol.trim().toUpperCase() !== holding.symbol) {
      updateData.symbol = data.symbol.trim().toUpperCase();
    }
    if (requiresExchange && data.exchange !== holding.exchange) {
      updateData.exchange = data.exchange;
    }
    if (data.isDormant !== (holding.isDormant ?? false)) {
      updateData.isDormant = data.isDormant;
    }

    // Only submit if there are changes
    if (Object.keys(updateData).length === 0) {
      showInfo("No changes to save");
      onOpenChange(false);
      return;
    }

    mutation.mutate(updateData);
  };

  const onSubmit = form.handleSubmit(onValid, () => {
    triggerShake();
  });

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AnimatedDialog open={open} onOpenChange={handleClose}>
      <AnimatedDialogContent className="sm:max-w-md">
        <FormProvider {...form}>
          <form onSubmit={onSubmit}>
            <AnimatedDialogHeader>
              <AnimatedDialogTitle>Edit Holding</AnimatedDialogTitle>
              <AnimatedDialogDescription>
                Update the details for this {holding.type} holding.
              </AnimatedDialogDescription>
            </AnimatedDialogHeader>

            <div ref={formRef as React.RefObject<HTMLDivElement | null>} className="grid gap-4 py-4">
              {/* Type field - read-only */}
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground items-center">
                  {HOLDING_TYPE_LABELS_SINGULAR[holding.type]}
                </div>
              </div>

              {/* Name field */}
              <FormField<EditFormValues>
                name="name"
                label="Name"
                placeholder="e.g., Vanguard Australian Shares"
              />

              {/* Symbol field - only for tradeable types */}
              {isTradeable && (
                <FormField<EditFormValues>
                  name="symbol"
                  label="Symbol"
                  placeholder="e.g., VAS.AX"
                />
              )}

              {/* Currency field */}
              <FormSelectField<EditFormValues>
                name="currency"
                label="Currency"
                placeholder="Select currency"
                options={CURRENCY_OPTIONS}
              />

              {/* Exchange field - only for stock/etf */}
              {requiresExchange && (
                <FormSelectField<EditFormValues>
                  name="exchange"
                  label="Exchange"
                  placeholder="Select exchange"
                  options={EXCHANGE_OPTIONS}
                />
              )}

              {/* Mark as Dormant checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="edit-is-dormant"
                  checked={form.watch("isDormant")}
                  onCheckedChange={(checked) => {
                    form.setValue("isDormant", checked === true);
                  }}
                />
                <Label
                  htmlFor="edit-is-dormant"
                  className="text-sm font-normal cursor-pointer"
                >
                  Mark as Dormant
                </Label>
              </div>
            </div>

            <AnimatedDialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </AnimatedDialogFooter>
          </form>
        </FormProvider>
      </AnimatedDialogContent>
    </AnimatedDialog>
  );
}
