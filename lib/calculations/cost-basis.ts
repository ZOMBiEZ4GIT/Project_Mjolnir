import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";

/**
 * Represents a lot (purchase) of shares for cost basis tracking.
 * A lot is a single BUY transaction that may have been partially or fully sold.
 */
export interface Lot {
  /** Date of the original purchase */
  date: string;
  /** Original quantity purchased (may be adjusted for splits) */
  quantity: number;
  /** Unit price at purchase (may be adjusted for splits) */
  unitPrice: number;
  /** Remaining quantity after sells (using FIFO) */
  remainingQuantity: number;
}

/**
 * Result of cost basis calculation for a holding.
 */
export interface CostBasisResult {
  /** Total cost basis of remaining shares */
  costBasis: number;
  /** Total quantity of remaining shares */
  quantity: number;
  /** Individual lots with remaining quantities */
  lots: Lot[];
}

/**
 * Calculates the cost basis for a holding using FIFO (First In, First Out) methodology.
 *
 * FIFO means when shares are sold, the oldest purchased shares are sold first.
 * This function processes all transactions chronologically and tracks:
 * - BUY: Creates a new lot with the purchase details
 * - SELL: Consumes shares from oldest lots first (FIFO)
 * - SPLIT: Adjusts all existing lot quantities and prices proportionally
 *   (e.g., 2:1 split doubles quantity and halves price)
 * - DIVIDEND: Does not affect cost basis
 *
 * @param holdingId - The UUID of the holding to calculate cost basis for
 * @returns Cost basis result with total cost, quantity, and lot details
 */
export async function calculateCostBasis(
  holdingId: string
): Promise<CostBasisResult> {
  // Fetch all non-deleted transactions for this holding, ordered by date ascending
  const txns = await db
    .select({
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
    })
    .from(transactions)
    .where(
      and(eq(transactions.holdingId, holdingId), isNull(transactions.deletedAt))
    )
    .orderBy(asc(transactions.date));

  // Track lots (purchases) with their remaining quantities
  const lots: Lot[] = [];

  for (const txn of txns) {
    const txnQuantity = Number(txn.quantity);
    const txnUnitPrice = Number(txn.unitPrice);

    switch (txn.action) {
      case "BUY":
        // Create a new lot for this purchase
        lots.push({
          date: txn.date,
          quantity: txnQuantity,
          unitPrice: txnUnitPrice,
          remainingQuantity: txnQuantity,
        });
        break;

      case "SELL": {
        // FIFO: consume from oldest lots first
        let remaining = txnQuantity;
        for (const lot of lots) {
          if (remaining <= 0) break;
          if (lot.remainingQuantity <= 0) continue;

          const consumed = Math.min(lot.remainingQuantity, remaining);
          lot.remainingQuantity -= consumed;
          remaining -= consumed;
        }
        break;
      }

      case "SPLIT": {
        // Split adjusts all existing lots:
        // - Quantity is multiplied by split ratio
        // - Unit price is divided by split ratio (to maintain total value)
        // e.g., 2:1 split: 100 shares @ $10 becomes 200 shares @ $5
        const splitRatio = txnQuantity;
        for (const lot of lots) {
          lot.quantity *= splitRatio;
          lot.remainingQuantity *= splitRatio;
          lot.unitPrice /= splitRatio;
        }
        break;
      }

      case "DIVIDEND":
        // Dividends don't affect cost basis
        break;
    }
  }

  // Calculate totals from remaining lots
  let totalCostBasis = 0;
  let totalQuantity = 0;

  for (const lot of lots) {
    if (lot.remainingQuantity > 0) {
      totalCostBasis += lot.remainingQuantity * lot.unitPrice;
      totalQuantity += lot.remainingQuantity;
    }
  }

  // Return only lots with remaining shares
  const activeLots = lots.filter((lot) => lot.remainingQuantity > 0);

  return {
    costBasis: totalCostBasis,
    quantity: totalQuantity,
    lots: activeLots,
  };
}
