"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/components/providers/currency-provider";

interface NativeCurrencyToggleProps {
  /** Custom class name for the container */
  className?: string;
  /** Whether to show loading state while preferences load */
  showLoadingState?: boolean;
}

/**
 * Toggle component for switching between converted and native currency display.
 *
 * When enabled, holding values are shown in their native currency (e.g., USD for US stocks).
 * When disabled, values are converted to the user's display currency preference.
 *
 * @example
 * ```tsx
 * // In the holdings page
 * <NativeCurrencyToggle />
 *
 * // With loading state
 * <NativeCurrencyToggle showLoadingState />
 * ```
 */
export function NativeCurrencyToggle({
  className,
  showLoadingState = true,
}: NativeCurrencyToggleProps) {
  const { showNativeCurrency, setShowNativeCurrency, isLoading } = useCurrency();

  // Show skeleton while loading preferences
  if (showLoadingState && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="h-5 w-9 rounded-full bg-muted animate-pulse" />
        <span className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Switch
        id="show-native-currency"
        checked={showNativeCurrency}
        onCheckedChange={setShowNativeCurrency}
      />
      <Label
        htmlFor="show-native-currency"
        className="text-muted-foreground cursor-pointer text-sm"
      >
        Show native currencies
      </Label>
    </div>
  );
}
