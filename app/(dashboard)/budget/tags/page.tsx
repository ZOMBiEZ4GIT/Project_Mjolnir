"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, Search, Tag, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagAggregate {
  tag: string;
  count: number;
  totalCents: number;
  avgCents: number;
}

interface Period {
  id: string;
  startDate: string;
  endDate: string;
}

type SortField = "tag" | "count" | "totalCents" | "avgCents";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TagExplorerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort header
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (
          currentDir === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TagExplorerPage() {
  const router = useRouter();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalCents");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Fetch periods for dropdown
  const { data: periods } = useQuery<Period[]>({
    queryKey: queryKeys.budget.periods.all,
    queryFn: async () => {
      const res = await fetch("/api/budget/periods");
      if (!res.ok) throw new Error("Failed to fetch periods");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  // Determine effective period ID (latest = first in desc-sorted list)
  const effectivePeriodId = selectedPeriodId || periods?.[0]?.id;

  // Fetch tags
  const { data: tagsData, isLoading } = useQuery<{ tags: TagAggregate[] }>({
    queryKey: queryKeys.budget.tags(effectivePeriodId),
    queryFn: async () => {
      const params = effectivePeriodId ? `?period_id=${effectivePeriodId}` : "";
      const res = await fetch(`/api/budget/tags${params}`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
    enabled: !!effectivePeriodId,
    staleTime: 30_000,
  });

  const tags = tagsData?.tags ?? [];

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = tags;

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.tag.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [tags, searchQuery, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleTagClick(tag: string) {
    router.push(`/budget/transactions?tag=${encodeURIComponent(tag)}`);
  }

  // Resolve selected period for display
  const activePeriod = periods?.find((p) => p.id === effectivePeriodId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/budget"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Budget"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Tag Explorer
          </h1>
        </div>

        {/* Period selector */}
        {periods && periods.length > 0 && (
          <Select
            value={effectivePeriodId ?? ""}
            onValueChange={setSelectedPeriodId}
          >
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {formatDateRange(p.startDate, p.endDate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <TagExplorerSkeleton />
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No tagged transactions"
          description={
            searchQuery
              ? `No tags matching "${searchQuery}" in this period.`
              : "No tagged transactions in this period."
          }
        />
      ) : (
        <>
          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {filteredAndSorted.length} tag{filteredAndSorted.length !== 1 ? "s" : ""}{" "}
            {activePeriod && (
              <span>
                in {formatDateRange(activePeriod.startDate, activePeriod.endDate)}
              </span>
            )}
          </p>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Tag"
                    field="tag"
                    currentSort={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Count"
                    field="count"
                    currentSort={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortableHeader
                    label="Total Spend"
                    field="totalCents"
                    currentSort={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortableHeader
                    label="Avg / Transaction"
                    field="avgCents"
                    currentSort={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((t) => (
                  <TableRow
                    key={t.tag}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTagClick(t.tag)}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{t.tag}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCents(t.totalCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCents(t.avgCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
