import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { exportHoldingsCSV, exportHoldingsJSON } from "@/lib/export/holdings-exporter";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return new Response(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="holdings-${timestamp}.json"`,
      },
    });
  }

  // CSV format
  const content = exportHoldingsCSV(userHoldings);
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="holdings-${timestamp}.csv"`,
    },
  });
}
