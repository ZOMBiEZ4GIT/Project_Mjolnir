/**
 * Anomaly detection for budget transactions.
 *
 * Simple, rule-based detection (not ML):
 * 1. Single transaction > 2x the average for that category
 * 2. Category spend > 150% of budget with > 50% of period remaining
 * 3. Same merchant charged twice in one day
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AnomalySeverity = "warning" | "alert";

export type AnomalyType =
  | "large_transaction"
  | "category_overspend"
  | "duplicate_merchant";

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  saverKey: string | null;
  categoryKey: string | null;
  description: string;
  amountCents: number;
  comparisonCents: number;
}

export interface PeriodTransaction {
  id: string;
  description: string;
  amountCents: number;
  transactionDate: string;
  saverKey: string | null;
  categoryKey: string | null;
}

export interface CategoryAverage {
  saverKey: string;
  categoryKey: string | null;
  avgTransactionCents: number;
  avgPeriodTotalCents: number;
  budgetCents: number;
}

export interface PeriodContext {
  progressPercent: number;
  daysRemaining: number;
  totalDays: number;
}

// -----------------------------------------------------------------------------
// Detection
// -----------------------------------------------------------------------------

export function detectAnomalies(
  periodTransactions: PeriodTransaction[],
  historicalAverages: CategoryAverage[],
  periodContext: PeriodContext
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Build lookup maps for historical averages
  const avgTxMap = new Map<string, number>();
  const avgTotalMap = new Map<string, number>();
  const budgetMap = new Map<string, number>();

  for (const avg of historicalAverages) {
    const key = `${avg.saverKey}::${avg.categoryKey ?? ""}`;
    avgTxMap.set(key, avg.avgTransactionCents);
    avgTotalMap.set(key, avg.avgPeriodTotalCents);
    budgetMap.set(key, avg.budgetCents);
  }

  // Only analyse spending (negative amounts)
  const spending = periodTransactions.filter((t) => t.amountCents < 0);

  // 1. Large transaction detection: single tx > 2x historical average for that category
  for (const tx of spending) {
    const key = `${tx.saverKey ?? ""}::${tx.categoryKey ?? ""}`;
    const avgCents = avgTxMap.get(key);
    if (avgCents && avgCents > 0) {
      const txAbs = Math.abs(tx.amountCents);
      if (txAbs > avgCents * 2) {
        anomalies.push({
          id: `large_tx::${tx.id}`,
          type: "large_transaction",
          severity: txAbs > avgCents * 3 ? "alert" : "warning",
          saverKey: tx.saverKey,
          categoryKey: tx.categoryKey,
          description: `${tx.description} ($${(txAbs / 100).toFixed(2)}) is ${Math.round(txAbs / avgCents)}x the average transaction for this category`,
          amountCents: txAbs,
          comparisonCents: avgCents,
        });
      }
    }
  }

  // 2. Category overspend: category spend > 150% of budget with > 50% of period remaining
  if (periodContext.daysRemaining > periodContext.totalDays * 0.5) {
    // Group spending by saver+category
    const categoryTotals = new Map<string, number>();
    for (const tx of spending) {
      const key = `${tx.saverKey ?? ""}::${tx.categoryKey ?? ""}`;
      categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + Math.abs(tx.amountCents));
    }

    for (const [key, totalCents] of categoryTotals) {
      const budget = budgetMap.get(key);
      if (budget && budget > 0 && totalCents > budget * 1.5) {
        const [saverKey, categoryKey] = key.split("::");
        const pctUsed = Math.round((totalCents / budget) * 100);
        anomalies.push({
          id: `overspend::${key}`,
          type: "category_overspend",
          severity: totalCents > budget * 2 ? "alert" : "warning",
          saverKey: saverKey || null,
          categoryKey: categoryKey || null,
          description: `${categoryKey || saverKey} is at ${pctUsed}% of budget with ${periodContext.daysRemaining} days remaining`,
          amountCents: totalCents,
          comparisonCents: budget,
        });
      }
    }
  }

  // 3. Duplicate merchant: same merchant charged twice in one day
  const merchantDateMap = new Map<string, PeriodTransaction[]>();
  for (const tx of spending) {
    // Normalise merchant name: uppercase, strip leading spaces
    const merchant = tx.description.toUpperCase().trim();
    const dateKey = `${merchant}::${tx.transactionDate}`;
    const existing = merchantDateMap.get(dateKey) ?? [];
    existing.push(tx);
    merchantDateMap.set(dateKey, existing);
  }

  for (const [dateKey, txs] of merchantDateMap) {
    if (txs.length >= 2) {
      const [merchant, date] = dateKey.split("::");
      const totalCents = txs.reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
      anomalies.push({
        id: `duplicate::${dateKey}`,
        type: "duplicate_merchant",
        severity: "warning",
        saverKey: txs[0].saverKey,
        categoryKey: txs[0].categoryKey,
        description: `${merchant} was charged ${txs.length} times on ${date} (total $${(totalCents / 100).toFixed(2)})`,
        amountCents: totalCents,
        comparisonCents: Math.abs(txs[0].amountCents),
      });
    }
  }

  // Sort by severity (alerts first), then by amount descending
  anomalies.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "alert" ? -1 : 1;
    }
    return b.amountCents - a.amountCents;
  });

  return anomalies;
}
