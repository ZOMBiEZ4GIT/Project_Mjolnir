/**
 * Snapshot Import API Endpoint
 * POST /api/import/snapshots
 *
 * Accepts multipart form data with a CSV file.
 * Parses CSV, validates rows, imports valid snapshots.
 * Returns summary: { total, imported, skipped, errors }
 */

import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/import/csv-parser";
import { validateSnapshotRows } from "@/lib/import/validators/snapshot-validator";
import { importSnapshots, type ImportError } from "@/lib/import/snapshot-importer";
import { db } from "@/lib/db";
import { importHistory } from "@/lib/db/schema";
import { withAuth } from "@/lib/utils/with-auth";

interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export const POST = withAuth(async (request, _context, userId) => {
  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  // Get the file from form data
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Invalid file format" },
      { status: 400 }
    );
  }

  // Validate file type (accept .csv)
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv")) {
    return NextResponse.json(
      { error: "File must be a CSV file" },
      { status: 400 }
    );
  }

  // Read file content
  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read file content" },
      { status: 400 }
    );
  }

  // Parse CSV
  const csvRows = parseCSV(content);

  if (csvRows.length === 0) {
    return NextResponse.json(
      { error: "CSV file is empty or contains no data rows" },
      { status: 400 }
    );
  }

  // Validate all rows
  const validationResults = validateSnapshotRows(csvRows);

  // Separate valid and invalid rows
  const validRows = validationResults
    .filter((result) => result.valid && result.data !== null)
    .map((result) => result.data!);

  const validationErrors: ImportError[] = validationResults
    .filter((result) => !result.valid)
    .map((result, index) => ({
      row: index + 2, // +2 because row 1 is header
      message: result.errors.join("; "),
    }));

  // Import valid snapshots
  const importResult = await importSnapshots(userId, validRows);

  // Combine validation errors with import errors
  const allErrors = [...validationErrors, ...importResult.errors];

  // Build response summary
  const summary: ImportSummary = {
    total: csvRows.length,
    imported: importResult.imported,
    skipped: importResult.skipped + validationErrors.length,
    errors: allErrors,
  };

  // Save import history record
  await db.insert(importHistory).values({
    userId,
    type: "snapshots",
    filename: file.name,
    total: summary.total,
    imported: summary.imported,
    skipped: summary.skipped,
    errorsJson: allErrors.length > 0 ? JSON.stringify(allErrors) : null,
  });

  return NextResponse.json(summary);
}, "importing snapshots");
