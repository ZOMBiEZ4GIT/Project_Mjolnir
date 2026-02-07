import { NextResponse } from "next/server";
import { withAuth } from "@/lib/utils/with-auth";
import { budgetTemplates } from "@/lib/budget/templates";

/**
 * GET /api/budget/templates
 *
 * Returns all available budget templates with their allocation definitions.
 */
export const GET = withAuth(async () => {
  return NextResponse.json(budgetTemplates);
}, "fetching budget templates");
