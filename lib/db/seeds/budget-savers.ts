import { db } from "@/lib/db";
import { budgetSavers, budgetCategories } from "@/lib/db/schema";

// =============================================================================
// SAVER DEFINITIONS
// =============================================================================

const savers = [
  {
    saverKey: "rent",
    displayName: "Rent",
    emoji: "🏠",
    monthlyBudgetCents: 212900, // $2,129
    saverType: "spending" as const,
    sortOrder: 1,
    colour: "#6366F1",
    notes: null,
  },
  {
    saverKey: "essentials",
    displayName: "Essentials",
    emoji: "🔧",
    monthlyBudgetCents: 115700, // $1,157
    saverType: "spending" as const,
    sortOrder: 2,
    colour: "#3B82F6",
    notes: null,
  },
  {
    saverKey: "food",
    displayName: "Food",
    emoji: "🍽️",
    monthlyBudgetCents: 90400, // $904
    saverType: "spending" as const,
    sortOrder: 3,
    colour: "#22C55E",
    notes: null,
  },
  {
    saverKey: "supplements",
    displayName: "Supplements",
    emoji: "💪",
    monthlyBudgetCents: 47600, // $476
    saverType: "spending" as const,
    sortOrder: 4,
    colour: "#F97316",
    notes: "TEMPORARY — drops post-April 2026",
  },
  {
    saverKey: "debt",
    displayName: "Debt",
    emoji: "💳",
    monthlyBudgetCents: 35191, // $351.91
    saverType: "spending" as const,
    sortOrder: 5,
    colour: "#EF4444",
    notes: null,
  },
  {
    saverKey: "vitamins",
    displayName: "Vitamins",
    emoji: "💊",
    monthlyBudgetCents: 10000, // $100
    saverType: "savings_goal" as const,
    sortOrder: 6,
    colour: "#EC4899",
    notes: null,
  },
  {
    saverKey: "emergency",
    displayName: "Emergency",
    emoji: "🚨",
    monthlyBudgetCents: 150000, // $1,500
    saverType: "savings_goal" as const,
    sortOrder: 7,
    colour: "#F59E0B",
    notes: null,
  },
  {
    saverKey: "homelab",
    displayName: "Homelab",
    emoji: "🖥️",
    monthlyBudgetCents: 50000, // $500
    saverType: "savings_goal" as const,
    sortOrder: 8,
    colour: "#8B5CF6",
    notes: null,
  },
  {
    saverKey: "pearler",
    displayName: "Pearler",
    emoji: "📈",
    monthlyBudgetCents: 60000, // $600
    saverType: "investment" as const,
    sortOrder: 9,
    colour: "#14B8A6",
    notes: null,
  },
  {
    saverKey: "spending",
    displayName: "Spending",
    emoji: "🛍️",
    monthlyBudgetCents: 145100, // $1,451
    saverType: "spending" as const,
    sortOrder: 10,
    colour: "#A855F7",
    notes: null,
  },
];

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

type CategoryDef = {
  categoryKey: string;
  displayName: string;
  sortOrder: number;
};

const categoriesBySaver: Record<string, CategoryDef[]> = {
  rent: [
    { categoryKey: "rent", displayName: "Rent", sortOrder: 1 },
  ],
  essentials: [
    { categoryKey: "electricity", displayName: "Electricity", sortOrder: 1 },
    { categoryKey: "internet", displayName: "Internet", sortOrder: 2 },
    { categoryKey: "phone", displayName: "Phone", sortOrder: 3 },
    { categoryKey: "insurance", displayName: "Insurance", sortOrder: 4 },
    { categoryKey: "subscriptions", displayName: "Subscriptions", sortOrder: 5 },
    { categoryKey: "medical", displayName: "Medical", sortOrder: 6 },
    { categoryKey: "dental", displayName: "Dental", sortOrder: 7 },
    { categoryKey: "transport", displayName: "Transport", sortOrder: 8 },
    { categoryKey: "haircut", displayName: "Haircut", sortOrder: 9 },
    { categoryKey: "household", displayName: "Household", sortOrder: 10 },
  ],
  food: [
    { categoryKey: "groceries", displayName: "Groceries", sortOrder: 1 },
    { categoryKey: "eating-out", displayName: "Eating Out", sortOrder: 2 },
    { categoryKey: "coffee", displayName: "Coffee", sortOrder: 3 },
    { categoryKey: "delivery", displayName: "Delivery", sortOrder: 4 },
    { categoryKey: "alcohol", displayName: "Alcohol", sortOrder: 5 },
  ],
  supplements: [
    { categoryKey: "protein", displayName: "Protein", sortOrder: 1 },
    { categoryKey: "creatine", displayName: "Creatine", sortOrder: 2 },
    { categoryKey: "pre-workout", displayName: "Pre-Workout", sortOrder: 3 },
    { categoryKey: "vitamins-supps", displayName: "Vitamins & Supps", sortOrder: 4 },
    { categoryKey: "other-supps", displayName: "Other Supplements", sortOrder: 5 },
  ],
  debt: [
    { categoryKey: "zip-pay", displayName: "ZIP Pay", sortOrder: 1 },
    { categoryKey: "anz-credit", displayName: "ANZ Credit Card", sortOrder: 2 },
  ],
  spending: [
    { categoryKey: "clothing", displayName: "Clothing", sortOrder: 1 },
    { categoryKey: "entertainment", displayName: "Entertainment", sortOrder: 2 },
    { categoryKey: "gaming", displayName: "Gaming", sortOrder: 3 },
    { categoryKey: "gifts", displayName: "Gifts", sortOrder: 4 },
    { categoryKey: "hobbies", displayName: "Hobbies", sortOrder: 5 },
    { categoryKey: "personal-care", displayName: "Personal Care", sortOrder: 6 },
    { categoryKey: "tech", displayName: "Tech", sortOrder: 7 },
    { categoryKey: "fitness", displayName: "Fitness", sortOrder: 8 },
    { categoryKey: "education", displayName: "Education", sortOrder: 9 },
    { categoryKey: "misc-spending", displayName: "Miscellaneous", sortOrder: 10 },
  ],
};

// =============================================================================
// SEED FUNCTION
// =============================================================================

/**
 * Seeds budget_savers and budget_categories with the full three-tier taxonomy.
 * Uses upsert pattern (INSERT ON CONFLICT DO UPDATE) so re-running is idempotent.
 */
export async function seedBudgetSavers() {
  // 1. Upsert all savers
  for (const saver of savers) {
    await db
      .insert(budgetSavers)
      .values(saver)
      .onConflictDoUpdate({
        target: budgetSavers.saverKey,
        set: {
          displayName: saver.displayName,
          emoji: saver.emoji,
          monthlyBudgetCents: saver.monthlyBudgetCents,
          saverType: saver.saverType,
          sortOrder: saver.sortOrder,
          colour: saver.colour,
          notes: saver.notes,
          updatedAt: new Date(),
        },
      });
  }

  // 2. Look up saver IDs by key
  const allSavers = await db.select().from(budgetSavers);
  const saverIdMap = new Map(allSavers.map((s) => [s.saverKey, s.id]));

  // 3. Upsert categories under each saver
  for (const [saverKey, categories] of Object.entries(categoriesBySaver)) {
    const saverId = saverIdMap.get(saverKey);
    if (!saverId) continue;

    for (const cat of categories) {
      const categoryId = `${saverKey}--${cat.categoryKey}`;
      await db
        .insert(budgetCategories)
        .values({
          id: categoryId,
          name: cat.displayName,
          icon: "Circle", // Default icon, can be customised later
          colour: "#6B7280", // Default grey, inherits saver colour in UI
          sortOrder: cat.sortOrder,
          isIncome: false,
          isSystem: false,
          saverId,
          categoryKey: cat.categoryKey,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: budgetCategories.id,
          set: {
            name: cat.displayName,
            sortOrder: cat.sortOrder,
            saverId,
            categoryKey: cat.categoryKey,
            isActive: true,
          },
        });
    }
  }
}
