import { NextResponse } from "next/server";
import { gte, asc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { healthDaily } from "@/lib/db/schema";
import { getStartDate, calcSleepEfficiency } from "@/lib/health/constants";

/**
 * GET /api/health-data/sleep
 *
 * Returns sleep data with computed efficiency for the requested range.
 *
 * Query params:
 *   - range: "30d" | "90d" | "6m" | "1y" | "all" (default: "90d")
 */
export const GET = withAuth(async (request) => {
  const range = request.nextUrl.searchParams.get("range") || "90d";
  const startDate = getStartDate(range);

  const rows = await db
    .select({
      logDate: healthDaily.logDate,
      sleepHours: healthDaily.sleepHours,
      sleepDeep: healthDaily.sleepDeep,
      sleepRem: healthDaily.sleepRem,
      sleepCore: healthDaily.sleepCore,
      sleepAwake: healthDaily.sleepAwake,
      sleepStart: healthDaily.sleepStart,
      sleepEnd: healthDaily.sleepEnd,
      breathingDisturbances: healthDaily.breathingDisturbances,
      respiratoryRate: healthDaily.respiratoryRate,
    })
    .from(healthDaily)
    .where(
      gte(healthDaily.logDate, startDate),
    )
    .orderBy(asc(healthDaily.logDate));

  // Filter to rows that have sleep data and compute efficiency
  const result = rows
    .filter((row) => row.sleepHours !== null)
    .map((row) => {
      const total = Number(row.sleepHours ?? 0);
      const awake = Number(row.sleepAwake ?? 0);
      return {
        logDate: row.logDate,
        sleepHours: total,
        sleepDeep: row.sleepDeep ? Number(row.sleepDeep) : null,
        sleepRem: row.sleepRem ? Number(row.sleepRem) : null,
        sleepCore: row.sleepCore ? Number(row.sleepCore) : null,
        sleepAwake: awake,
        sleepStart: row.sleepStart,
        sleepEnd: row.sleepEnd,
        efficiency: calcSleepEfficiency(total, awake),
        breathingDisturbances: row.breathingDisturbances
          ? Number(row.breathingDisturbances)
          : null,
        respiratoryRate: row.respiratoryRate
          ? Number(row.respiratoryRate)
          : null,
      };
    });

  return NextResponse.json(result);
}, "fetching sleep data");
