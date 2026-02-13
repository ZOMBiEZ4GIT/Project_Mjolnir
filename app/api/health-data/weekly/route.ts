import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { getStartDate, KJ_TO_KCAL } from "@/lib/health/constants";

/**
 * GET /api/health-data/weekly
 *
 * Returns weekly averaged health metrics grouped by ISO week.
 * Uses DATE_TRUNC for grouping. Default 6-month range, sorted DESC.
 *
 * Query params:
 *   - range: "30d" | "90d" | "6m" | "1y" | "all" (default: "6m")
 */
export const GET = withAuth(async (request) => {
  const range = request.nextUrl.searchParams.get("range") || "6m";
  const startDate = getStartDate(range);

  const result = await db.execute(sql`
    SELECT
      DATE_TRUNC('week', log_date::timestamp)::date AS "weekStart",
      ROUND(AVG(weight_kg::float)::numeric, 1) AS "avgWeightKg",
      ROUND(AVG(energy_kj::float / ${KJ_TO_KCAL})::numeric, 0) AS "avgCaloriesKcal",
      ROUND(AVG(protein_g::float)::numeric, 0) AS "avgProteinG",
      ROUND(AVG(hrv::float)::numeric, 0) AS "avgHrv",
      ROUND(AVG(sleep_hours::float)::numeric, 1) AS "avgSleepHours",
      ROUND(AVG(steps)::numeric, 0) AS "avgSteps",
      ROUND(AVG(resting_hr::float)::numeric, 0) AS "avgRestingHr",
      COUNT(*)::int AS "daysWithData"
    FROM health_daily
    WHERE log_date >= ${startDate}
    GROUP BY DATE_TRUNC('week', log_date::timestamp)
    ORDER BY "weekStart" DESC
  `);

  const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows ?? result;

  return NextResponse.json(rows);
}, "fetching weekly health summaries");
