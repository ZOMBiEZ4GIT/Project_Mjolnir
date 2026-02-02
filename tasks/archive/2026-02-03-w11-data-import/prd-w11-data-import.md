# PRD: W-11 Data Import

## Introduction

Data import enables bulk loading of historical data into Mjolnir via CSV or Excel files. This is essential for migrating existing portfolio tracking from spreadsheets or other tools. The import system supports holdings, transactions, snapshots, and contributions with intelligent column mapping, duplicate detection, and row-by-row validation with error fixing before final import.

## Goals

- Import holdings, transactions, snapshots, and contributions from CSV/Excel
- Auto-detect columns with manual mapping override
- Preview import with row-by-row validation and error highlighting
- Allow fixing errors before confirming import
- Detect and report duplicates with skip option
- Idempotent imports (re-running doesn't create duplicates)

## User Stories

### US-001: Create file upload component
**Description:** As a developer, I need a reusable file upload component for import.

**Acceptance Criteria:**
- [ ] Create `components/import/file-upload.tsx`
- [ ] Supports drag-and-drop and click to browse
- [ ] Accepts CSV (.csv) and Excel (.xlsx) files
- [ ] Shows file name and size after selection
- [ ] Remove/replace file option
- [ ] Max file size: 10MB
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Verify in browser using Playwright

### US-002: Create CSV parser utility
**Description:** As a developer, I need to parse CSV files into structured data.

**Acceptance Criteria:**
- [ ] Create `lib/import/csv-parser.ts`
- [ ] Function `parseCSV(file): Promise<{ headers: string[], rows: Record<string, string>[] }>`
- [ ] Handles quoted fields and escaped characters
- [ ] Handles different line endings (CRLF, LF)
- [ ] Returns empty array for empty file
- [ ] Uses papaparse or similar library
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create Excel parser utility
**Description:** As a developer, I need to parse Excel files into structured data.

**Acceptance Criteria:**
- [ ] Create `lib/import/excel-parser.ts`
- [ ] Function `parseExcel(file): Promise<{ headers: string[], rows: Record<string, string>[] }>`
- [ ] Reads first sheet by default
- [ ] Converts all values to strings for consistency
- [ ] Handles date cells (converts to ISO string)
- [ ] Uses xlsx or sheetjs library
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create column mapping detector
**Description:** As a developer, I need to auto-detect column mappings from headers.

**Acceptance Criteria:**
- [ ] Create `lib/import/column-mapper.ts`
- [ ] Function `detectColumnMapping(headers, importType): ColumnMapping`
- [ ] Maps common header names to expected fields (e.g., "Date" → date, "Symbol" → symbol)
- [ ] Handles variations: "Unit Price", "Price", "unit_price" all map to unitPrice
- [ ] Returns confidence score per mapping
- [ ] Returns unmapped headers for manual assignment
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create column mapping UI
**Description:** As Roland, I want to review and adjust column mappings before import.

**Acceptance Criteria:**
- [ ] Create `components/import/column-mapper.tsx`
- [ ] Shows detected mappings with confidence indicator
- [ ] Dropdown to change mapping for each column
- [ ] Required fields highlighted if unmapped
- [ ] Preview of first 3 rows with current mapping
- [ ] "Ignore column" option for unmapped columns
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-006: Create import validation engine
**Description:** As a developer, I need to validate imported data row by row.

**Acceptance Criteria:**
- [ ] Create `lib/import/validator.ts`
- [ ] Function `validateRows(rows, importType, mapping): ValidationResult[]`
- [ ] Validates: required fields, data types, date formats, enum values
- [ ] Validates against existing data: holding exists, valid currency, valid action type
- [ ] Returns per-row: { rowIndex, isValid, errors: { field: message }[], warnings: string[] }
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create duplicate detection
**Description:** As a developer, I need to detect duplicates before import.

**Acceptance Criteria:**
- [ ] Add to `lib/import/validator.ts`
- [ ] For transactions: duplicate = same holding + date + action + quantity + price
- [ ] For snapshots: duplicate = same holding + date (month)
- [ ] For holdings: duplicate = same symbol + exchange (or same name for non-tradeable)
- [ ] For contributions: duplicate = same holding + date (month)
- [ ] Returns duplicate rows with existing record reference
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create import preview component
**Description:** As Roland, I want to preview data and see errors before importing.

**Acceptance Criteria:**
- [ ] Create `components/import/import-preview.tsx`
- [ ] Table showing all rows with validation status
- [ ] Error rows highlighted in red with error messages
- [ ] Warning rows highlighted in yellow
- [ ] Duplicate rows marked with "Duplicate" badge
- [ ] Checkbox to include/exclude each row
- [ ] Summary: X valid, Y errors, Z duplicates
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-009: Create inline error fixing
**Description:** As Roland, I want to fix errors in the preview before importing.

**Acceptance Criteria:**
- [ ] Clicking on error cell makes it editable
- [ ] Shows error message as tooltip/hint
- [ ] Re-validates on change
- [ ] Cell turns green when fixed
- [ ] Dropdown for enum fields (action, currency, type)
- [ ] Date picker for date fields
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Create holdings import API
**Description:** As a developer, I need an API to import holdings.

**Acceptance Criteria:**
- [ ] Create `app/api/import/holdings/route.ts` with POST handler
- [ ] Accepts array of holding objects
- [ ] Validates each holding
- [ ] Skips duplicates (returns skipped count)
- [ ] Creates non-duplicate holdings
- [ ] Returns: { created: number, skipped: number, errors: [] }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Create transactions import API
**Description:** As a developer, I need an API to import transactions.

**Acceptance Criteria:**
- [ ] Create `app/api/import/transactions/route.ts` with POST handler
- [ ] Accepts array of transaction objects
- [ ] Validates: holding exists, valid action, valid amounts
- [ ] Skips duplicates
- [ ] Creates non-duplicate transactions
- [ ] Returns: { created: number, skipped: number, errors: [] }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Create snapshots import API
**Description:** As a developer, I need an API to import snapshots.

**Acceptance Criteria:**
- [ ] Create `app/api/import/snapshots/route.ts` with POST handler
- [ ] Accepts array of snapshot objects
- [ ] Validates: holding exists, valid date, valid balance
- [ ] Skips duplicates (same holding + month)
- [ ] Creates non-duplicate snapshots
- [ ] Returns: { created: number, skipped: number, errors: [] }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-013: Create contributions import API
**Description:** As a developer, I need an API to import super contributions.

**Acceptance Criteria:**
- [ ] Create `app/api/import/contributions/route.ts` with POST handler
- [ ] Accepts array of contribution objects
- [ ] Validates: holding exists and is super type, valid amounts
- [ ] Skips duplicates (same holding + month)
- [ ] Creates non-duplicate contributions
- [ ] Returns: { created: number, skipped: number, errors: [] }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-014: Create import wizard page
**Description:** As Roland, I want a guided import wizard experience.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/import/page.tsx`
- [ ] Step 1: Select import type (Holdings, Transactions, Snapshots, Contributions)
- [ ] Step 2: Upload file
- [ ] Step 3: Map columns
- [ ] Step 4: Preview and fix errors
- [ ] Step 5: Confirm and import
- [ ] Step 6: Results summary
- [ ] Back/Next navigation between steps
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Create import results summary
**Description:** As Roland, I want to see a summary of what was imported.

**Acceptance Criteria:**
- [ ] Create `components/import/import-results.tsx`
- [ ] Shows: created count, skipped count, error count
- [ ] Lists skipped duplicates (collapsible)
- [ ] Lists errors if any (collapsible)
- [ ] "Import More" button to start over
- [ ] "View Holdings/Transactions" button to navigate
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Create sample import templates
**Description:** As Roland, I want downloadable templates showing expected format.

**Acceptance Criteria:**
- [ ] Create `public/templates/` directory
- [ ] Create `holdings-template.csv` with example rows
- [ ] Create `transactions-template.csv` with example rows
- [ ] Create `snapshots-template.csv` with example rows
- [ ] Create `contributions-template.csv` with example rows
- [ ] Download links on import page
- [ ] Templates include header comments explaining fields
- [ ] Typecheck passes
- [ ] Lint passes

### US-017: Create import documentation
**Description:** As Roland, I want to understand the expected import format.

**Acceptance Criteria:**
- [ ] Create `components/import/import-help.tsx`
- [ ] Expandable help section on import page
- [ ] Documents all expected fields per import type
- [ ] Shows example data
- [ ] Explains date formats accepted
- [ ] Explains duplicate detection logic
- [ ] Links to download templates
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Add import to navigation
**Description:** As Roland, I want to access the import page from navigation.

**Acceptance Criteria:**
- [ ] Add "Import" link to dashboard navigation
- [ ] Link navigates to `/import` route
- [ ] Current page highlighted in navigation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Create import history/log
**Description:** As Roland, I want to see history of my imports.

**Acceptance Criteria:**
- [ ] Create `import_logs` table: id, user_id, import_type, file_name, rows_total, rows_created, rows_skipped, rows_failed, created_at
- [ ] Log each import operation
- [ ] Show import history on import page (collapsible)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Import supports CSV and Excel (.xlsx) files
- FR-2: Auto-detect column mappings with manual override
- FR-3: Row-by-row validation with error highlighting
- FR-4: Inline editing to fix errors before import
- FR-5: Duplicate detection based on key fields per type
- FR-6: Duplicates skipped by default with report
- FR-7: Import is idempotent (re-running safe)
- FR-8: Holdings import: type, name, symbol, currency, exchange
- FR-9: Transactions import: holding (by symbol), date, action, quantity, price, fees
- FR-10: Snapshots import: holding (by name), date, balance
- FR-11: Contributions import: holding (by name), date, employer, employee amounts

## Non-Goals

- No import from external services (brokerage APIs, bank feeds)
- No scheduled/automatic imports
- No import of price history
- No import of user preferences
- No XML or other formats beyond CSV/Excel

## Design Considerations

- Wizard flow should feel guided, not overwhelming
- Progress indicator showing current step
- Error states should be fixable, not blocking
- Preview table should handle large files (virtualization)
- Mobile: consider simplified flow or warning about desktop use

## Technical Considerations

- Use papaparse for CSV (handles edge cases well)
- Use xlsx/sheetjs for Excel parsing
- Consider web workers for large file parsing
- Batch API calls (100 rows at a time) for large imports
- Client-side validation before API call
- Consider chunked uploads for very large files

## Success Metrics

- Import 1000 rows in under 30 seconds
- 95% of columns auto-detected correctly
- Error fixing UI is intuitive (no support needed)
- Zero duplicate records created
- No TypeScript errors, lint passes

## Open Questions

- Should we support importing from Google Sheets directly?
- Should we offer "undo import" functionality?
- Should we support importing trades from broker export formats (CommSec, SelfWealth)?
