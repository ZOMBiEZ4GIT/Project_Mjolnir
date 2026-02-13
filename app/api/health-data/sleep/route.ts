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
      sleepTotalHrs: healthDaily.sleepTotalHrs,
      sleepDeepHrs: healthDaily.sleepDeepHrs,
      sleepRemHrs: healthDaily.sleepRemHrs,
      sleepCoreHrs: healthDaily.sleepCoreHrs,
      sleepAwakeHrs: healthDaily.sleepAwakeHrs,
      sleepStart: healthDaily.sleepStart,
      sleepEnd: healthDaily.sleepEnd,
      breathingDisturbances: healthDaily.breathingDisturbances,
      respiratoryRate: healthDaily.respiratoryRate,
    })
    .from(healthDaily)
    .where(gte(healthDaily.logDate, startDate))
    .orderBy(asc(healthDaily.logDate));

  // Filter to rows that have sleep data and compute efficiency
  const result = rows
    .filter((row) => row.sleepTotalHrs !== null)
    .map((row) => {
      const total = Number(row.sleepTotalHrs ?? 0);
      const awake = Number(row.sleepAwakeHrs ?? 0);
      return {
        logDate: row.logDate,
        sleepHours: total,
        sleepDeep: row.sleepDeepHrs ? Number(row.sleepDeepHrs) : null,
        sleepRem: row.sleepRemHrs ? Number(row.sleepRemHrs) : null,
        sleepCore: row.sleepCoreHrs ? Number(row.sleepCoreHrs) : null,
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
