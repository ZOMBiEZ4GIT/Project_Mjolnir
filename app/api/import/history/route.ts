/**
 * Import History API Endpoint
 * GET /api/import/history
 *
 * Returns the most recent imports for the authenticated user.
 * Query params:
 *   - limit: number of records to return (default: 5, max: 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { importHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse limit from query params
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  let limit = 5;

  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      limit = parsed;
    }
  }

  // Fetch recent imports for this user
  const recentImports = await db
    .select()
    .from(importHistory)
    .where(eq(importHistory.userId, userId))
    .orderBy(desc(importHistory.createdAt))
    .limit(limit);

  // Parse errorsJson back to array for each record
  const imports = recentImports.map((record) => ({
    id: record.id,
    type: record.type,
    filename: record.filename,
    total: record.total,
    imported: record.imported,
    skipped: record.skipped,
    errors: record.errorsJson ? JSON.parse(record.errorsJson) : [],
    createdAt: record.createdAt,
  }));

  return NextResponse.json({ imports });
}
