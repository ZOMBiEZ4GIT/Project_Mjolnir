"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatCurrency, type Currency, type ExchangeRates } from "@/lib/utils/currency";

interface CurrencyExposureItem {
  currency: Currency;
  value: number;
  valueNative: number;
  percentage: number;
  count: number;
}

interface CurrencyExposureResponse {
  exposure: CurrencyExposureItem[];
  totalAssets: number;
  displayCurrency: Currency;
  ratesUsed: ExchangeRates;
  calculatedAt: string;
}

async function fetchCurrencyExposure(displayCurrency: Currency): Promise<CurrencyExposureResponse> {
  const response = await fetch(`/api/currency-exposure?displayCurrency=${displayCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch currency exposure");
  }
  return response.json();
}

/**
 * Formats a percentage.
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns the display name for a currency.
 */
function getCurrencyDisplayName(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "Australian Dollar";
    case "NZD":
      return "New Zealand Dollar";
    case "USD":
      return "US Dollar";
    default:
      return currency;
  }
}

/**
 * Returns the color class for a currency.
 */
function getCurrencyColor(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "bg-green-500";
    case "NZD":
      return "bg-blue-500";
    case "USD":
      return "bg-amber-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Returns the flag emoji for a currency.
 */
function getCurrencyFlag(currency: Currency): string {
  switch (currency) {
    case "AUD":
      return "🇦🇺";
    case "NZD":
      return "🇳🇿";
    case "USD":
      return "🇺🇸";
    default:
      return "🏳️";
  }
}

/**
 * Loading skeleton for currency exposure.
 */
function ExposureSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-5 w-40 bg-gray-700 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-gray-700 rounded" />
                  <div className="h-4 w-32 bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-700 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ExposureItemProps {
  currency: Currency;
  value: number;
  valueNative: number;
  percentage: number;
  count: number;
  displayCurrency: Currency;
}

/**
 * Individual currency exposure row.
 */
function ExposureItem({
  currency,
  value,
  percentage,
  count,
  displayCurrency,
}: ExposureItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getCurrencyColor(currency)} bg-opacity-20`}>
            <span className="text-lg" role="img" aria-label={`${currency} flag`}>
              {getCurrencyFlag(currency)}
            </span>
          </div>
          <div>
            <span className="font-medium text-white">
              {currency}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {getCurrencyDisplayName(currency)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({count} holding{count !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-white">
            {formatCurrency(value, displayCurrency, { compact: true })}
          </div>
          <div className="text-xs text-gray-400">{formatPercentage(percentage)}</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getCurrencyColor(currency)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Currency Exposure Component
 *
 * Displays a breakdown of assets by currency (AUD, NZD, USD).
 * Each currency shows:
 * - Flag and currency code
 * - Full currency name
 * - Value in the user's display currency
 * - Percentage of total assets
 * - Visual progress bar for percentage
 *
 * Sorted by value descending. Debt is excluded from this breakdown.
 */
export function CurrencyExposure() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, isLoading: currencyLoading } = useCurrency();

  const {
    data: exposureData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currency-exposure", displayCurrency],
    queryFn: () => fetchCurrencyExposure(displayCurrency),
    enabled: isLoaded && isSignedIn && !currencyLoading,
    refetchInterval: 60 * 1000,
  });

  // Show skeleton while loading or not authenticated
  if (!isLoaded || !isSignedIn || isLoading || currencyLoading) {
    return <ExposureSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400">Failed to load currency exposure</p>
      </div>
    );
  }

  // No data available
  if (!exposureData || !exposureData.exposure) {
    return <ExposureSkeleton />;
  }

  const { exposure } = exposureData;

  // Empty state
  if (exposure.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
          Currency Exposure
        </h3>
        <p className="text-gray-500 text-center py-8">
          No assets to display. Add holdings to see your currency exposure.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Currency Exposure
      </h3>
      <div className="space-y-5">
        {exposure.map((item) => (
          <ExposureItem
            key={item.currency}
            currency={item.currency}
            value={item.value}
            valueNative={item.valueNative}
            percentage={item.percentage}
            count={item.count}
            displayCurrency={displayCurrency}
          />
        ))}
      </div>
    </div>
  );
}
