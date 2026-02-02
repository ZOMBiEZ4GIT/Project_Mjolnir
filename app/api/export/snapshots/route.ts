import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots, holdings, contributions } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import {
  exportSnapshotsCSV,
  exportSnapshotsJSON,
  SnapshotWithDetails,
} from "@/lib/export/snapshots-exporter";

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

  // Fetch all snapshots for the user's holdings (excluding deleted)
  // Join with holdings to get the holding name
  const userSnapshots = await db
    .select({
      id: snapshots.id,
      holdingId: snapshots.holdingId,
      date: snapshots.date,
      balance: snapshots.balance,
      currency: snapshots.currency,
      notes: snapshots.notes,
      createdAt: snapshots.createdAt,
      updatedAt: snapshots.updatedAt,
      deletedAt: snapshots.deletedAt,
      holdingName: holdings.name,
    })
    .from(snapshots)
    .innerJoin(holdings, eq(snapshots.holdingId, holdings.id))
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(snapshots.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  // Fetch contributions to match with snapshots by holding and date
  const userContributions = await db
    .select({
      holdingId: contributions.holdingId,
      date: contributions.date,
      employerContrib: contributions.employerContrib,
      employeeContrib: contributions.employeeContrib,
    })
    .from(contributions)
    .innerJoin(holdings, eq(contributions.holdingId, holdings.id))
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(contributions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  // Create a lookup map for contributions by holdingId + date
  const contributionMap = new Map<string, { employerContrib: string; employeeContrib: string }>();
  for (const contrib of userContributions) {
    const key = `${contrib.holdingId}-${contrib.date}`;
    contributionMap.set(key, {
      employerContrib: contrib.employerContrib,
      employeeContrib: contrib.employeeContrib,
    });
  }

  // Merge snapshots with their corresponding contributions
  const snapshotsWithDetails: SnapshotWithDetails[] = userSnapshots.map((snapshot) => {
    const key = `${snapshot.holdingId}-${snapshot.date}`;
    const contrib = contributionMap.get(key);
    return {
      ...snapshot,
      employerContrib: contrib?.employerContrib ?? null,
      employeeContrib: contrib?.employeeContrib ?? null,
    };
  });

  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "json") {
    const content = exportSnapshotsJSON(snapshotsWithDetails);
    return new Response(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="snapshots-${timestamp}.json"`,
      },
    });
  }

  // CSV format
  const content = exportSnapshotsCSV(snapshotsWithDetails);
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="snapshots-${timestamp}.csv"`,
    },
  });
}
