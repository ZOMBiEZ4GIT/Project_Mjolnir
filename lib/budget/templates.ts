/**
 * Pre-configured budget templates.
 *
 * Each template defines how income should be split across budget categories.
 * Allocations can be either percentage-based (0–100) or fixed cent amounts.
 * The `applyTemplate` function resolves these into concrete cent values
 * given a total income.
 */

export interface TemplateAllocation {
  categoryId: string;
  /** Percentage of income (0–100). Mutually exclusive with fixedCents. */
  percentage?: number;
  /** Fixed amount in cents. Mutually exclusive with percentage. */
  fixedCents?: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  allocations: TemplateAllocation[];
}

/**
 * Barefoot Investor Buckets
 *
 * Based on Scott Pape's Barefoot Investor methodology.
 * Groceries is a fixed $1,200/month; remaining categories split by percentage.
 * Percentages: bills-fixed 60%, transport 10%, eating-out 8%, fun 7%,
 * shopping 5%, health 10% of income after groceries.
 */
const barefootInvestor: BudgetTemplate = {
  id: "barefoot-investor",
  name: "Barefoot Investor Buckets",
  description:
    "Scott Pape's bucket system with $1,200 fixed groceries and percentage splits for everything else.",
  allocations: [
    { categoryId: "groceries", fixedCents: 120000 },
    { categoryId: "bills-fixed", percentage: 60 },
    { categoryId: "transport", percentage: 10 },
    { categoryId: "eating-out", percentage: 8 },
    { categoryId: "fun", percentage: 7 },
    { categoryId: "shopping", percentage: 5 },
    { categoryId: "health", percentage: 10 },
  ],
};

/**
 * 50/30/20 Rule
 *
 * Classic budgeting framework: 50% needs, 30% wants, 20% savings.
 * Split across categories: bills-fixed 35%, groceries 15%, transport 10%,
 * eating-out 10%, shopping 10%, fun 10%, health 5%.
 * The remaining 5% (part of the 20% savings) is left unallocated.
 */
const fiftyThirtyTwenty: BudgetTemplate = {
  id: "50-30-20",
  name: "50/30/20 Rule",
  description:
    "Classic split: 50% needs, 30% wants, 20% savings. Categories mapped to the framework.",
  allocations: [
    { categoryId: "bills-fixed", percentage: 35 },
    { categoryId: "groceries", percentage: 15 },
    { categoryId: "transport", percentage: 10 },
    { categoryId: "eating-out", percentage: 10 },
    { categoryId: "shopping", percentage: 10 },
    { categoryId: "fun", percentage: 10 },
    { categoryId: "health", percentage: 5 },
  ],
};

/**
 * Roland's Budget
 *
 * Custom template with fixed rent ($2,129) and groceries ($1,200),
 * remaining income split by percentage across lifestyle categories.
 */
const rolandsBudget: BudgetTemplate = {
  id: "rolands-budget",
  name: "Roland's Budget",
  description:
    "Fixed rent ($2,129) and groceries ($1,200), with percentage splits for the rest.",
  allocations: [
    { categoryId: "bills-fixed", fixedCents: 212900 },
    { categoryId: "groceries", fixedCents: 120000 },
    { categoryId: "eating-out", percentage: 8 },
    { categoryId: "transport", percentage: 6 },
    { categoryId: "fun", percentage: 8 },
    { categoryId: "shopping", percentage: 4 },
    { categoryId: "health", percentage: 8 },
  ],
};

/** All available budget templates. */
export const budgetTemplates: BudgetTemplate[] = [
  barefootInvestor,
  fiftyThirtyTwenty,
  rolandsBudget,
];

/**
 * Apply a template to a given income, resolving percentages and fixed values
 * into concrete cent amounts.
 *
 * Fixed allocations are subtracted from income first. Percentage allocations
 * are then calculated against the remaining income.
 *
 * @param template - The budget template to apply
 * @param incomeCents - Total income in cents
 * @returns Array of { categoryId, allocatedCents } for each category
 */
export function applyTemplate(
  template: BudgetTemplate,
  incomeCents: number
): { categoryId: string; allocatedCents: number }[] {
  // Sum all fixed allocations
  const totalFixedCents = template.allocations.reduce(
    (sum, a) => sum + (a.fixedCents ?? 0),
    0
  );

  // Remaining income available for percentage-based allocations
  const remainingCents = Math.max(0, incomeCents - totalFixedCents);

  return template.allocations.map((allocation) => {
    if (allocation.fixedCents !== undefined) {
      return {
        categoryId: allocation.categoryId,
        allocatedCents: allocation.fixedCents,
      };
    }

    // Percentage-based: calculate against remaining income after fixed costs
    const cents = Math.round(
      (remainingCents * (allocation.percentage ?? 0)) / 100
    );
    return {
      categoryId: allocation.categoryId,
      allocatedCents: cents,
    };
  });
}
