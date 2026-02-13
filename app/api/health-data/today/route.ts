import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { withAuth } from "@/lib/utils/with-auth";
import { db } from "@/lib/db";
import { healthDaily } from "@/lib/db/schema";
import { kjToKcal } from "@/lib/health/constants";

/**
 * GET /api/health-data/today
 *
 * Returns today's health snapshot plus yesterday and a 14-day sparkline.
 * Energy values are converted from kJ → kcal.
 *
 * Response: { today, yesterday, sparkline[] }
 */
export const GET = withAuth(async () => {
  // Fetch last 16 days to cover today + yesterday + 14-day sparkline
  const rows = await db
    .select()
    .from(healthDaily)
    .orderBy(desc(healthDaily.logDate))
    .limit(16);

  if (rows.length === 0) {
    return NextResponse.json({ today: null, yesterday: null, sparkline: [] });
  }

  function convertRow(row: typeof rows[number]) {
    return {
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
      breathingDisturbances: row.breathingDisturbances
        ? Number(row.breathingDisturbances)
        : null,
    };
  }

  const today = convertRow(rows[0]);
  const yesterday = rows.length > 1 ? convertRow(rows[1]) : null;
  // Sparkline: oldest-first for chart rendering
  const sparkline = rows.slice(0, 16).reverse().map(convertRow);

  return NextResponse.json({ today, yesterday, sparkline });
}, "fetching today's health data");
