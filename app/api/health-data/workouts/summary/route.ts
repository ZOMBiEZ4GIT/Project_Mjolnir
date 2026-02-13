import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { getStartDate, KJ_TO_KCAL } from "@/lib/health/constants";

/**
 * GET /api/health-data/workouts/summary
 *
 * Returns weekly workout summaries and type distribution for the requested range.
 *
 * Query params:
 *   - range: "30d" | "90d" | "6m" | "1y" | "all" (default: "90d")
 *
 * Response: { weekly[], typeDistribution[] }
 */
export const GET = withAuth(async (request) => {
  const range = request.nextUrl.searchParams.get("range") || "90d";
  const startDate = getStartDate(range);

  // Weekly summary: session count, total minutes, total kcal
  const weeklyResult = await db.execute(sql`
    SELECT
      DATE_TRUNC('week', workout_date::timestamp)::date AS "weekStart",
      COUNT(*)::int AS "sessionCount",
      ROUND(SUM(duration_minutes)::numeric, 0) AS "totalMinutes",
      ROUND(SUM(active_energy_kj::float / ${KJ_TO_KCAL})::numeric, 0) AS "totalKcal"
    FROM health_workouts
    WHERE workout_date >= ${startDate}
    GROUP BY DATE_TRUNC('week', workout_date::timestamp)
    ORDER BY "weekStart" ASC
  `);

  // Type distribution for pie chart
  const typeResult = await db.execute(sql`
    SELECT
      workout_type AS "workoutType",
      COUNT(*)::int AS "count",
      ROUND(SUM(duration_minutes)::numeric, 0) AS "totalMinutes"
    FROM health_workouts
    WHERE workout_date >= ${startDate}
    GROUP BY workout_type
    ORDER BY "count" DESC
  `);

  const weekly = (weeklyResult as unknown as { rows: Record<string, unknown>[] }).rows ?? weeklyResult;
  const typeDistribution = (typeResult as unknown as { rows: Record<string, unknown>[] }).rows ?? typeResult;

  return NextResponse.json({ weekly, typeDistribution });
}, "fetching workout summary");
