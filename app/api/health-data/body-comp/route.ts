import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { getStartDate } from "@/lib/health/constants";

/**
 * GET /api/health-data/body-comp
 *
 * Returns body composition data with a 7-day rolling average on weight.
 * Uses a window function for the rolling average calculation.
 *
 * Query params:
 *   - range: "30d" | "90d" | "6m" | "1y" | "all" (default: "90d")
 */
export const GET = withAuth(async (request) => {
  const range = request.nextUrl.searchParams.get("range") || "90d";
  const startDate = getStartDate(range);

  const result = await db.execute(sql`
    SELECT
      log_date AS "logDate",
      weight_kg::float AS "weightKg",
      AVG(weight_kg::float) OVER (
        ORDER BY log_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ) AS "weight7dAvg",
      body_fat_pct::float AS "bodyFatPct",
      lean_mass_kg::float AS "leanMassKg",
      bmi::float AS "bmi"
    FROM health_daily
    WHERE log_date >= ${startDate}
      AND weight_kg IS NOT NULL
    ORDER BY log_date ASC
  `);

  const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows ?? result;

  return NextResponse.json(rows);
}, "fetching body composition data");
