import { NextResponse } from "next/server";
import { gte, asc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { healthDaily } from "@/lib/db/schema";
import { getStartDate, kjToKcal } from "@/lib/health/constants";

/**
 * GET /api/health-data/daily
 *
 * Returns all health_daily rows within the requested range, sorted chronologically.
 * Energy values are converted from kJ → kcal.
 *
 * Query params:
 *   - range: "30d" | "90d" | "6m" | "1y" | "all" (default: "90d")
 */
export const GET = withAuth(async (request) => {
  const range = request.nextUrl.searchParams.get("range") || "90d";
  const startDate = getStartDate(range);

  const rows = await db
    .select()
    .from(healthDaily)
    .where(gte(healthDaily.logDate, startDate))
    .orderBy(asc(healthDaily.logDate));

  const result = rows.map((row) => ({
    logDate: row.logDate,
    weightKg: row.weightKg ? Number(row.weightKg) : null,
    bodyFatPct: row.bodyFatPct ? Number(row.bodyFatPct) : null,
    leanMassKg: row.leanMassKg ? Number(row.leanMassKg) : null,
    bmi: row.bmi ? Number(row.bmi) : null,
    restingHr: row.restingHr ? Number(row.restingHr) : null,
    hrv: row.hrvMs ? Number(row.hrvMs) : null,
    vo2Max: row.vo2Max ? Number(row.vo2Max) : null,
    caloriesKcal: row.caloriesKj ? kjToKcal(Number(row.caloriesKj)) : null,
    proteinG: row.proteinG ? Number(row.proteinG) : null,
    carbsG: row.carbsG ? Number(row.carbsG) : null,
    fatG: row.fatG ? Number(row.fatG) : null,
    steps: row.steps,
    activeEnergyKcal: row.activeEnergyKj
      ? kjToKcal(Number(row.activeEnergyKj))
      : null,
    exerciseMinutes: row.exerciseMinutes,
    standHours: row.standHours,
    sleepHours: row.sleepTotalHrs ? Number(row.sleepTotalHrs) : null,
    sleepDeep: row.sleepDeepHrs ? Number(row.sleepDeepHrs) : null,
    sleepRem: row.sleepRemHrs ? Number(row.sleepRemHrs) : null,
    sleepCore: row.sleepCoreHrs ? Number(row.sleepCoreHrs) : null,
    sleepAwake: row.sleepAwakeHrs ? Number(row.sleepAwakeHrs) : null,
    sleepStart: row.sleepStart,
    sleepEnd: row.sleepEnd,
    breathingDisturbances: row.breathingDisturbances
      ? Number(row.breathingDisturbances)
      : null,
    respiratoryRate: row.respiratoryRate ? Number(row.respiratoryRate) : null,
  }));

  return NextResponse.json(result);
}, "fetching daily health data");
