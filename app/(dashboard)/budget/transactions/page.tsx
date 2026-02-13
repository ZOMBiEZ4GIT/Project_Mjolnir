"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
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
import { TransactionSearch } from "@/components/budget/TransactionSearch";
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
  SlidersHorizontal,
  X,
  RefreshCw,
  Download,
  Loader2,
  Pencil,
  Check,
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
  saverKey: string | null;
  categoryKey: string | null;
  tags: string[] | null;
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

interface SaverWithCategories {
  id: string;
  saverKey: string;
  displayName: string;
  emoji: string;
  saverType: string;
  categories: {
    id: string;
    categoryKey: string;
    displayName: string;
  }[];
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

async function fetchSavers(): Promise<SaverWithCategories[]> {
  const response = await fetch("/api/budget/savers");
  if (!response.ok) throw new Error("Failed to fetch savers");
  const data = await response.json();
  return data.savers;
}

async function updateTransactionClassification(
  transactionId: string,
  data: {
    category_id: string;
    saverKey?: string;
    categoryKey?: string;
    tags?: string[];
  }
): Promise<void> {
  const response = await fetch(
    `/api/budget/transactions/${transactionId}/category`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to update classification");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
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

// ---------------------------------------------------------------------------
// Classification label: "emoji Saver > Category"
// ---------------------------------------------------------------------------

function ClassificationLabel({
  transaction,
  savers,
}: {
  transaction: BudgetTransaction;
  savers: SaverWithCategories[];
}) {
  const saver = savers.find((s) => s.saverKey === transaction.saverKey);
  const category = saver?.categories.find(
    (c) => c.categoryKey === transaction.categoryKey
  );

  if (!saver) {
    return (
      <span className="text-xs text-muted-foreground">Unclassified</span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground truncate">
      {saver.emoji} {saver.displayName}
      {category && (
        <>
          <span className="mx-1 text-muted-foreground/60">&rsaquo;</span>
          {category.displayName}
        </>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tag pills
// ---------------------------------------------------------------------------

function TagPills({ tags }: { tags: string[] | null }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form (inline)
// ---------------------------------------------------------------------------

function TransactionEditForm({
  transaction,
  savers,
  categories,
  onSave,
  onCancel,
  isSaving,
}: {
  transaction: BudgetTransaction;
  savers: SaverWithCategories[];
  categories: BudgetCategory[];
  onSave: (data: {
    category_id: string;
    saverKey: string;
    categoryKey: string;
    tags: string[];
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [selectedSaverKey, setSelectedSaverKey] = useState(
    transaction.saverKey ?? ""
  );
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(
    transaction.categoryKey ?? ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    transaction.mjolnirCategoryId ?? ""
  );
  const [tagsInput, setTagsInput] = useState(
    (transaction.tags ?? []).join(", ")
  );

  // Get categories for selected saver
  const selectedSaver = savers.find((s) => s.saverKey === selectedSaverKey);
  const saverCategories = selectedSaver?.categories ?? [];

  // Also get the BudgetCategory entries that match the saver's categories
  const filteredCategories = categories.filter((cat) =>
    saverCategories.some((sc) => sc.id === cat.id)
  );

  const handleSaverChange = (value: string) => {
    setSelectedSaverKey(value);
    // Reset category when saver changes
    setSelectedCategoryKey("");
    setSelectedCategoryId("");
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    // Find the matching categoryKey
    const cat = saverCategories.find((c) => c.id === categoryId);
    if (cat) {
      setSelectedCategoryKey(cat.categoryKey);
    }
  };

  const handleSubmit = () => {
    if (!selectedCategoryId) return;
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      category_id: selectedCategoryId,
      saverKey: selectedSaverKey,
      categoryKey: selectedCategoryKey,
      tags: parsedTags,
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Edit Classification
      </div>

      {/* Saver dropdown */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Saver</Label>
        <Select value={selectedSaverKey} onValueChange={handleSaverChange}>
          <SelectTrigger className="h-8 text-xs bg-background border-border">
            <SelectValue placeholder="Select saver..." />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {savers
              .filter((s) => s.saverType === "spending")
              .map((s) => (
                <SelectItem
                  key={s.saverKey}
                  value={s.saverKey}
                  className="text-foreground py-2"
                >
                  {s.emoji} {s.displayName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category dropdown (filtered by saver) */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select
          value={selectedCategoryId}
          onValueChange={handleCategoryChange}
          disabled={!selectedSaverKey}
        >
          <SelectTrigger className="h-8 text-xs bg-background border-border">
            <SelectValue
              placeholder={
                selectedSaverKey
                  ? "Select category..."
                  : "Select saver first"
              }
            />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {filteredCategories.map((cat) => {
              const CatIcon = ICON_MAP[cat.icon] ?? Tag;
              return (
                <SelectItem
                  key={cat.id}
                  value={cat.id}
                  className="text-foreground py-2"
                >
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
      </div>

      {/* Tags input */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          Tags (comma-separated)
        </Label>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. weekly, fixed-cost"
          className="h-8 text-xs bg-background border-border"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleSubmit}
          disabled={!selectedCategoryId || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryBadge (legacy — still used for quick category-only changes)
// ---------------------------------------------------------------------------

function CategoryBadge({
  transaction,
  categories,
  onCategoryChange,
}: {
  transaction: BudgetTransaction;
  categories: BudgetCategory[];
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}) {
  const category = categories.find(
    (c) => c.id === transaction.mjolnirCategoryId
  );
  const IconComponent = category ? ICON_MAP[category.icon] ?? Tag : Tag;

  return (
    <Select
      value={transaction.mjolnirCategoryId ?? "uncategorised"}
      onValueChange={(value) => onCategoryChange(transaction.id, value)}
    >
      <SelectTrigger className="h-8 sm:h-7 w-auto min-w-[120px] sm:min-w-[130px] max-w-[180px] border-0 bg-transparent px-2 py-0 text-xs font-medium hover:bg-accent/10 active:bg-accent/20 focus:ring-0 focus:ring-offset-0">
        <span className="flex items-center gap-1.5 truncate">
          <IconComponent className="h-3.5 w-3.5 shrink-0" />
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: category?.colour ?? "#6B7280" }}
          />
          <span className="truncate">
            {category?.name ?? "Uncategorised"}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {categories.map((cat) => {
          const CatIcon = ICON_MAP[cat.icon] ?? Tag;
          return (
            <SelectItem
              key={cat.id}
              value={cat.id}
              className="text-foreground py-2.5"
            >
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

// ---------------------------------------------------------------------------
// Mobile transaction card
// ---------------------------------------------------------------------------

function TransactionCard({
  transaction,
  categories,
  savers,
  editingId,
  onEditStart,
  onEditCancel,
  onEditSave,
  isSaving,
}: {
  transaction: BudgetTransaction;
  categories: BudgetCategory[];
  savers: SaverWithCategories[];
  editingId: string | null;
  onEditStart: (id: string) => void;
  onEditCancel: () => void;
  onEditSave: (
    transactionId: string,
    data: {
      category_id: string;
      saverKey: string;
      categoryKey: string;
      tags: string[];
    }
  ) => void;
  isSaving: boolean;
}) {
  const isEditing = editingId === transaction.id;

  return (
    <div className="px-3 py-3 border-b border-border last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-foreground truncate">
              {transaction.description}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-sm font-mono whitespace-nowrap ${
                  transaction.amountCents < 0
                    ? "text-destructive"
                    : "text-positive"
                }`}
              >
                {transaction.amountCents < 0 ? "-" : "+"}
                {formatAmount(transaction.amountCents)}
              </span>
              {!isEditing && (
                <button
                  onClick={() => onEditStart(transaction.id)}
                  className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit classification"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {formatDateShort(transaction.transactionDate)}
            </span>
            <ClassificationLabel transaction={transaction} savers={savers} />
            {transaction.status === "HELD" && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning">
                HELD
              </span>
            )}
          </div>
          <TagPills tags={transaction.tags} />
        </div>
      </div>

      {isEditing && (
        <div className="mt-3">
          <TransactionEditForm
            transaction={transaction}
            savers={savers}
            categories={categories}
            onSave={(data) => onEditSave(transaction.id, data)}
            onCancel={onEditCancel}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BudgetTransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Read filters from URL
  const categoryFilter = searchParams.get("category") ?? undefined;
  const saverFilter = searchParams.get("saver") ?? undefined;
  const tagFilter = searchParams.get("tag") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;
  const fromFilter = searchParams.get("from") ?? undefined;
  const toFilter = searchParams.get("to") ?? undefined;
  const searchFilter = searchParams.get("search") ?? undefined;
  const uncategorisedFilter = searchParams.get("uncategorised") ?? undefined;
  const page = Math.max(
    parseInt(searchParams.get("page") ?? "1", 10) || 1,
    1
  );
  const offset = (page - 1) * PAGE_SIZE;

  // Local state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const current: Record<string, string | undefined> = {
        category: categoryFilter,
        saver: saverFilter,
        tag: tagFilter,
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

      router.push(
        `/budget/transactions${params.toString() ? `?${params.toString()}` : ""}`
      );
    },
    [
      categoryFilter,
      saverFilter,
      tagFilter,
      statusFilter,
      fromFilter,
      toFilter,
      searchFilter,
      uncategorisedFilter,
      router,
    ]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", String(newPage));
      } else {
        params.delete("page");
      }
      router.push(
        `/budget/transactions${params.toString() ? `?${params.toString()}` : ""}`
      );
    },
    [searchParams, router]
  );

  // Build API query params
  const apiParams = new URLSearchParams();
  if (categoryFilter) apiParams.set("category", categoryFilter);
  if (saverFilter) apiParams.set("saver", saverFilter);
  if (tagFilter) apiParams.set("tag", tagFilter);
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
  });

  const { data: savers = [] } = useQuery({
    queryKey: queryKeys.budget.savers,
    queryFn: fetchSavers,
  });

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.budget.transactions.list({
      category: categoryFilter,
      saver: saverFilter,
      tag: tagFilter,
      status: statusFilter,
      from: fromFilter,
      to: toFilter,
      search: searchFilter,
      uncategorised: uncategorisedFilter,
      page: String(page),
    }),
    queryFn: () => fetchBudgetTransactions(apiParams),
  });

  const classificationMutation = useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: {
        category_id: string;
        saverKey?: string;
        categoryKey?: string;
        tags?: string[];
      };
    }) => updateTransactionClassification(transactionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.transactions.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.budget.summary(),
      });
      setEditingTransactionId(null);
    },
  });

  const handleCategoryChange = useCallback(
    (transactionId: string, categoryId: string) => {
      classificationMutation.mutate({
        transactionId,
        data: { category_id: categoryId },
      });
    },
    [classificationMutation]
  );

  const handleEditSave = useCallback(
    (
      transactionId: string,
      data: {
        category_id: string;
        saverKey: string;
        categoryKey: string;
        tags: string[];
      }
    ) => {
      classificationMutation.mutate({ transactionId, data });
    },
    [classificationMutation]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value || undefined });
    },
    [updateFilters]
  );

  const handleExportTransactions = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "transactions");
      if (fromFilter) params.set("from", fromFilter);
      if (toFilter) params.set("to", toFilter);
      const url = `/api/budget/export?${params.toString()}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }, [fromFilter, toFilter]);

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters =
    categoryFilter ||
    saverFilter ||
    tagFilter ||
    statusFilter ||
    fromFilter ||
    toFilter ||
    searchFilter ||
    uncategorisedFilter;
  const activeFilterCount = [
    categoryFilter,
    saverFilter,
    tagFilter,
    statusFilter,
    fromFilter,
    toFilter,
    searchFilter,
    uncategorisedFilter,
  ].filter(Boolean).length;

  // Desktop filter bar (visible at sm+ breakpoints)
  const DesktopFilterBar = () => (
    <div className="hidden sm:flex flex-wrap gap-4 mb-4 items-end">
      {/* Saver filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Saver</Label>
        <Select
          value={saverFilter ?? "all"}
          onValueChange={(value) =>
            updateFilters({ saver: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
            <SelectValue placeholder="All savers" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">
              All savers
            </SelectItem>
            {savers
              .filter((s) => s.saverType === "spending")
              .map((s) => (
                <SelectItem
                  key={s.saverKey}
                  value={s.saverKey}
                  className="text-foreground"
                >
                  {s.emoji} {s.displayName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Category</Label>
        <Select
          value={
            uncategorisedFilter === "true"
              ? "__uncategorised"
              : categoryFilter ?? "all"
          }
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
            <SelectItem value="all" className="text-foreground">
              All categories
            </SelectItem>
            <SelectItem
              value="__uncategorised"
              className="text-warning font-medium"
            >
              Uncategorised only
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem
                key={cat.id}
                value={cat.id}
                className="text-foreground"
              >
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
          onValueChange={(value) =>
            updateFilters({ status: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[130px] bg-background border-border text-foreground">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">
              All
            </SelectItem>
            <SelectItem value="HELD" className="text-foreground">
              Held
            </SelectItem>
            <SelectItem value="SETTLED" className="text-foreground">
              Settled
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tag filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Tag</Label>
        <Input
          value={tagFilter ?? ""}
          onChange={(e) =>
            updateFilters({ tag: e.target.value || undefined })
          }
          placeholder="Filter by tag..."
          className="w-[150px] bg-background border-border text-foreground h-9"
        />
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">From</Label>
        <Input
          type="date"
          value={fromFilter ?? ""}
          onChange={(e) =>
            updateFilters({ from: e.target.value || undefined })
          }
          className="w-[150px] bg-background border-border text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">To</Label>
        <Input
          type="date"
          value={toFilter ?? ""}
          onChange={(e) =>
            updateFilters({ to: e.target.value || undefined })
          }
          className="w-[150px] bg-background border-border text-foreground"
        />
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">Search</Label>
        <TransactionSearch
          value={searchFilter ?? ""}
          onChange={handleSearchChange}
          className="w-[220px]"
          placeholder="Description..."
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <div className="flex flex-col gap-1.5 justify-end">
          <Label className="text-muted-foreground text-sm invisible">
            Clear
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/budget/transactions")}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile filter panel (visible below sm breakpoint)
  const MobileFilterPanel = () => (
    <div className="sm:hidden mb-4">
      {/* Filter toggle + search row */}
      <div className="flex gap-2 mb-3">
        <TransactionSearch
          value={searchFilter ?? ""}
          onChange={handleSearchChange}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-10 w-10 relative"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          {filtersOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <SlidersHorizontal className="h-4 w-4" />
          )}
          {activeFilterCount > 0 && !filtersOpen && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          {/* Saver */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-sm">Saver</Label>
            <Select
              value={saverFilter ?? "all"}
              onValueChange={(value) =>
                updateFilters({
                  saver: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue placeholder="All savers" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="text-foreground py-2.5">
                  All savers
                </SelectItem>
                {savers
                  .filter((s) => s.saverType === "spending")
                  .map((s) => (
                    <SelectItem
                      key={s.saverKey}
                      value={s.saverKey}
                      className="text-foreground py-2.5"
                    >
                      {s.emoji} {s.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-sm">Category</Label>
            <Select
              value={
                uncategorisedFilter === "true"
                  ? "__uncategorised"
                  : categoryFilter ?? "all"
              }
              onValueChange={(value) => {
                if (value === "__uncategorised") {
                  updateFilters({
                    uncategorised: "true",
                    category: undefined,
                  });
                } else if (value === "all") {
                  updateFilters({
                    category: undefined,
                    uncategorised: undefined,
                  });
                } else {
                  updateFilters({
                    category: value,
                    uncategorised: undefined,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="text-foreground py-2.5">
                  All categories
                </SelectItem>
                <SelectItem
                  value="__uncategorised"
                  className="text-warning font-medium py-2.5"
                >
                  Uncategorised only
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-foreground py-2.5"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-sm">Status</Label>
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(value) =>
                updateFilters({
                  status: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="text-foreground py-2.5">
                  All
                </SelectItem>
                <SelectItem value="HELD" className="text-foreground py-2.5">
                  Held
                </SelectItem>
                <SelectItem
                  value="SETTLED"
                  className="text-foreground py-2.5"
                >
                  Settled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-sm">Tag</Label>
            <Input
              value={tagFilter ?? ""}
              onChange={(e) =>
                updateFilters({ tag: e.target.value || undefined })
              }
              placeholder="Filter by tag..."
              className="w-full bg-background border-border text-foreground"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-sm">From</Label>
              <Input
                type="date"
                value={fromFilter ?? ""}
                onChange={(e) =>
                  updateFilters({ from: e.target.value || undefined })
                }
                className="w-full bg-background border-border text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-sm">To</Label>
              <Input
                type="date"
                value={toFilter ?? ""}
                onChange={(e) =>
                  updateFilters({ to: e.target.value || undefined })
                }
                className="w-full bg-background border-border text-foreground"
              />
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltersOpen(false);
                router.push("/budget/transactions");
              }}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const FilterBar = () => (
    <>
      <DesktopFilterBar />
      <MobileFilterPanel />
    </>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
          Budget Transactions
        </h1>
        <FilterBar />
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-muted-foreground">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
          Budget Transactions
        </h1>
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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
          Budget Transactions
        </h1>
        <FilterBar />
        <EmptyState
          icon={hasFilters ? Search : AlertCircle}
          title={
            hasFilters
              ? "No transactions match your filters"
              : "No transactions yet"
          }
          description={
            hasFilters
              ? "Try adjusting your filters to see more results."
              : "Transactions from UP Bank will appear here once they are synced via n8n."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => router.push("/budget/transactions")}
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
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Header with refresh + export buttons */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Budget Transactions
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTransactions}
            disabled={isExporting}
            className="gap-1.5"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <FilterBar />

      {/* Results summary */}
      <div className="text-sm text-muted-foreground mb-3">
        Showing {total} transaction{total !== 1 ? "s" : ""}
        {totalPages > 1 && ` — page ${page} of ${totalPages}`}
      </div>

      {/* Mobile card list (below sm) */}
      <div className="sm:hidden rounded-lg border border-border">
        {transactions.map((txn) => (
          <TransactionCard
            key={txn.id}
            transaction={txn}
            categories={categories}
            savers={savers}
            editingId={editingTransactionId}
            onEditStart={setEditingTransactionId}
            onEditCancel={() => setEditingTransactionId(null)}
            onEditSave={handleEditSave}
            isSaving={classificationMutation.isPending}
          />
        ))}
      </div>

      {/* Desktop table (sm and above) */}
      <div className="hidden sm:block rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                Amount
              </TableHead>
              <TableHead className="text-muted-foreground">
                Classification
              </TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">
                Status
              </TableHead>
              <TableHead className="text-muted-foreground w-10" />
            </TableRow>
          </TableHeader>
          <tbody className="[&_tr:last-child]:border-0">
            {transactions.map((txn) => (
              <TableRow
                key={txn.id}
                className="border-border hover:bg-accent/5"
              >
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(txn.transactionDate)}
                </TableCell>
                <TableCell className="text-foreground max-w-[250px]">
                  <div className="truncate" title={txn.description}>
                    {txn.description}
                  </div>
                  {txn.rawText && txn.rawText !== txn.description && (
                    <div
                      className="text-xs text-muted-foreground truncate"
                      title={txn.rawText}
                    >
                      {txn.rawText}
                    </div>
                  )}
                  <TagPills tags={txn.tags} />
                </TableCell>
                <TableCell className="text-right font-mono whitespace-nowrap">
                  <span
                    className={
                      txn.amountCents < 0
                        ? "text-destructive"
                        : "text-positive"
                    }
                  >
                    {txn.amountCents < 0 ? "-" : "+"}
                    {formatAmount(txn.amountCents)}
                  </span>
                </TableCell>
                <TableCell>
                  {editingTransactionId === txn.id ? (
                    <TransactionEditForm
                      transaction={txn}
                      savers={savers}
                      categories={categories}
                      onSave={(data) => handleEditSave(txn.id, data)}
                      onCancel={() => setEditingTransactionId(null)}
                      isSaving={classificationMutation.isPending}
                    />
                  ) : (
                    <div className="space-y-0.5">
                      <ClassificationLabel
                        transaction={txn}
                        savers={savers}
                      />
                      <CategoryBadge
                        transaction={txn}
                        categories={categories}
                        onCategoryChange={handleCategoryChange}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
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
                <TableCell>
                  {editingTransactionId !== txn.id && (
                    <button
                      onClick={() => setEditingTransactionId(txn.id)}
                      className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit classification"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
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
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
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
