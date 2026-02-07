"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  DollarSign,
  HelpCircle,
  Tag,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";

export const dynamic = "force-dynamic";

// Map category icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  DollarSign,
  HelpCircle,
};

interface BudgetTransaction {
  id: string;
  upTransactionId: string;
  description: string;
  rawText: string | null;
  amountCents: number;
  status: "HELD" | "SETTLED";
  mjolnirCategoryId: string | null;
  transactionDate: string;
  settledAt: string | null;
}

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  colour: string;
  sortOrder: number;
  isIncome: boolean;
  isSystem: boolean;
}

interface TransactionsResponse {
  transactions: BudgetTransaction[];
  total: number;
}

const PAGE_SIZE = 50;

async function fetchBudgetTransactions(
  params: URLSearchParams
): Promise<TransactionsResponse> {
  const response = await fetch(`/api/budget/transactions?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch transactions");
  return response.json();
}

async function fetchCategories(): Promise<BudgetCategory[]> {
  const response = await fetch("/api/budget/categories");
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

async function updateTransactionCategory(
  transactionId: string,
  categoryId: string
): Promise<void> {
  const response = await fetch(`/api/budget/transactions/${transactionId}/category`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId }),
  });
  if (!response.ok) throw new Error("Failed to update category");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amountCents: number): string {
  const abs = Math.abs(amountCents) / 100;
  return abs.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });
}

function CategoryBadge({
  transaction,
  categories,
  onCategoryChange,
}: {
  transaction: BudgetTransaction;
  categories: BudgetCategory[];
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}) {
  const category = categories.find((c) => c.id === transaction.mjolnirCategoryId);
  const IconComponent = category ? ICON_MAP[category.icon] ?? Tag : Tag;

  return (
    <Select
      value={transaction.mjolnirCategoryId ?? "uncategorised"}
      onValueChange={(value) => onCategoryChange(transaction.id, value)}
    >
      <SelectTrigger
        className="h-7 w-auto min-w-[130px] max-w-[180px] border-0 bg-transparent px-2 py-0 text-xs font-medium hover:bg-accent/10 focus:ring-0 focus:ring-offset-0"
      >
        <span className="flex items-center gap-1.5 truncate">
          <IconComponent className="h-3.5 w-3.5 shrink-0" />
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: category?.colour ?? "#6B7280" }}
          />
          <span className="truncate">{category?.name ?? "Uncategorised"}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {categories.map((cat) => {
          const CatIcon = ICON_MAP[cat.icon] ?? Tag;
          return (
            <SelectItem key={cat.id} value={cat.id} className="text-foreground">
              <span className="flex items-center gap-2">
                <CatIcon className="h-3.5 w-3.5" />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.colour }}
                />
                {cat.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default function BudgetTransactionsPage() {
  const { isLoaded, isSignedIn } = useAuthSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Read filters from URL
  const categoryFilter = searchParams.get("category") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;
  const fromFilter = searchParams.get("from") ?? undefined;
  const toFilter = searchParams.get("to") ?? undefined;
  const searchFilter = searchParams.get("search") ?? undefined;
  const uncategorisedFilter = searchParams.get("uncategorised") ?? undefined;
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Local state for search input (debounced via form submit)
  const [searchInput, setSearchInput] = useState(searchFilter ?? "");

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const current: Record<string, string | undefined> = {
        category: categoryFilter,
        status: statusFilter,
        from: fromFilter,
        to: toFilter,
        search: searchFilter,
        uncategorised: uncategorisedFilter,
      };

      // Merge updates — reset page when filters change
      const merged = { ...current, ...updates, page: undefined };

      for (const [key, value] of Object.entries(merged)) {
        if (value) params.set(key, value);
      }

      router.push(`/budget/transactions${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [categoryFilter, statusFilter, fromFilter, toFilter, searchFilter, uncategorisedFilter, router]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", String(newPage));
      } else {
        params.delete("page");
      }
      router.push(`/budget/transactions${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [searchParams, router]
  );

  // Build API query params
  const apiParams = new URLSearchParams();
  if (categoryFilter) apiParams.set("category", categoryFilter);
  if (statusFilter) apiParams.set("status", statusFilter);
  if (fromFilter) apiParams.set("from", fromFilter);
  if (toFilter) apiParams.set("to", toFilter);
  if (searchFilter) apiParams.set("search", searchFilter);
  if (uncategorisedFilter === "true") apiParams.set("uncategorised", "true");
  apiParams.set("limit", String(PAGE_SIZE));
  apiParams.set("offset", String(offset));

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.budget.categories,
    queryFn: fetchCategories,
    enabled: isLoaded && isSignedIn,
  });

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.budget.transactions.list({
      category: categoryFilter,
      status: statusFilter,
      from: fromFilter,
      to: toFilter,
      search: searchFilter,
      uncategorised: uncategorisedFilter,
      page: String(page),
    }),
    queryFn: () => fetchBudgetTransactions(apiParams),
    enabled: isLoaded && isSignedIn,
  });

  const categoryMutation = useMutation({
    mutationFn: ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) =>
      updateTransactionCategory(transactionId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.transactions.all });
    },
  });

  const handleCategoryChange = useCallback(
    (transactionId: string, categoryId: string) => {
      categoryMutation.mutate({ transactionId, categoryId });
    },
    [categoryMutation]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateFilters({ search: searchInput || undefined });
    },
    [searchInput, updateFilters]
  );

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = categoryFilter || statusFilter || fromFilter || toFilter || searchFilter || uncategorisedFilter;

  const FilterBar = () => (
    <div className="flex flex-wrap gap-4 mb-4 items-end">
      {/* Category filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Category</Label>
        <Select
          value={uncategorisedFilter === "true" ? "__uncategorised" : (categoryFilter ?? "all")}
          onValueChange={(value) => {
            if (value === "__uncategorised") {
              updateFilters({ uncategorised: "true", category: undefined });
            } else if (value === "all") {
              updateFilters({ category: undefined, uncategorised: undefined });
            } else {
              updateFilters({ category: value, uncategorised: undefined });
            }
          }}
        >
          <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">All categories</SelectItem>
            <SelectItem value="__uncategorised" className="text-warning font-medium">
              Uncategorised only
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-foreground">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Status</Label>
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(value) => updateFilters({ status: value === "all" ? undefined : value })}
        >
          <SelectTrigger className="w-[130px] bg-background border-border text-foreground">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">All</SelectItem>
            <SelectItem value="HELD" className="text-foreground">Held</SelectItem>
            <SelectItem value="SETTLED" className="text-foreground">Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">From</Label>
        <Input
          type="date"
          value={fromFilter ?? ""}
          onChange={(e) => updateFilters({ from: e.target.value || undefined })}
          className="w-[150px] bg-background border-border text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">To</Label>
        <Input
          type="date"
          value={toFilter ?? ""}
          onChange={(e) => updateFilters({ to: e.target.value || undefined })}
          className="w-[150px] bg-background border-border text-foreground"
        />
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Search</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-[180px] bg-background border-border text-foreground"
          />
          <Button type="submit" variant="outline" size="icon" className="shrink-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Clear filters */}
      {hasFilters && (
        <div className="flex flex-col gap-1.5 justify-end">
          <Label className="text-muted-foreground text-sm invisible">Clear</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              router.push("/budget/transactions");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl text-foreground">Sign in to view your transactions</h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget Transactions</h1>
        <FilterBar />
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget Transactions</h1>
        <FilterBar />
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-2">
          <p className="text-destructive">Failed to load transactions</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Budget Transactions</h1>
        <FilterBar />
        <EmptyState
          icon={hasFilters ? Search : AlertCircle}
          title={hasFilters ? "No transactions match your filters" : "No transactions yet"}
          description={
            hasFilters
              ? "Try adjusting your filters to see more results."
              : "Transactions from UP Bank will appear here once they are synced via n8n."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  router.push("/budget/transactions");
                }}
              >
                Clear all filters
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Budget Transactions</h1>
      <FilterBar />

      {/* Results summary */}
      <div className="text-sm text-muted-foreground mb-3">
        {total} transaction{total !== 1 ? "s" : ""}
        {totalPages > 1 && ` — page ${page} of ${totalPages}`}
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Description</TableHead>
              <TableHead className="text-muted-foreground text-right">Amount</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <tbody className="[&_tr:last-child]:border-0">
            {transactions.map((txn) => (
              <TableRow key={txn.id} className="border-border hover:bg-accent/5">
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(txn.transactionDate)}
                </TableCell>
                <TableCell className="text-foreground max-w-[250px]">
                  <div className="truncate" title={txn.description}>
                    {txn.description}
                  </div>
                  {txn.rawText && txn.rawText !== txn.description && (
                    <div className="text-xs text-muted-foreground truncate" title={txn.rawText}>
                      {txn.rawText}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono whitespace-nowrap">
                  <span className={txn.amountCents < 0 ? "text-destructive" : "text-positive"}>
                    {txn.amountCents < 0 ? "-" : "+"}
                    {formatAmount(txn.amountCents)}
                  </span>
                </TableCell>
                <TableCell>
                  <CategoryBadge
                    transaction={txn}
                    categories={categories}
                    onCategoryChange={handleCategoryChange}
                  />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      txn.status === "SETTLED"
                        ? "bg-positive/10 text-positive"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {txn.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
