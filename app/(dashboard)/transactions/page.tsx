"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { useCurrency } from "@/components/providers/currency-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { CurrencyFilter, type CurrencyFilterValue } from "@/components/holdings/currency-filter";
import type { Holding } from "@/lib/db/schema";
import type { Currency } from "@/lib/utils/currency";

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
  hasMixedCurrencies: boolean;
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
 * Get the color class for an action type
 * BUY/DIVIDEND: green
 * SELL: red
 * SPLIT: blue
 */
function getActionColorClass(action: TransactionWithHolding["action"]): string {
  switch (action) {
    case "BUY":
    case "DIVIDEND":
      return "bg-green-900 text-green-300";
    case "SELL":
      return "bg-red-900 text-red-300";
    case "SPLIT":
      return "bg-blue-900 text-blue-300";
    default:
      return "bg-gray-700 text-gray-300";
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

    for (const transaction of transactions) {
      const total = calculateTotal(transaction);
      // Convert to display currency if mixed, otherwise use native value
      const convertedTotal = hasMixedCurrencies
        ? convert(total, transaction.currency as Currency)
        : total;

      switch (transaction.action) {
        case "BUY": {
          totalBuys += convertedTotal;
          break;
        }
        case "SELL": {
          totalSells += convertedTotal;
          break;
        }
        case "DIVIDEND": {
          totalDividends += convertedTotal;
          break;
        }
        // SPLIT has no monetary value
      }
    }

    // Net cash flow: sells + dividends - buys (money in minus money out)
    const netCashFlow = totalSells + totalDividends - totalBuys;

    return {
      totalBuys,
      totalSells,
      totalDividends,
      netCashFlow,
      hasMixedCurrencies,
    };
  }, [transactions, convert]);

  // State for edit and delete dialogs
  const [editTransaction, setEditTransaction] = useState<TransactionWithHolding | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<TransactionWithHolding | null>(null);

  // Filter controls component
  const FilterControls = () => (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="holding-filter" className="text-gray-400 text-sm">
          Holding
        </Label>
        <Select
          value={selectedHoldingId || "all"}
          onValueChange={handleHoldingChange}
        >
          <SelectTrigger id="holding-filter" className="w-[200px] bg-gray-900 border-gray-700 text-white">
            <SelectValue placeholder="All holdings" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="all" className="text-white">All holdings</SelectItem>
            {tradeableHoldings?.map((holding) => (
              <SelectItem key={holding.id} value={holding.id} className="text-white">
                {holding.symbol || holding.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="action-filter" className="text-gray-400 text-sm">
          Action
        </Label>
        <Select
          value={selectedAction || "all"}
          onValueChange={handleActionChange}
        >
          <SelectTrigger id="action-filter" className="w-[140px] bg-gray-900 border-gray-700 text-white">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="all" className="text-white">All</SelectItem>
            {transactionActions.map((action) => (
              <SelectItem key={action} value={action} className="text-white">
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-gray-400 text-sm">
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
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-white">Sign in to view your transactions</h2>
          <p className="text-gray-400">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching transactions
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Transactions</h1>
        <FilterControls />
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-gray-400">Loading transactions...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Transactions</h1>
        <FilterControls />
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-red-400">Failed to load transactions</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <AddTransactionDialog>
            <Button>Add Transaction</Button>
          </AddTransactionDialog>
        </div>
        <FilterControls />
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <div className="text-gray-400">
            <p className="text-lg">
              {selectedHoldingId || selectedAction || selectedCurrency !== "all"
                ? "No transactions match your filters"
                : "No transactions yet"}
            </p>
            <p className="text-sm mt-2">
              {selectedHoldingId || selectedAction || selectedCurrency !== "all"
                ? "Try adjusting your filters to see more transactions."
                : "Add your first transaction to start tracking your portfolio."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show transactions table
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <AddTransactionDialog>
          <Button>Add Transaction</Button>
        </AddTransactionDialog>
      </div>
      <FilterControls />
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Holding</TableHead>
              <TableHead className="text-gray-400">Action</TableHead>
              <TableHead className="text-gray-400 text-right">Quantity</TableHead>
              <TableHead className="text-gray-400 text-right">Unit Price</TableHead>
              <TableHead className="text-gray-400 text-right">Fees</TableHead>
              <TableHead className="text-gray-400 text-right">Total</TableHead>
              <TableHead className="text-gray-400 text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const total = calculateTotal(transaction);
              return (
                <TableRow key={transaction.id} className="border-gray-800">
                  <TableCell className="text-gray-300">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {transaction.holding.symbol || transaction.holding.name}
                    {transaction.holding.symbol && (
                      <span className="text-gray-500 text-sm ml-2">
                        {transaction.holding.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColorClass(
                        transaction.action
                      )}`}
                    >
                      {transaction.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-300 text-right font-mono">
                    {transaction.action === "SPLIT"
                      ? `${transaction.quantity}:1`
                      : Number(transaction.quantity).toLocaleString("en-AU", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 8,
                        })}
                  </TableCell>
                  <TableCell className="text-gray-300 text-right font-mono">
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
                  <TableCell className="text-gray-300 text-right font-mono">
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
                  <TableCell className="text-white text-right font-mono font-medium">
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        onClick={() => setEditTransaction(transaction)}
                      >
                        <span className="sr-only">Edit</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                        onClick={() => setDeleteTransaction(transaction)}
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
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
                </TableRow>
              );
            })}
          </TableBody>
          {aggregatedTotals && (
            <TableFooter className="border-t border-gray-700">
              <TableRow className="bg-gray-900/50 hover:bg-gray-900/50">
                <TableCell colSpan={4} className="text-gray-400 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Totals</span>
                    {aggregatedTotals.hasMixedCurrencies && (
                      <span className="text-xs text-gray-500">
                        (converted to {displayCurrency})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell colSpan={3} className="text-right">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-gray-400">Buys:</span>
                      <CurrencyDisplay
                        amount={aggregatedTotals.totalBuys}
                        currency={aggregatedTotals.hasMixedCurrencies ? displayCurrency : (transactions?.[0]?.currency as Currency) || displayCurrency}
                        isLoading={currencyLoading}
                        className="text-red-400 font-mono"
                      />
                    </div>
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-gray-400">Sells:</span>
                      <CurrencyDisplay
                        amount={aggregatedTotals.totalSells}
                        currency={aggregatedTotals.hasMixedCurrencies ? displayCurrency : (transactions?.[0]?.currency as Currency) || displayCurrency}
                        isLoading={currencyLoading}
                        className="text-green-400 font-mono"
                      />
                    </div>
                    {aggregatedTotals.totalDividends > 0 && (
                      <div className="flex justify-end items-center gap-4">
                        <span className="text-gray-400">Dividends:</span>
                        <CurrencyDisplay
                          amount={aggregatedTotals.totalDividends}
                          currency={aggregatedTotals.hasMixedCurrencies ? displayCurrency : (transactions?.[0]?.currency as Currency) || displayCurrency}
                          isLoading={currencyLoading}
                          className="text-green-400 font-mono"
                        />
                      </div>
                    )}
                    <div className="flex justify-end items-center gap-4 pt-1 border-t border-gray-700">
                      <span className="text-gray-300 font-medium">Net Cash Flow:</span>
                      <CurrencyDisplay
                        amount={aggregatedTotals.netCashFlow}
                        currency={aggregatedTotals.hasMixedCurrencies ? displayCurrency : (transactions?.[0]?.currency as Currency) || displayCurrency}
                        isLoading={currencyLoading}
                        className={`font-mono font-bold ${aggregatedTotals.netCashFlow >= 0 ? "text-green-400" : "text-red-400"}`}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
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
        />
      )}
    </div>
  );
}
