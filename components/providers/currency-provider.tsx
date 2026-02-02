"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  Currency,
  ExchangeRates,
  convertCurrency,
} from "@/lib/utils/currency";

/**
 * Response from the preferences API
 */
interface PreferencesResponse {
  displayCurrency: Currency;
  updatedAt: string;
}

/**
 * Response from the exchange rates API
 */
interface ExchangeRatesApiResponse {
  rates: Record<string, number>;
  fetchedAt: string | null;
  isStale: boolean;
}

/**
 * Currency context value provided to consuming components.
 */
interface CurrencyContextValue {
  /**
   * The user's selected display currency (AUD, NZD, or USD).
   * Defaults to AUD if not loaded yet or user has no preference.
   */
  displayCurrency: Currency;

  /**
   * Update the user's display currency preference.
   * This persists to the database and updates context immediately.
   */
  setDisplayCurrency: (currency: Currency) => void;

  /**
   * Current exchange rates in the format { "USD/AUD": number, "NZD/AUD": number }.
   * May be null while loading or if rates unavailable.
   */
  rates: ExchangeRates | null;

  /**
   * True while loading preferences or exchange rates.
   */
  isLoading: boolean;

  /**
   * True if exchange rates are stale (older than TTL).
   */
  isStale: boolean;

  /**
   * The timestamp when rates were last fetched, or null if unavailable.
   */
  ratesFetchedAt: Date | null;

  /**
   * Converts an amount from a source currency to the display currency.
   * Returns the original amount if rates are unavailable or currencies match.
   *
   * @param amount - The amount to convert
   * @param fromCurrency - The source currency code
   * @returns The converted amount in display currency
   */
  convert: (amount: number, fromCurrency: Currency) => number;

  /**
   * Refreshes exchange rates from the API.
   */
  refreshRates: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Fetches user preferences from the API.
 */
async function fetchPreferences(): Promise<PreferencesResponse> {
  const response = await fetch("/api/preferences");
  if (!response.ok) {
    throw new Error(`Failed to fetch preferences: ${response.status}`);
  }
  return response.json();
}

/**
 * Updates user preferences via the API.
 */
async function updatePreferences(
  displayCurrency: Currency
): Promise<PreferencesResponse> {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayCurrency }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update preferences: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches exchange rates from the API.
 */
async function fetchExchangeRates(
  refresh = false
): Promise<ExchangeRatesApiResponse> {
  const url = refresh ? "/api/exchange-rates?refresh=true" : "/api/exchange-rates";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.status}`);
  }
  return response.json();
}

/**
 * Transforms API response rates to ExchangeRates format.
 */
function transformRates(
  apiRates: Record<string, number>
): ExchangeRates | null {
  const usdAud = apiRates["USD/AUD"];
  const nzdAud = apiRates["NZD/AUD"];

  // Require both rates to be present
  if (typeof usdAud !== "number" || typeof nzdAud !== "number") {
    return null;
  }

  return {
    "USD/AUD": usdAud,
    "NZD/AUD": nzdAud,
  };
}

interface CurrencyProviderProps {
  children: ReactNode;
  /**
   * Default currency to use while loading or if unauthenticated.
   * Defaults to AUD.
   */
  defaultCurrency?: Currency;
}

/**
 * CurrencyProvider provides currency context throughout the app.
 *
 * Features:
 * - Fetches and caches user display currency preference
 * - Fetches and caches exchange rates
 * - Provides `convert()` function for currency conversion
 * - Handles optimistic updates when changing display currency
 *
 * Must be wrapped inside ClerkProvider and QueryProvider.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <ClerkProvider>
 *   <QueryProvider>
 *     <CurrencyProvider>
 *       <App />
 *     </CurrencyProvider>
 *   </QueryProvider>
 * </ClerkProvider>
 * ```
 *
 * @example
 * ```tsx
 * // In a component
 * const { displayCurrency, convert, rates, isLoading } = useCurrency();
 *
 * // Convert 100 USD to display currency
 * const converted = convert(100, "USD");
 * ```
 */
export function CurrencyProvider({
  children,
  defaultCurrency = "AUD",
}: CurrencyProviderProps) {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const queryClient = useQueryClient();

  // Local state for optimistic updates
  const [optimisticCurrency, setOptimisticCurrency] = useState<Currency | null>(
    null
  );

  // Fetch user preferences
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
  } = useQuery({
    queryKey: ["preferences"],
    queryFn: fetchPreferences,
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch exchange rates
  const {
    data: ratesData,
    isLoading: ratesLoading,
    refetch: refetchRates,
  } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => fetchExchangeRates(false),
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(["preferences"], data);
      // Clear optimistic state
      setOptimisticCurrency(null);
    },
    onError: () => {
      // Revert optimistic update on error
      setOptimisticCurrency(null);
    },
  });

  // Determine display currency (optimistic > fetched > default)
  const displayCurrency = useMemo(() => {
    if (optimisticCurrency) {
      return optimisticCurrency;
    }
    if (preferencesData?.displayCurrency) {
      return preferencesData.displayCurrency;
    }
    return defaultCurrency;
  }, [optimisticCurrency, preferencesData, defaultCurrency]);

  // Transform rates from API format
  const rates = useMemo(() => {
    if (!ratesData?.rates) {
      return null;
    }
    return transformRates(ratesData.rates);
  }, [ratesData]);

  // Parse fetchedAt date
  const ratesFetchedAt = useMemo(() => {
    if (!ratesData?.fetchedAt) {
      return null;
    }
    return new Date(ratesData.fetchedAt);
  }, [ratesData]);

  // Set display currency with optimistic update
  const setDisplayCurrency = useCallback(
    (currency: Currency) => {
      if (!isSignedIn) {
        return;
      }
      // Optimistic update
      setOptimisticCurrency(currency);
      // Persist to server
      updateMutation.mutate(currency);
    },
    [isSignedIn, updateMutation]
  );

  // Convert function using current rates
  const convert = useCallback(
    (amount: number, fromCurrency: Currency): number => {
      // Same currency - no conversion needed
      if (fromCurrency === displayCurrency) {
        return amount;
      }

      // No rates available - return original
      if (!rates) {
        return amount;
      }

      return convertCurrency(amount, fromCurrency, displayCurrency, rates);
    },
    [displayCurrency, rates]
  );

  // Refresh rates function
  const refreshRates = useCallback(() => {
    refetchRates();
  }, [refetchRates]);

  // Compute loading state
  const isLoading = !isLoaded || preferencesLoading || ratesLoading;

  // Compute stale state
  const isStale = ratesData?.isStale ?? false;

  const value = useMemo<CurrencyContextValue>(
    () => ({
      displayCurrency,
      setDisplayCurrency,
      rates,
      isLoading,
      isStale,
      ratesFetchedAt,
      convert,
      refreshRates,
    }),
    [
      displayCurrency,
      setDisplayCurrency,
      rates,
      isLoading,
      isStale,
      ratesFetchedAt,
      convert,
      refreshRates,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to access currency context.
 * Must be used within a CurrencyProvider.
 *
 * @returns CurrencyContextValue
 * @throws Error if used outside CurrencyProvider
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { displayCurrency, convert, isLoading } = useCurrency();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   const valueInDisplayCurrency = convert(holding.value, holding.currency);
 *   return <span>{formatCurrency(valueInDisplayCurrency, displayCurrency)}</span>;
 * }
 * ```
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }

  return context;
}
