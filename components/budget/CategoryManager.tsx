"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSafe } from "@/lib/hooks/use-auth-safe";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUp,
  ArrowDown,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
  Search,
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  DollarSign,
  HelpCircle,
  Briefcase,
  BookOpen,
  Music,
  Plane,
  Wifi,
  Coffee,
  Gift,
  Zap,
  Droplets,
  Dog,
  Baby,
  GraduationCap,
  Dumbbell,
  Palette,
  Wrench,
  Phone,
  Monitor,
  Shirt,
  Pill,
  Bus,
  Bike,
  Fuel,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  colour: string;
  sortOrder: number;
  isIncome: boolean;
  isSystem: boolean;
}

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Gamepad2,
  DollarSign,
  HelpCircle,
  Briefcase,
  BookOpen,
  Music,
  Plane,
  Wifi,
  Coffee,
  Gift,
  Zap,
  Droplets,
  Dog,
  Baby,
  GraduationCap,
  Dumbbell,
  Palette,
  Wrench,
  Phone,
  Monitor,
  Shirt,
  Pill,
  Bus,
  Bike,
  Fuel,
};

// ---------------------------------------------------------------------------
// Colour palette (16 preset colours)
// ---------------------------------------------------------------------------

const COLOUR_PALETTE = [
  "#6366F1", // Indigo
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#22C55E", // Green
  "#10B981", // Emerald
  "#84CC16", // Lime
  "#EAB308", // Yellow
  "#F97316", // Orange
  "#EF4444", // Red
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#A855F7", // Purple
  "#8B5CF6", // Violet
  "#6B7280", // Gray
  "#78716C", // Stone
  "#0EA5E9", // Sky
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchCategories(): Promise<BudgetCategory[]> {
  const res = await fetch("/api/budget/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function createCategory(data: {
  id: string;
  name: string;
  icon: string;
  colour: string;
  sortOrder?: number;
  isIncome?: boolean;
}): Promise<BudgetCategory> {
  const res = await fetch("/api/budget/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create category" }));
    throw new Error(err.error || "Failed to create category");
  }
  return res.json();
}

async function updateCategory(
  id: string,
  data: { name?: string; icon?: string; colour?: string; sortOrder?: number }
): Promise<BudgetCategory> {
  const res = await fetch(`/api/budget/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update category" }));
    throw new Error(err.error || "Failed to update category");
  }
  return res.json();
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/budget/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete category" }));
    throw new Error(err.error || "Failed to delete category");
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IconSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return Object.keys(ICON_REGISTRY);
    const q = search.toLowerCase();
    return Object.keys(ICON_REGISTRY).filter((name) =>
      name.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-2">
      <Label>Icon</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto rounded-md border border-border p-2">
        {filtered.map((name) => {
          const Icon = ICON_REGISTRY[name];
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`flex items-center justify-center h-8 w-full rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={name}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground text-center py-2">
            No icons found
          </p>
        )}
      </div>
    </div>
  );
}

function ColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (colour: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Colour</Label>
      <div className="grid grid-cols-8 gap-1.5">
        {COLOUR_PALETTE.map((colour) => {
          const isSelected = value === colour;
          return (
            <button
              key={colour}
              type="button"
              onClick={() => onChange(colour)}
              className={`h-7 w-full rounded-md transition-all ${
                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
              style={{ backgroundColor: colour }}
              title={colour}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryManager
// ---------------------------------------------------------------------------

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuthSafe();

  // UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("Home");
  const [formColour, setFormColour] = useState(COLOUR_PALETTE[0]);

  // ---- Query ---------------------------------------------------------------

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.budget.categories,
    queryFn: fetchCategories,
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5,
  });

  // ---- Mutations -----------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.categories });
      toast.success("Category created");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; icon?: string; colour?: string; sortOrder?: number }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.categories });
      toast.success("Category updated");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.categories });
      toast.success("Category deleted");
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Helpers -------------------------------------------------------------

  function resetForm() {
    setEditingId(null);
    setIsCreating(false);
    setFormName("");
    setFormIcon("Home");
    setFormColour(COLOUR_PALETTE[0]);
  }

  function startEditing(cat: BudgetCategory) {
    setIsCreating(false);
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormColour(cat.colour);
  }

  function startCreating() {
    setEditingId(null);
    setIsCreating(true);
    setFormName("");
    setFormIcon("Home");
    setFormColour(COLOUR_PALETTE[0]);
  }

  function handleSave() {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    if (isCreating) {
      const slug = formName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (!slug) {
        toast.error("Name must contain letters or numbers");
        return;
      }

      createMutation.mutate({
        id: slug,
        name: formName.trim(),
        icon: formIcon,
        colour: formColour,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formName.trim(),
        icon: formIcon,
        colour: formColour,
      });
    }
  }

  async function handleReorder(catId: string, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === catId);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const current = sorted[idx];
    const swap = sorted[swapIdx];

    // Swap sort orders
    try {
      await updateCategory(current.id, { sortOrder: swap.sortOrder });
      await updateCategory(swap.id, { sortOrder: current.sortOrder });
      queryClient.invalidateQueries({ queryKey: queryKeys.budget.categories });
    } catch {
      toast.error("Failed to reorder categories");
    }
  }

  // ---- Derived values ------------------------------------------------------

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const isFormOpen = isCreating || editingId !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // ---- Render --------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Manage Categories</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Category list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading categories...</p>
      ) : (
        <div className="space-y-1">
          {sortedCategories.map((cat, idx) => {
            const IconComp = ICON_REGISTRY[cat.icon];
            const isBeingDeleted = deleteConfirmId === cat.id;

            return (
              <div
                key={cat.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  editingId === cat.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                {/* Colour dot + icon */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: cat.colour + "20" }}
                >
                  {IconComp ? (
                    <IconComp className="h-3.5 w-3.5" style={{ color: cat.colour }} />
                  ) : (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cat.colour }}
                    />
                  )}
                </div>

                {/* Name */}
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {cat.name}
                </span>

                {/* System lock or action buttons */}
                {cat.isSystem ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Reorder */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => handleReorder(cat.id, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === sortedCategories.length - 1}
                      onClick={() => handleReorder(cat.id, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEditing(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete */}
                    {isBeingDeleted ? (
                      <div className="flex items-center gap-1 ml-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => deleteMutation.mutate(cat.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "..." : "Delete"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit form */}
      {isFormOpen ? (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <h4 className="text-sm font-medium text-foreground">
            {isCreating ? "New Category" : "Edit Category"}
          </h4>

          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Subscriptions"
              className="h-9"
            />
          </div>

          <IconSelector value={formIcon} onChange={setFormIcon} />
          <ColourPicker value={formColour} onChange={setFormColour} />

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : isCreating ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={startCreating}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Category
        </Button>
      )}
    </div>
  );
}
