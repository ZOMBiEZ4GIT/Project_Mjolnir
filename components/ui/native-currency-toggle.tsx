"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/components/providers/currency-provider";

interface NativeCurrencyToggleProps {
  /** Custom class name for the container */
  className?: string;
  /** Whether to show loading state while preferences load */
  showLoadingState?: boolean;
  /** Whether to show the description text below the label */
  showDescription?: boolean;
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
 * // With description
 * <NativeCurrencyToggle showDescription />
 * ```
 */
export function NativeCurrencyToggle({
  className,
  showLoadingState = true,
  showDescription = false,
}: NativeCurrencyToggleProps) {
  const { showNativeCurrency, setShowNativeCurrency, isLoading } = useCurrency();

  // Show skeleton while loading preferences
  if (showLoadingState && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="h-5 w-9 rounded-full bg-muted animate-pulse" />
        <div className="flex flex-col gap-0.5">
          <span className="h-4 w-32 rounded bg-muted animate-pulse" />
          {showDescription && (
            <span className="h-3 w-56 rounded bg-muted animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Switch
        id="show-native-currency"
        checked={showNativeCurrency}
        onCheckedChange={setShowNativeCurrency}
        className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted"
      />
      <div className="flex flex-col gap-0.5">
        <Label
          htmlFor="show-native-currency"
          className="text-body-sm text-muted-foreground cursor-pointer"
        >
          Show native currencies
        </Label>
        {showDescription && (
          <p className="text-body-sm text-muted-foreground/70">
            Display original currency values alongside converted amounts
          </p>
        )}
      </div>
    </div>
  );
}
