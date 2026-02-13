import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upTransactions } from "@/lib/db/schema";
import { isNull, sql } from "drizzle-orm";
import { mapCategoryToSaver } from "@/lib/budget/categorisation";

/**
 * Merchant description patterns → tags mapping.
 * Patterns are matched case-insensitively against transaction descriptions.
 * A transaction can match multiple patterns and accumulate tags.
 */
const MERCHANT_TAG_RULES: { pattern: string; tags: string[]; saverOverride?: { saverKey: string; categoryKey: string } }[] = [
  // Groceries
  { pattern: "WOOLWORTHS", tags: ["woolworths", "weekly"] },
  { pattern: "COLES", tags: ["coles", "weekly"] },
  { pattern: "ALDI", tags: ["aldi", "weekly"] },

  // Meal kits / delivery
  { pattern: "MARLEY SPOON", tags: ["marley-spoon", "meal-kit"] },
  { pattern: "UBER EATS", tags: ["uber-eats", "delivery"] },
  { pattern: "DOORDASH", tags: ["doordash", "delivery"] },
  { pattern: "MENULOG", tags: ["menulog", "delivery"] },

  // Health & Fitness
  { pattern: "BODY FIT", tags: ["bft", "gym"], saverOverride: { saverKey: "essentials", categoryKey: "fitness" } },
  { pattern: "MEDIBANK", tags: ["medibank", "health-insurance"], saverOverride: { saverKey: "essentials", categoryKey: "insurance" } },

  // Bills & Subscriptions
  { pattern: "AUSSIE BROADBAND", tags: ["aussie-broadband", "internet"], saverOverride: { saverKey: "essentials", categoryKey: "internet" } },
  { pattern: "TELSTRA", tags: ["telstra", "phone"], saverOverride: { saverKey: "essentials", categoryKey: "phone" } },
  { pattern: "ORIGIN ENERGY", tags: ["origin-energy", "electricity"], saverOverride: { saverKey: "essentials", categoryKey: "electricity" } },
  { pattern: "REAL ESTATE", tags: ["rent"], saverOverride: { saverKey: "rent", categoryKey: "rent" } },

  // Supplements
  { pattern: "GHOST", tags: ["ghost", "pre-workout"], saverOverride: { saverKey: "supplements", categoryKey: "pre-workout" } },
  { pattern: "BULK NUTRIENTS", tags: ["bulk-nutrients"], saverOverride: { saverKey: "supplements", categoryKey: "protein" } },
  { pattern: "MYPROTEIN", tags: ["myprotein"], saverOverride: { saverKey: "supplements", categoryKey: "protein" } },

  // Transport
  { pattern: "MYKI", tags: ["myki", "public-transport"], saverOverride: { saverKey: "essentials", categoryKey: "transport" } },
  { pattern: "UBER TRIP", tags: ["uber", "rideshare"], saverOverride: { saverKey: "essentials", categoryKey: "transport" } },

  // Shopping / Tech
  { pattern: "JB HI-FI", tags: ["jb-hifi", "tech"], saverOverride: { saverKey: "spending", categoryKey: "tech" } },
  { pattern: "APPLE.COM", tags: ["apple", "tech"], saverOverride: { saverKey: "spending", categoryKey: "tech" } },
  { pattern: "OFFICEWORKS", tags: ["officeworks"] },

  // Coffee
  { pattern: "COFFEE", tags: ["coffee"], saverOverride: { saverKey: "food", categoryKey: "coffee" } },

  // Debt
  { pattern: "ZIP PAY", tags: ["zip-pay"], saverOverride: { saverKey: "debt", categoryKey: "zip-pay" } },
  { pattern: "ANZ CREDIT", tags: ["anz-credit"], saverOverride: { saverKey: "debt", categoryKey: "anz-credit" } },
];

/**
 * Applies merchant tag rules to a transaction description.
 * Returns matched tags and an optional saver/category override.
 */
function matchMerchantTags(description: string): {
  tags: string[];
  saverOverride: { saverKey: string; categoryKey: string } | null;
} {
  const upper = description.toUpperCase();
  const tags: string[] = [];
  let saverOverride: { saverKey: string; categoryKey: string } | null = null;

  for (const rule of MERCHANT_TAG_RULES) {
    if (upper.includes(rule.pattern)) {
      tags.push(...rule.tags);
      // First matching override wins (most specific patterns listed first)
      if (rule.saverOverride && !saverOverride) {
        saverOverride = rule.saverOverride;
      }
    }
  }

  return { tags: [...new Set(tags)], saverOverride };
}

const BATCH_SIZE = 100;

/**
 * POST /api/admin/backfill
 *
 * Backfills existing upTransactions with three-tier classification.
 * Processes transactions that have a mjolnirCategoryId but no saverKey.
 * Idempotent: skips transactions that already have a saverKey.
 */
export async function POST() {
  try {
    // Count total transactions needing backfill
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(upTransactions)
      .where(isNull(upTransactions.saverKey));

    const [{ count: withCategoryCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(upTransactions)
      .where(
        sql`${upTransactions.saverKey} IS NULL AND ${upTransactions.mjolnirCategoryId} IS NOT NULL`
      );

    let processed = 0;
    let updated = 0;
    let skippedNoMapping = 0;
    const unmappedDescriptions: string[] = [];

    // Process in batches using offset pagination
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await db
        .select({
          id: upTransactions.id,
          description: upTransactions.description,
          mjolnirCategoryId: upTransactions.mjolnirCategoryId,
          amountCents: upTransactions.amountCents,
        })
        .from(upTransactions)
        .where(isNull(upTransactions.saverKey))
        .orderBy(upTransactions.createdAt)
        .limit(BATCH_SIZE)
        .offset(offset);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const tx of batch) {
        // Apply merchant tag matching
        const { tags, saverOverride } = matchMerchantTags(tx.description);

        // Determine saver/category: merchant override > mapCategoryToSaver > null
        let saverKey: string | null = null;
        let categoryKey: string | null = null;

        if (saverOverride) {
          saverKey = saverOverride.saverKey;
          categoryKey = saverOverride.categoryKey;
        } else if (tx.mjolnirCategoryId) {
          const mapped = mapCategoryToSaver(tx.mjolnirCategoryId);
          if (mapped) {
            saverKey = mapped.saverKey;
            categoryKey = mapped.categoryKey;
          }
        }

        // Check for income transactions
        if (!saverKey && tx.amountCents > 0) {
          saverKey = "income";
          categoryKey = "salary";
        }

        if (saverKey && categoryKey) {
          await db
            .update(upTransactions)
            .set({
              saverKey,
              categoryKey,
              tags: tags.length > 0 ? tags : [],
              updatedAt: new Date(),
            })
            .where(sql`${upTransactions.id} = ${tx.id}`);
          updated++;
        } else {
          skippedNoMapping++;
          if (unmappedDescriptions.length < 50) {
            unmappedDescriptions.push(tx.description);
          }
        }
        processed++;
      }

      offset += batch.length;
      console.log(`Backfilled ${processed} of ${totalCount} transactions`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalWithoutSaverKey: totalCount,
        totalWithCategoryId: withCategoryCount,
        processed,
        updated,
        skippedNoMapping,
        unmappedSample: unmappedDescriptions.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Backfill failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
