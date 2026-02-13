import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { healthWorkouts } from "@/lib/db/schema";
import { kjToKcal } from "@/lib/health/constants";

/**
 * GET /api/health-data/workouts
 *
 * Returns recent workout sessions with optional type filtering.
 * Energy values converted from kJ → kcal.
 *
 * Query params:
 *   - limit: number of rows (default: 20, max: 100)
 *   - type: optional workout type filter (e.g. "Walking")
 */
export const GET = withAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(1, limitParam), 100);
  const typeFilter = searchParams.get("type");

  const conditions = [];
  if (typeFilter) {
    conditions.push(eq(healthWorkouts.workoutType, typeFilter));
  }

  const rows = await db
    .select()
    .from(healthWorkouts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(healthWorkouts.workoutDate), desc(healthWorkouts.startTime))
    .limit(limit);

  const result = rows.map((row) => ({
    id: `${row.workoutDate}-${row.startTime}-${row.workoutType}`,
    workoutDate: row.workoutDate,
    startTime: row.startTime,
    workoutType: row.workoutType,
    durationMinutes: row.durationMinutes,
    caloriesKcal: row.activeEnergyKj ? kjToKcal(Number(row.activeEnergyKj)) : null,
    avgHr: row.hrAvg,
    maxHr: row.hrMax,
    distanceKm: row.distanceKm ? Number(row.distanceKm) : null,
    isIndoor: row.isIndoor,
  }));

  return NextResponse.json(result);
}, "fetching workouts");
