"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import {
  Table,
  TableBody,
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
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import type { Holding } from "@/lib/db/schema";

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
  action: string | null
): Promise<TransactionWithHolding[]> {
  const params = new URLSearchParams();
  if (holdingId) {
    params.set("holding_id", holdingId);
  }
  if (action) {
    params.set("action", action);
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
 * Format a number as currency
 */
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get filters from URL search params
  const selectedHoldingId = searchParams.get("holding_id");
  const selectedAction = searchParams.get("action") as TransactionAction | null;

  // Update URL search params when filters change
  const updateFilters = (
    holdingId: string | null,
    action: string | null
  ) => {
    const params = new URLSearchParams();
    if (holdingId) {
      params.set("holding_id", holdingId);
    }
    if (action) {
      params.set("action", action);
    }
    router.push(`/transactions${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleHoldingChange = (value: string) => {
    const holdingId = value === "all" ? null : value;
    updateFilters(holdingId, selectedAction);
  };

  const handleActionChange = (value: string) => {
    const action = value === "all" ? null : value;
    updateFilters(selectedHoldingId, action);
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
    queryKey: ["transactions", { holdingId: selectedHoldingId, action: selectedAction }],
    queryFn: () => fetchTransactions(selectedHoldingId, selectedAction),
    enabled: isLoaded && isSignedIn,
  });

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
              {selectedHoldingId || selectedAction
                ? "No transactions match your filters"
                : "No transactions yet"}
            </p>
            <p className="text-sm mt-2">
              {selectedHoldingId || selectedAction
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
                    {transaction.action === "SPLIT"
                      ? "—"
                      : formatCurrency(
                          Number(transaction.unitPrice),
                          transaction.currency
                        )}
                  </TableCell>
                  <TableCell className="text-gray-300 text-right font-mono">
                    {transaction.action === "SPLIT" ||
                    Number(transaction.fees) === 0
                      ? "—"
                      : formatCurrency(
                          Number(transaction.fees),
                          transaction.currency
                        )}
                  </TableCell>
                  <TableCell className="text-white text-right font-mono font-medium">
                    {transaction.action === "SPLIT"
                      ? "—"
                      : formatCurrency(total, transaction.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
