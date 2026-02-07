import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { exportHoldingsCSV, exportHoldingsJSON } from "@/lib/export/holdings-exporter";
import { withAuth } from "@/lib/utils/with-auth";

export const GET = withAuth(async (request, _context, userId) => {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";

  if (format !== "csv" && format !== "json") {
    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'json'" },
      { status: 400 }
    );
  }

  // Fetch all holdings for the user (including dormant, excluding deleted)
  const userHoldings = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "json") {
    const content = exportHoldingsJSON(userHoldings);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="holdings-${timestamp}.json"`,
      },
    });
  }

  // CSV format
  const content = exportHoldingsCSV(userHoldings);
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="holdings-${timestamp}.csv"`,
    },
  });
}, "exporting holdings");
