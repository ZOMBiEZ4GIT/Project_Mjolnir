import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classificationCorrections } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";

/**
 * GET /api/budget/corrections/suggestions
 *
 * Finds merchants that have been manually corrected 3+ times to the same
 * saver/category combination. Returns these as rule suggestions.
 *
 * Response: { suggestions: [{ merchantPattern, suggestedSaverKey, suggestedCategoryKey,
 *             correctionCount, exampleDescriptions }] }
 */
export const GET = withAuth(async () => {
  // Group corrections by normalised merchant → corrected saver/category
  // Only include groups with 3+ corrections (the threshold for suggesting a rule)
  const rows = await db.execute(sql`
    SELECT
      UPPER(TRIM(${classificationCorrections.merchantDescription})) AS merchant_pattern,
      ${classificationCorrections.correctedSaverKey} AS suggested_saver_key,
      ${classificationCorrections.correctedCategoryKey} AS suggested_category_key,
      COUNT(*)::int AS correction_count,
      ARRAY_AGG(DISTINCT ${classificationCorrections.merchantDescription}) AS example_descriptions
    FROM ${classificationCorrections}
    GROUP BY
      UPPER(TRIM(${classificationCorrections.merchantDescription})),
      ${classificationCorrections.correctedSaverKey},
      ${classificationCorrections.correctedCategoryKey}
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
  `);

  const suggestions = rows.rows.map(
    (row: Record<string, unknown>) => ({
      merchantPattern: row.merchant_pattern as string,
      suggestedSaverKey: row.suggested_saver_key as string,
      suggestedCategoryKey: row.suggested_category_key as string,
      correctionCount: row.correction_count as number,
      exampleDescriptions: row.example_descriptions as string[],
    })
  );

  return NextResponse.json({ suggestions });
}, "fetching correction suggestions");
