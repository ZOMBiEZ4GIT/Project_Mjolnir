"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeftRight, Filter } from "lucide-react";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { TransactionSummary } from "@/components/transactions/transaction-summary";
import { CurrencyFilter, type CurrencyFilterValue } from "@/components/holdings/currency-filter";
import type { Holding } from "@/lib/db/schema";
import type { Currency } from "@/lib/utils/currency";

const MotionTableRow = motion.create(TableRow);

export const dynamic = "force-dynamic";

interface TransactionWithHolding {
  id: string;
  holdingId: string;
  date: string;
  action: "BUY" | "SELL" | "DIVIDEND" | "SPLIT";
  quantity: string;
  unitPrice: string;
  fees: string;
  currency: "AUD" | "NZD" | "USD";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  holding: {
    id: string;
    name: string;
    symbol: string | null;
    type: string;
    currency: string;
    exchange: string | null;
  };
}

const transactionActions = ["BUY", "SELL", "DIVIDEND", "SPLIT"] as const;
type TransactionAction = (typeof transactionActions)[number];

async function fetchTransactions(
  holdingId: string | null,
  action: string | null,
  currency: CurrencyFilterValue | null
): Promise<TransactionWithHolding[]> {
  const params = new URLSearchParams();
  if (holdingId) {
    params.set("holding_id", holdingId);
  }
  if (action) {
    params.set("action", action);
  }
  if (currency && currency !== "all") {
    params.set("currency", currency);
  }
  const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch transactions");
  }
  return response.json();
}

async function fetchTradeableHoldings(): Promise<Holding[]> {
  const response = await fetch("/api/holdings?include_dormant=true");
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch holdings");
  }
  const holdings: Holding[] = await response.json();
  // Filter to tradeable types only (stock, etf, crypto)
  return holdings.filter((h) =>
    ["stock", "etf", "crypto"].includes(h.type)
  );
}

/**
 * Calculate the total value of a transaction
 * BUY: (quantity x unit_price) + fees
 * SELL: (quantity x unit_price) - fees
 * DIVIDEND: (quantity x unit_price) (shares held x dividend per share)
 * SPLIT: 0 (no monetary value)
 */
function calculateTotal(transaction: TransactionWithHolding): number {
  const quantity = Number(transaction.quantity);
  const unitPrice = Number(transaction.unitPrice);
  const fees = Number(transaction.fees);

  if (transaction.action === "SPLIT") {
    return 0;
  }

  const baseValue = quantity * unitPrice;

  if (transaction.action === "BUY") {
    return baseValue + fees;
  }

  if (transaction.action === "SELL") {
    return baseValue - fees;
  }

  // DIVIDEND
  return baseValue;
}

/**
 * Interface for aggregated totals
 */
interface AggregatedTotals {
  totalBuys: number;
  totalSells: number;
  totalDividends: number;
  netCashFlow: number;
  buyCount: number;
  sellCount: number;
  dividendCount: number;
  totalCount: number;
  hasMixedCurrencies: boolean;
  displayCurrencyCode: Currency;
}

/**
 * Format a date string (YYYY-MM-DD) to display format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get the month key from a date string (YYYY-MM)
 */
function getMonthKey(dateString: string): string {
  return dateString.slice(0, 7);
}

/**
 * Format a month key (YYYY-MM) to display format (e.g., "February 2026")
 */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}

interface TransactionGroup {
  monthKey: string;
  label: string;
  transactions: TransactionWithHolding[];
}

/**
 * Capped stagger: 50ms per row but total stagger completes within 500ms
 */
function getCappedStaggerDelay(count: number): number {
  if (count <= 1) return 0;
  return Math.min(0.05, 0.5 / count);
}

/**
 * Get the color class for an action type badge
 * BUY: green, SELL: red, DIVIDEND: purple/accent, SPLIT: blue
 */
function getActionColorClass(action: TransactionWithHolding["action"]): string {
  switch (action) {
    case "BUY":
      return "bg-positive/20 text-positive";
    case "SELL":
      return "bg-destructive/20 text-destructive";
    case "DIVIDEND":
      return "bg-accent/20 text-accent";
    case "SPLIT":
      return "bg-blue-500/20 text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function TransactionsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const { displayCurrency, convert, isLoading: currencyLoading } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get filters from URL search params
  const selectedHoldingId = searchParams.get("holding_id");
  const selectedAction = searchParams.get("action") as TransactionAction | null;
  const selectedCurrency = (searchParams.get("currency") || "all") as CurrencyFilterValue;

  // Update URL search params when filters change
  const updateFilters = (
    holdingId: string | null,
    action: string | null,
    currency: CurrencyFilterValue
  ) => {
    const params = new URLSearchParams();
    if (holdingId) {
      params.set("holding_id", holdingId);
    }
    if (action) {
      params.set("action", action);
    }
    if (currency && currency !== "all") {
      params.set("currency", currency);
    }
    router.push(`/transactions${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleHoldingChange = (value: string) => {
    const holdingId = value === "all" ? null : value;
    updateFilters(holdingId, selectedAction, selectedCurrency);
  };

  const handleActionChange = (value: string) => {
    const action = value === "all" ? null : value;
    updateFilters(selectedHoldingId, action, selectedCurrency);
  };

  const handleCurrencyChange = (value: CurrencyFilterValue) => {
    updateFilters(selectedHoldingId, selectedAction, value);
  };

  // Fetch tradeable holdings for the filter dropdown
  const { data: tradeableHoldings } = useQuery({
    queryKey: ["holdings", "tradeable"],
    queryFn: fetchTradeableHoldings,
    enabled: isLoaded && isSignedIn,
  });

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transactions", { holdingId: selectedHoldingId, action: selectedAction, currency: selectedCurrency }],
    queryFn: () => fetchTransactions(selectedHoldingId, selectedAction, selectedCurrency),
    enabled: isLoaded && isSignedIn,
  });

  // Calculate aggregated totals
  const aggregatedTotals = useMemo<AggregatedTotals | null>(() => {
    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Check for mixed currencies
    const currencies = new Set(transactions.map((t) => t.currency));
    const hasMixedCurrencies = currencies.size > 1;

    let totalBuys = 0;
    let totalSells = 0;
    let totalDividends = 0;
    let buyCount = 0;
    let sellCount = 0;
    let dividendCount = 0;

    for (const transaction of transactions) {
      const total = calculateTotal(transaction);
      const convertedTotal = hasMixedCurrencies
        ? convert(total, transaction.currency as Currency)
        : total;

      switch (transaction.action) {
        case "BUY": {
          totalBuys += convertedTotal;
          buyCount++;
          break;
        }
        case "SELL": {
          totalSells += convertedTotal;
          sellCount++;
          break;
        }
        case "DIVIDEND": {
          totalDividends += convertedTotal;
          dividendCount++;
          break;
        }
        // SPLIT has no monetary value
      }
    }

    // Net cash flow: sells + dividends - buys (money in minus money out)
    const netCashFlow = totalSells + totalDividends - totalBuys;

    // Currency for display: use display currency if mixed, otherwise the common native currency
    const displayCurrencyCode: Currency = hasMixedCurrencies
      ? displayCurrency
      : (transactions[0].currency as Currency);

    return {
      totalBuys,
      totalSells,
      totalDividends,
      netCashFlow,
      buyCount,
      sellCount,
      dividendCount,
      totalCount: transactions.length,
      hasMixedCurrencies,
      displayCurrencyCode,
    };
  }, [transactions, convert, displayCurrency]);

  // Group transactions by month (reverse chronological)
  const transactionGroups = useMemo<TransactionGroup[]>(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const groupMap = new Map<string, TransactionWithHolding[]>();

    for (const transaction of transactions) {
      const key = getMonthKey(transaction.date);
      const group = groupMap.get(key);
      if (group) {
        group.push(transaction);
      } else {
        groupMap.set(key, [transaction]);
      }
    }

    // Sort groups by month key descending (most recent first)
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => ({
      monthKey: key,
      label: formatMonthLabel(key),
      transactions: groupMap.get(key)!,
    }));
  }, [transactions]);

  // State for edit and delete dialogs
  const [editTransaction, setEditTransaction] = useState<TransactionWithHolding | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<TransactionWithHolding | null>(null);

  // Highlight animation state — tracks which transaction was just saved
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deleting animation state — tracks which transaction is fading out
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const handleTransactionSaved = useCallback((transactionId: string) => {
    // Clear any existing timer
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedTransactionId(transactionId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedTransactionId(null);
      highlightTimerRef.current = null;
    }, 1500);
  }, []);

  const handleTransactionDeleted = useCallback((transactionId: string) => {
    setDeletingTransactionId(transactionId);
    // The fade-out animation runs for 300ms, then we clear the state
    // The query invalidation in the delete dialog will remove the row from data
    setTimeout(() => {
      setDeletingTransactionId(null);
    }, 400);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Animation setup
  const shouldReduceMotion = useReducedMotion();
  const totalRows = transactions?.length ?? 0;
  const staggerDelay = getCappedStaggerDelay(totalRows);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
      },
    },
  };

  const rowVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
      };

  // Key for AnimatePresence — changes trigger exit/enter animations
  const filterKey = `${selectedHoldingId ?? "all"}-${selectedAction ?? "all"}-${selectedCurrency}`;

  // Filter controls component
  const FilterControls = () => (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="holding-filter" className="text-muted-foreground text-sm">
          Holding
        </Label>
        <Select
          value={selectedHoldingId || "all"}
          onValueChange={handleHoldingChange}
        >
          <SelectTrigger id="holding-filter" className="w-[200px] bg-background border-border text-foreground">
            <SelectValue placeholder="All holdings" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">All holdings</SelectItem>
            {tradeableHoldings?.map((holding) => (
              <SelectItem key={holding.id} value={holding.id} className="text-foreground">
                {holding.symbol || holding.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="action-filter" className="text-muted-foreground text-sm">
          Action
        </Label>
        <Select
          value={selectedAction || "all"}
          onValueChange={handleActionChange}
        >
          <SelectTrigger id="action-filter" className="w-[140px] bg-background border-border text-foreground">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">All</SelectItem>
            {transactionActions.map((action) => (
              <SelectItem key={action} value={action} className="text-foreground">
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">
          Currency
        </Label>
        <CurrencyFilter
          value={selectedCurrency}
          onChange={handleCurrencyChange}
        />
      </div>
    </div>
  );

  // Show loading while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-foreground">Sign in to view your transactions</h2>
          <p className="text-muted-foreground">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching transactions
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Transactions</h1>
        <FilterControls />
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Transactions</h1>
        <FilterControls />
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-destructive">Failed to load transactions</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!transactions || transactions.length === 0) {
    const hasFilters = selectedHoldingId || selectedAction || selectedCurrency !== "all";

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          {!hasFilters && (
            <AddTransactionDialog>
              <Button>Add Transaction</Button>
            </AddTransactionDialog>
          )}
        </div>
        {hasFilters && <FilterControls />}
        <EmptyState
          icon={hasFilters ? Filter : ArrowLeftRight}
          title={hasFilters ? "No transactions match your filters" : "No transactions yet"}
          description={
            hasFilters
              ? "Try adjusting your filters to see more transactions, or clear all filters to view everything."
              : "Add your first transaction to start tracking your portfolio activity. Record buys, sells, dividends, and stock splits."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => updateFilters(null, null, "all")}
              >
                Clear all filters
              </Button>
            ) : (
              <AddTransactionDialog>
                <Button size="lg">Add your first transaction</Button>
              </AddTransactionDialog>
            )
          }
        />
      </div>
    );
  }

  // Show transactions table
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <AddTransactionDialog onTransactionSaved={handleTransactionSaved}>
          <Button>Add Transaction</Button>
        </AddTransactionDialog>
      </div>
      <FilterControls />
      {aggregatedTotals && (
        <TransactionSummary
          totalBuys={aggregatedTotals.totalBuys}
          totalSells={aggregatedTotals.totalSells}
          totalDividends={aggregatedTotals.totalDividends}
          netCashFlow={aggregatedTotals.netCashFlow}
          buyCount={aggregatedTotals.buyCount}
          sellCount={aggregatedTotals.sellCount}
          dividendCount={aggregatedTotals.dividendCount}
          totalCount={aggregatedTotals.totalCount}
          currency={aggregatedTotals.displayCurrencyCode}
          isLoading={currencyLoading}
        />
      )}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground sticky left-0 bg-background z-10">Date</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Holding</TableHead>
              <TableHead className="text-muted-foreground">Action</TableHead>
              <TableHead className="text-muted-foreground text-right hidden md:table-cell">Quantity</TableHead>
              <TableHead className="text-muted-foreground text-right hidden sm:table-cell">Unit Price</TableHead>
              <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Fees</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-muted-foreground text-right w-[80px] sm:w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <AnimatePresence mode="wait">
            <motion.tbody
              key={filterKey}
              className="[&_tr:last-child]:border-0"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
            >
              {transactionGroups.map((group) => (
                <Fragment key={group.monthKey}>
                  {/* Sticky month header */}
                  <TableRow
                    className="border-border hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={8}
                      className="sticky top-0 z-20 bg-background border-b border-border px-4 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {group.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.transactions.length} transaction{group.transactions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.transactions.map((transaction) => {
                    const total = calculateTotal(transaction);
                    const isHighlighted = highlightedTransactionId === transaction.id;
                    const isDeleting = deletingTransactionId === transaction.id;
                    return (
                      <MotionTableRow
                        key={transaction.id}
                        variants={rowVariants}
                        className={`border-border transition-[background-color] duration-150 hover:bg-accent/5 ${
                          isDeleting ? "pointer-events-none" : ""
                        }`}
                        animate={
                          isDeleting
                            ? { opacity: 0, x: -20, transition: { duration: shouldReduceMotion ? 0 : 0.3 } }
                            : isHighlighted && !shouldReduceMotion
                              ? {
                                  opacity: 1,
                                  y: 0,
                                  backgroundColor: [
                                    "hsl(var(--accent) / 0.1)",
                                    "hsl(var(--accent) / 0)",
                                  ],
                                  transition: { backgroundColor: { duration: 1, ease: "easeOut" } },
                                }
                              : "visible"
                        }
                      >
                        <TableCell className="text-muted-foreground sticky left-0 bg-background z-10">
                          <div className="flex flex-col">
                            <span>{formatDate(transaction.date)}</span>
                            {/* Show holding name on mobile only (since Holding column is hidden) */}
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {transaction.holding.symbol || transaction.holding.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground font-medium hidden sm:table-cell">
                          {transaction.holding.symbol || transaction.holding.name}
                          {transaction.holding.symbol && (
                            <span className="text-muted-foreground text-sm ml-2 hidden md:inline">
                              {transaction.holding.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColorClass(
                              transaction.action
                            )}`}
                          >
                            {transaction.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right font-mono hidden md:table-cell">
                          {transaction.action === "SPLIT"
                            ? `${transaction.quantity}:1`
                            : Number(transaction.quantity).toLocaleString("en-AU", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 8,
                              })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right font-mono hidden sm:table-cell">
                          {transaction.action === "SPLIT" ? (
                            "—"
                          ) : (
                            <CurrencyDisplay
                              amount={Number(transaction.unitPrice)}
                              currency={transaction.currency}
                              isLoading={currencyLoading}
                              className="justify-end"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right font-mono hidden lg:table-cell">
                          {transaction.action === "SPLIT" ||
                          Number(transaction.fees) === 0 ? (
                            "—"
                          ) : (
                            <CurrencyDisplay
                              amount={Number(transaction.fees)}
                              currency={transaction.currency}
                              isLoading={currencyLoading}
                              className="justify-end"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-foreground text-right font-mono font-medium">
                          {transaction.action === "SPLIT" ? (
                            "—"
                          ) : (
                            <CurrencyDisplay
                              amount={total}
                              currency={transaction.currency}
                              isLoading={currencyLoading}
                              className="justify-end"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-[44px] w-[44px] sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditTransaction(transaction)}
                            >
                              <span className="sr-only">Edit</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="sm:w-4 sm:h-4"
                              >
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-[44px] w-[44px] sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTransaction(transaction)}
                            >
                              <span className="sr-only">Delete</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="sm:w-4 sm:h-4"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </MotionTableRow>
                    );
                  })}
                </Fragment>
              ))}
            </motion.tbody>
          </AnimatePresence>
        </Table>
      </div>

      {/* Edit Transaction Dialog */}
      {editTransaction && (
        <EditTransactionDialog
          transaction={editTransaction}
          open={!!editTransaction}
          onOpenChange={(open) => {
            if (!open) setEditTransaction(null);
          }}
          onTransactionSaved={handleTransactionSaved}
        />
      )}

      {/* Delete Transaction Dialog */}
      {deleteTransaction && (
        <DeleteTransactionDialog
          transaction={deleteTransaction}
          open={!!deleteTransaction}
          onOpenChange={(open) => {
            if (!open) setDeleteTransaction(null);
          }}
          onDeleted={handleTransactionDeleted}
        />
      )}
    </div>
  );
}
