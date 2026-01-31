"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOLDING_TYPES = [
  { value: "stock", label: "Stock", description: "Individual company shares" },
  { value: "etf", label: "ETF", description: "Exchange-traded funds" },
  { value: "crypto", label: "Crypto", description: "Cryptocurrency" },
  { value: "super", label: "Super", description: "Superannuation funds" },
  { value: "cash", label: "Cash", description: "Bank accounts and cash" },
  { value: "debt", label: "Debt", description: "Loans and liabilities" },
] as const;

const CURRENCIES = ["AUD", "NZD", "USD"] as const;
const EXCHANGES = ["ASX", "NZX", "NYSE", "NASDAQ"] as const;

// Types that require tradeable form (symbol required)
const TRADEABLE_TYPES = ["stock", "etf", "crypto"] as const;
// Types that require exchange
const EXCHANGE_REQUIRED_TYPES = ["stock", "etf"] as const;

export type HoldingType = (typeof HOLDING_TYPES)[number]["value"];
type Currency = (typeof CURRENCIES)[number];
type Exchange = (typeof EXCHANGES)[number];

interface FormData {
  name: string;
  symbol: string;
  currency: Currency | "";
  exchange: Exchange | "";
}

interface FormErrors {
  name?: string;
  symbol?: string;
  currency?: string;
  exchange?: string;
}

interface AddHoldingDialogProps {
  children?: React.ReactNode;
}

async function createHolding(data: {
  type: HoldingType;
  name: string;
  symbol?: string;
  currency: string;
  exchange?: string;
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

function validateSymbolForExchange(symbol: string, exchange: Exchange | ""): string | undefined {
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

export function AddHoldingDialog({ children }: AddHoldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<HoldingType | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    currency: "",
    exchange: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      toast.success("Holding created successfully");
      handleClose();
    },
    onError: (error: { errors?: FormErrors; error?: string }) => {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        toast.error(error.error || "Failed to create holding");
      }
    },
  });

  const handleClose = () => {
    setOpen(false);
    // Reset state when closing
    setStep(1);
    setSelectedType(null);
    setFormData({ name: "", symbol: "", currency: "", exchange: "" });
    setErrors({});
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
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const isTradeable = selectedType && TRADEABLE_TYPES.includes(selectedType as typeof TRADEABLE_TYPES[number]);
  const requiresExchange = selectedType && EXCHANGE_REQUIRED_TYPES.includes(selectedType as typeof EXCHANGE_REQUIRED_TYPES[number]);

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
        const symbolError = validateSymbolForExchange(formData.symbol, formData.exchange);
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

    // Submit form
    mutation.mutate({
      type: selectedType!,
      name: formData.name.trim(),
      symbol: isTradeable ? formData.symbol.trim().toUpperCase() : undefined,
      currency: formData.currency,
      exchange: requiresExchange ? formData.exchange : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? <Button>Add Holding</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Add New Holding</DialogTitle>
              <DialogDescription>
                Select the type of asset you want to track.
              </DialogDescription>
            </DialogHeader>

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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!selectedType}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Add {HOLDING_TYPES.find((t) => t.value === selectedType)?.label}
              </DialogTitle>
              <DialogDescription>
                Enter the details for your {selectedType} holding.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name field - always shown */}
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder={isTradeable ? "e.g., Vanguard Australian Shares" : "e.g., Savings Account"}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Symbol field - only for tradeable types */}
              {isTradeable && (
                <div className="grid gap-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder={
                      requiresExchange
                        ? formData.exchange === "ASX"
                          ? "e.g., VAS.AX"
                          : formData.exchange === "NZX"
                          ? "e.g., SPK.NZ"
                          : "e.g., AAPL"
                        : "e.g., BTC"
                    }
                    value={formData.symbol}
                    onChange={(e) => {
                      setFormData({ ...formData, symbol: e.target.value });
                      if (errors.symbol) setErrors({ ...errors, symbol: undefined });
                    }}
                  />
                  {errors.symbol && (
                    <p className="text-sm text-red-500">{errors.symbol}</p>
                  )}
                </div>
              )}

              {/* Currency field - always shown */}
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: Currency) => {
                    setFormData({ ...formData, currency: value });
                    if (errors.currency) setErrors({ ...errors, currency: undefined });
                  }}
                >
                  <SelectTrigger id="currency">
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
                  <p className="text-sm text-red-500">{errors.currency}</p>
                )}
              </div>

              {/* Exchange field - only for stock/etf */}
              {requiresExchange && (
                <div className="grid gap-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Select
                    value={formData.exchange}
                    onValueChange={(value: Exchange) => {
                      setFormData({ ...formData, exchange: value });
                      if (errors.exchange) setErrors({ ...errors, exchange: undefined });
                      // Clear symbol error when exchange changes - user might need to update symbol
                      if (errors.symbol) setErrors({ ...errors, exchange: undefined, symbol: undefined });
                    }}
                  >
                    <SelectTrigger id="exchange">
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
                    <p className="text-sm text-red-500">{errors.exchange}</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
