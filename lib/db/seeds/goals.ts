import { db } from "@/lib/db";
import { goals, budgetSavers } from "@/lib/db/schema";

// =============================================================================
// GOAL DEFINITIONS
// =============================================================================

type GoalDef = {
  name: string;
  saverKey: string;
  targetAmountCents: number;
  monthlyContributionCents: number;
  targetDate: string; // YYYY-MM-DD
  icon: string;
  priority: number;
};

const goalDefs: GoalDef[] = [
  {
    name: "Emergency Fund",
    saverKey: "emergency",
    targetAmountCents: 1500000, // $15,000
    monthlyContributionCents: 150000, // $1,500
    targetDate: "2027-01-14", // ~10 months from Mar 2026
    icon: "🚨",
    priority: 1,
  },
  {
    name: "Homelab Build",
    saverKey: "homelab",
    targetAmountCents: 500000, // $5,000
    monthlyContributionCents: 50000, // $500
    targetDate: "2027-01-14", // ~10 months from Mar 2026
    icon: "🖥️",
    priority: 2,
  },
  {
    name: "Vitamin Reserve",
    saverKey: "vitamins",
    targetAmountCents: 50000, // $500
    monthlyContributionCents: 10000, // $100
    targetDate: "2026-08-14", // ~5 months from Mar 2026
    icon: "💊",
    priority: 3,
  },
  {
    name: "ZIP Payoff",
    saverKey: "debt",
    targetAmountCents: 26900, // $269
    monthlyContributionCents: 5191, // $51.91
    targetDate: "2026-07-14", // Clears Jul 2026
    icon: "💳",
    priority: 4,
  },
  {
    name: "ANZ Payoff",
    saverKey: "debt",
    targetAmountCents: 230000, // $2,300
    monthlyContributionCents: 30000, // $300
    targetDate: "2026-10-14", // Clears Oct 2026
    icon: "💳",
    priority: 5,
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

/**
 * Seeds the goals table with Roland's active financial goals.
 * Uses upsert on name to make it idempotent.
 */
export async function seedGoals() {
  // Look up saver IDs by key
  const allSavers = await db.select().from(budgetSavers);
  const saverIdMap = new Map(allSavers.map((s) => [s.saverKey, s.id]));

  for (const goal of goalDefs) {
    const saverId = saverIdMap.get(goal.saverKey) ?? null;

    await db
      .insert(goals)
      .values({
        saverId,
        name: goal.name,
        targetAmountCents: goal.targetAmountCents,
        currentAmountCents: 0,
        monthlyContributionCents: goal.monthlyContributionCents,
        targetDate: goal.targetDate,
        status: "active",
        priority: goal.priority,
        icon: goal.icon,
        notes: null,
      })
      .onConflictDoUpdate({
        target: goals.name,
        set: {
          saverId,
          targetAmountCents: goal.targetAmountCents,
          monthlyContributionCents: goal.monthlyContributionCents,
          targetDate: goal.targetDate,
          priority: goal.priority,
          icon: goal.icon,
          updatedAt: new Date(),
        },
      });
  }
}
