import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { holdings, transactions, snapshots, contributions } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import {
  exportFullBackupJSON,
  ContributionWithHoldingName,
} from "@/lib/export/backup-exporter";
import type { TransactionWithSymbol } from "@/lib/export/transactions-exporter";
import type { SnapshotWithDetails } from "@/lib/export/snapshots-exporter";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all holdings for the user (excluding deleted)
  const userHoldings = await db
    .select()
    .from(holdings)
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(holdings.deletedAt)
      )
    );

  // Fetch all transactions with symbol (excluding deleted)
  const userTransactions = await db
    .select({
      id: transactions.id,
      holdingId: transactions.holdingId,
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      fees: transactions.fees,
      currency: transactions.currency,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      deletedAt: transactions.deletedAt,
      symbol: holdings.symbol,
    })
    .from(transactions)
    .innerJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(
      and(
        eq(holdings.userId, userId),
        isNull(transactions.deletedAt),
        isNull(holdings.deletedAt)
      )
    );

  const transactionsWithSymbol: TransactionWithSymbol[] = userTransactions;

  // Fetch all snapshots with holding name (excluding deleted)
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

  // Fetch contributions for contribution-based lookup
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

  // Create contribution lookup map
  const contributionMap = new Map<string, { employerContrib: string; employeeContrib: string }>();
  for (const contrib of userContributions) {
    const key = `${contrib.holdingId}-${contrib.date}`;
    contributionMap.set(key, {
      employerContrib: contrib.employerContrib,
      employeeContrib: contrib.employeeContrib,
    });
  }

  // Merge snapshots with contributions
  const snapshotsWithDetails: SnapshotWithDetails[] = userSnapshots.map((snapshot) => {
    const key = `${snapshot.holdingId}-${snapshot.date}`;
    const contrib = contributionMap.get(key);
    return {
      ...snapshot,
      employerContrib: contrib?.employerContrib ?? null,
      employeeContrib: contrib?.employeeContrib ?? null,
    };
  });

  // Fetch full contributions with holding names for the backup
  const fullContributions = await db
    .select({
      id: contributions.id,
      holdingId: contributions.holdingId,
      date: contributions.date,
      employerContrib: contributions.employerContrib,
      employeeContrib: contributions.employeeContrib,
      notes: contributions.notes,
      createdAt: contributions.createdAt,
      updatedAt: contributions.updatedAt,
      deletedAt: contributions.deletedAt,
      holdingName: holdings.name,
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

  const contributionsWithHoldingName: ContributionWithHoldingName[] = fullContributions;

  // Generate the backup JSON
  const content = exportFullBackupJSON({
    holdings: userHoldings,
    transactions: transactionsWithSymbol,
    snapshots: snapshotsWithDetails,
    contributions: contributionsWithHoldingName,
    userId,
  });

  const timestamp = new Date().toISOString().split("T")[0];

  return new Response(content, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mjolnir-backup-${timestamp}.json"`,
    },
  });
}
