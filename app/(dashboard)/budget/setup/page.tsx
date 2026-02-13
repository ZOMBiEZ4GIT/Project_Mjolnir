import { redirect } from "next/navigation";

/**
 * Budget setup wizard — DEPRECATED.
 *
 * Budget periods are now auto-generated (BI-A-009). This page redirects
 * to the main budget dashboard. The setup wizard (payday config, income,
 * template/allocations) is no longer needed.
 */
export default function BudgetSetupPage() {
  redirect("/budget");
}
