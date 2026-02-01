import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, isNull, and, asc } from "drizzle-orm";

/**
 * Calculates the current quantity held for a given holding.
 *
 * Processing rules:
 * - BUY: Adds to quantity
 * - SELL: Subtracts from quantity
 * - SPLIT: Multiplies current quantity by split ratio (e.g., 2:1 split = multiply by 2)
 * - DIVIDEND: Does not affect quantity
 *
 * Splits are applied chronologically - all transactions before a split maintain their
 * original quantities, but the running total is multiplied when a split is processed.
 *
 * @param holdingId - The UUID of the holding to calculate quantity for
 * @returns The current quantity held (as a number)
 */
export async function calculateQuantityHeld(holdingId: string): Promise<number> {
  // Fetch all non-deleted transactions for this holding, ordered by date ascending
  const txns = await db
    .select({
      date: transactions.date,
      action: transactions.action,
      quantity: transactions.quantity,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.holdingId, holdingId),
        isNull(transactions.deletedAt)
      )
    )
    .orderBy(asc(transactions.date));

  let quantity = 0;

  for (const txn of txns) {
    const txnQuantity = Number(txn.quantity);

    switch (txn.action) {
      case "BUY":
        quantity += txnQuantity;
        break;
      case "SELL":
        quantity -= txnQuantity;
        break;
      case "SPLIT":
        // Split ratio is stored in quantity field
        // e.g., 2:1 split means quantity becomes 2x
        quantity *= txnQuantity;
        break;
      case "DIVIDEND":
        // Dividends don't affect quantity held
        break;
    }
  }

  return quantity;
}
