"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Holding } from "@/lib/db/schema";

const HOLDING_TYPE_LABELS: Record<Holding["type"], string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
  super: "Super",
  cash: "Cash",
  debt: "Debt",
};

const CURRENCIES = ["AUD", "NZD", "USD"] as const;
const EXCHANGES = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;

// Types that require tradeable form (symbol required)
const TRADEABLE_TYPES = ["stock", "etf", "crypto"] as const;
// Types that require exchange
const EXCHANGE_REQUIRED_TYPES = ["stock", "etf"] as const;

type Currency = (typeof CURRENCIES)[number];
type Exchange = (typeof EXCHANGES)[number];

interface FormData {
  name: string;
  symbol: string;
  currency: Currency | "";
  exchange: Exchange | "";
  isDormant: boolean;
}

interface FormErrors {
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
}

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

function validateSymbolForExchange(
  symbol: string,
  exchange: Exchange | ""
): string | undefined {
  if (!symbol) return undefined;

  const upperSymbol = symbol.toUpperCase();

  if (exchange === "ASX" && !upperSymbol.endsWith(".AX")) {
    return "ASX symbols must end with .AX (e.g., VAS.AX)";
  }

  if (exchange === "NZX" && !upperSymbol.endsWith(".NZ")) {
    return "NZX symbols must end with .NZ (e.g., SPK.NZ)";
  }

  return undefined;
}

export function EditHoldingDialog({
  holding,
  open,
  onOpenChange,
}: EditHoldingDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    currency: "",
    exchange: "",
    isDormant: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  // Initialize form data when holding changes or dialog opens
  useEffect(() => {
    if (open && holding) {
      setFormData({
        name: holding.name,
        symbol: holding.symbol || "",
        currency: (holding.currency as Currency) || "",
        exchange: (holding.exchange as Exchange) || "",
        isDormant: holding.isDormant ?? false,
      });
      setErrors({});
    }
  }, [open, holding]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateHolding>[1]) =>
      updateHolding(holding.id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      // Show specific toast message for dormant status change
      if (variables.isDormant !== undefined) {
        const statusText = variables.isDormant ? "marked as dormant" : "marked as active";
        toast.success(`Holding ${statusText}`);
      } else {
        toast.success("Holding updated successfully");
      }
      onOpenChange(false);
    },
    onError: (error: { errors?: FormErrors; error?: string }) => {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        toast.error(error.error || "Failed to update holding");
      }
    },
  });

  const isTradeable = TRADEABLE_TYPES.includes(
    holding.type as (typeof TRADEABLE_TYPES)[number]
  );
  const requiresExchange = EXCHANGE_REQUIRED_TYPES.includes(
    holding.type as (typeof EXCHANGE_REQUIRED_TYPES)[number]
  );

  const handleSubmit = () => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Validate currency
    if (!formData.currency) {
      newErrors.currency = "Currency is required";
    }

    // Validate symbol for tradeable types
    if (isTradeable) {
      if (!formData.symbol.trim()) {
        newErrors.symbol = "Symbol is required";
      } else {
        // Validate symbol format for ASX/NZX
        const symbolError = validateSymbolForExchange(
          formData.symbol,
          formData.exchange
        );
        if (symbolError) {
          newErrors.symbol = symbolError;
        }
      }
    }

    // Validate exchange for stock/etf
    if (requiresExchange && !formData.exchange) {
      newErrors.exchange = "Exchange is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build update payload - only include changed fields
    const updateData: Parameters<typeof updateHolding>[1] = {};

    if (formData.name.trim() !== holding.name) {
      updateData.name = formData.name.trim();
    }
    if (formData.currency !== holding.currency) {
      updateData.currency = formData.currency;
    }
    if (isTradeable && formData.symbol.trim().toUpperCase() !== holding.symbol) {
      updateData.symbol = formData.symbol.trim().toUpperCase();
    }
    if (requiresExchange && formData.exchange !== holding.exchange) {
      updateData.exchange = formData.exchange;
    }
    if (formData.isDormant !== (holding.isDormant ?? false)) {
      updateData.isDormant = formData.isDormant;
    }

    // Only submit if there are changes
    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }

    mutation.mutate(updateData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update the details for this {holding.type} holding.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type field - read-only */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {HOLDING_TYPE_LABELS[holding.type]}
            </div>
          </div>

          {/* Name field */}
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Symbol field - only for tradeable types */}
          {isTradeable && (
            <div className="grid gap-2">
              <Label htmlFor="edit-symbol">Symbol</Label>
              <Input
                id="edit-symbol"
                value={formData.symbol}
                onChange={(e) => {
                  setFormData({ ...formData, symbol: e.target.value });
                  if (errors.symbol) setErrors({ ...errors, symbol: undefined });
                }}
                className={errors.symbol ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.symbol && (
                <p className="text-sm text-destructive">{errors.symbol}</p>
              )}
            </div>
          )}

          {/* Currency field */}
          <div className="grid gap-2">
            <Label htmlFor="edit-currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value: Currency) => {
                setFormData({ ...formData, currency: value });
                if (errors.currency)
                  setErrors({ ...errors, currency: undefined });
              }}
            >
              <SelectTrigger
                id="edit-currency"
                className={errors.currency ? "border-destructive focus:ring-destructive" : ""}
              >
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency}</p>
            )}
          </div>

          {/* Exchange field - only for stock/etf */}
          {requiresExchange && (
            <div className="grid gap-2">
              <Label htmlFor="edit-exchange">Exchange</Label>
              <Select
                value={formData.exchange}
                onValueChange={(value: Exchange) => {
                  setFormData({ ...formData, exchange: value });
                  if (errors.exchange)
                    setErrors({ ...errors, exchange: undefined });
                  // Clear symbol error when exchange changes
                  if (errors.symbol)
                    setErrors({
                      ...errors,
                      exchange: undefined,
                      symbol: undefined,
                    });
                }}
              >
                <SelectTrigger
                  id="edit-exchange"
                  className={errors.exchange ? "border-destructive focus:ring-destructive" : ""}
                >
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGES.map((exchange) => (
                    <SelectItem key={exchange} value={exchange}>
                      {exchange}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.exchange && (
                <p className="text-sm text-destructive">{errors.exchange}</p>
              )}
            </div>
          )}

          {/* Mark as Dormant checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="edit-is-dormant"
              checked={formData.isDormant}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, isDormant: checked === true });
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
