import { db } from "@/lib/db";
import { budgetCategories } from "@/lib/db/schema";

/**
 * Default budget categories seeded on first access.
 *
 * Each category has a short slug ID, a Lucide icon name, and a distinct hex colour.
 * The 'income' category is marked as an income source, and 'uncategorised' is a
 * system category that cannot be deleted by the user.
 */
export const defaultCategories = [
  { id: "bills-fixed", name: "Bills & Fixed", icon: "Home", colour: "#6366F1", sortOrder: 1, isIncome: false, isSystem: false },
  { id: "groceries", name: "Groceries", icon: "ShoppingCart", colour: "#22C55E", sortOrder: 2, isIncome: false, isSystem: false },
  { id: "transport", name: "Transport", icon: "Car", colour: "#3B82F6", sortOrder: 3, isIncome: false, isSystem: false },
  { id: "eating-out", name: "Eating Out", icon: "UtensilsCrossed", colour: "#F97316", sortOrder: 4, isIncome: false, isSystem: false },
  { id: "shopping", name: "Shopping", icon: "ShoppingBag", colour: "#EC4899", sortOrder: 5, isIncome: false, isSystem: false },
  { id: "health", name: "Health", icon: "Heart", colour: "#EF4444", sortOrder: 6, isIncome: false, isSystem: false },
  { id: "fun", name: "Fun", icon: "Gamepad2", colour: "#A855F7", sortOrder: 7, isIncome: false, isSystem: false },
  { id: "income", name: "Income", icon: "DollarSign", colour: "#10B981", sortOrder: 8, isIncome: true, isSystem: false },
  { id: "uncategorised", name: "Uncategorised", icon: "HelpCircle", colour: "#6B7280", sortOrder: 9, isIncome: false, isSystem: true },
] as const;

/**
 * Seeds the budget_categories table with default categories.
 * Uses onConflictDoNothing to make it idempotent — safe to call multiple times.
 */
export async function seedBudgetCategories() {
  await db
    .insert(budgetCategories)
    .values(
      defaultCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        colour: cat.colour,
        sortOrder: cat.sortOrder,
        isIncome: cat.isIncome,
        isSystem: cat.isSystem,
      }))
    )
    .onConflictDoNothing();
}
