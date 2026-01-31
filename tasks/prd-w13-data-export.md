# PRD: W-13 Data Export

## Introduction

Data export enables Roland to back up portfolio data and maintain data portability. Exports support CSV, JSON, and Excel formats with options for individual data types or combined archives. The export format matches the import format for seamless round-trip data management, and includes metadata and documentation for easy re-import or use in other tools.

## Goals

- Export holdings, transactions, snapshots, and contributions
- Support CSV, JSON, and Excel (.xlsx) formats
- Option for individual files or combined ZIP archive
- Date range filtering for transactions and snapshots
- Export format compatible with import (round-trip)
- Include metadata and documentation in exports

## User Stories

### US-001: Create CSV export utility
**Description:** As a developer, I need a utility to generate CSV files from data.

**Acceptance Criteria:**
- [ ] Create `lib/export/csv-generator.ts`
- [ ] Function `generateCSV(data, columns): string`
- [ ] Handles special characters (quotes, commas, newlines)
- [ ] Supports custom column headers
- [ ] Handles null/undefined values gracefully
- [ ] Returns CSV string ready for download
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create JSON export utility
**Description:** As a developer, I need a utility to generate JSON exports.

**Acceptance Criteria:**
- [ ] Create `lib/export/json-generator.ts`
- [ ] Function `generateJSON(data, options): string`
- [ ] Options: pretty print, include metadata
- [ ] Metadata includes: export date, version, record counts
- [ ] Handles dates as ISO strings
- [ ] Returns formatted JSON string
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create Excel export utility
**Description:** As a developer, I need a utility to generate Excel files.

**Acceptance Criteria:**
- [ ] Create `lib/export/excel-generator.ts`
- [ ] Function `generateExcel(sheets): Blob`
- [ ] Supports multiple sheets (one per data type)
- [ ] Formats dates and numbers appropriately
- [ ] Adds header row styling (bold)
- [ ] Uses xlsx/sheetjs library
- [ ] Returns Blob for download
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create ZIP archive utility
**Description:** As a developer, I need to combine multiple files into a ZIP.

**Acceptance Criteria:**
- [ ] Create `lib/export/zip-generator.ts`
- [ ] Function `createZip(files: { name: string, content: string | Blob }[]): Promise<Blob>`
- [ ] Supports mixing CSV, JSON, and text files
- [ ] Uses jszip or similar library
- [ ] Returns Blob for download
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create holdings export function
**Description:** As a developer, I need to export holdings data.

**Acceptance Criteria:**
- [ ] Create `lib/export/exporters/holdings.ts`
- [ ] Function `exportHoldings(format): Promise<ExportResult>`
- [ ] Exports: id, type, name, symbol, currency, exchange, is_dormant, created_at
- [ ] Excludes soft-deleted holdings
- [ ] Supports CSV, JSON, Excel formats
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create transactions export function
**Description:** As a developer, I need to export transactions data.

**Acceptance Criteria:**
- [ ] Create `lib/export/exporters/transactions.ts`
- [ ] Function `exportTransactions(format, options): Promise<ExportResult>`
- [ ] Options: dateFrom, dateTo, holdingId (all optional)
- [ ] Exports: date, holding_name, symbol, action, quantity, unit_price, fees, currency, notes
- [ ] Includes holding info for context
- [ ] Sorted by date descending
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create snapshots export function
**Description:** As a developer, I need to export snapshots data.

**Acceptance Criteria:**
- [ ] Create `lib/export/exporters/snapshots.ts`
- [ ] Function `exportSnapshots(format, options): Promise<ExportResult>`
- [ ] Options: dateFrom, dateTo, holdingId (all optional)
- [ ] Exports: date, holding_name, type, balance, currency, notes
- [ ] Sorted by date descending
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create contributions export function
**Description:** As a developer, I need to export contributions data.

**Acceptance Criteria:**
- [ ] Create `lib/export/exporters/contributions.ts`
- [ ] Function `exportContributions(format, options): Promise<ExportResult>`
- [ ] Options: dateFrom, dateTo, holdingId (all optional)
- [ ] Exports: date, holding_name, employer_contribution, employee_contribution, notes
- [ ] Only for super holdings
- [ ] Sorted by date descending
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Create combined export function
**Description:** As a developer, I need to export all data types together.

**Acceptance Criteria:**
- [ ] Create `lib/export/exporters/combined.ts`
- [ ] Function `exportAll(format, options): Promise<ExportResult>`
- [ ] Options: format (csv-zip, json, excel), dateFrom, dateTo
- [ ] For CSV: creates ZIP with separate files per type
- [ ] For JSON: single file with all data nested
- [ ] For Excel: single file with multiple sheets
- [ ] Includes README.txt with documentation
- [ ] Typecheck passes
- [ ] Lint passes

### US-010: Create export metadata generator
**Description:** As a developer, I need to include metadata in exports.

**Acceptance Criteria:**
- [ ] Create `lib/export/metadata.ts`
- [ ] Function `generateMetadata(): ExportMetadata`
- [ ] Includes: export_date, app_version, record_counts, user_id (hashed), format_version
- [ ] For JSON: embedded in root object
- [ ] For CSV/Excel: separate metadata.json file in ZIP
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Create export documentation generator
**Description:** As a developer, I need to include documentation in exports.

**Acceptance Criteria:**
- [ ] Create `lib/export/documentation.ts`
- [ ] Function `generateReadme(): string`
- [ ] Documents each file/sheet and its columns
- [ ] Explains data types and formats (dates, enums)
- [ ] Explains how to re-import
- [ ] Included as README.txt in ZIP exports
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Create export API endpoint
**Description:** As a developer, I need an API endpoint to generate exports.

**Acceptance Criteria:**
- [ ] Create `app/api/export/route.ts` with GET handler
- [ ] Query params: type (holdings/transactions/snapshots/contributions/all), format (csv/json/xlsx), dateFrom, dateTo
- [ ] Returns file as download (Content-Disposition header)
- [ ] Appropriate content-type for format
- [ ] Filename includes type and date: `mjolnir-holdings-2024-03-15.csv`
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-013: Create export page UI
**Description:** As Roland, I want a dedicated page to configure and download exports.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/export/page.tsx`
- [ ] Section for each data type with export button
- [ ] Format selector: CSV, JSON, Excel
- [ ] Date range picker for transactions/snapshots
- [ ] "Export All" option for combined backup
- [ ] Preview of record counts before export
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Create export format selector component
**Description:** As Roland, I want to choose my export format easily.

**Acceptance Criteria:**
- [ ] Create `components/export/format-selector.tsx`
- [ ] Radio buttons or toggle: CSV, JSON, Excel
- [ ] Icon for each format
- [ ] Description of what each produces
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Create date range filter component
**Description:** As Roland, I want to filter exports by date range.

**Acceptance Criteria:**
- [ ] Create `components/export/date-range-picker.tsx`
- [ ] Preset options: All time, This year, Last 12 months, Custom
- [ ] Custom shows from/to date pickers
- [ ] Clear button to reset to all time
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Create export progress indicator
**Description:** As Roland, I want to see progress when exporting large datasets.

**Acceptance Criteria:**
- [ ] Show progress bar during export generation
- [ ] For combined exports: show which type is being processed
- [ ] Cancel button for long exports
- [ ] Success state with download link
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Create download helper utility
**Description:** As a developer, I need a utility to trigger file downloads.

**Acceptance Criteria:**
- [ ] Create `lib/utils/download.ts`
- [ ] Function `downloadBlob(blob, filename): void`
- [ ] Function `downloadFile(url, filename): void`
- [ ] Creates temporary anchor element for download
- [ ] Cleans up after download initiated
- [ ] Works across browsers
- [ ] Typecheck passes
- [ ] Lint passes

### US-018: Add export to navigation
**Description:** As Roland, I want to access the export page from navigation.

**Acceptance Criteria:**
- [ ] Add "Export" link to dashboard navigation
- [ ] Position near Import for discoverability
- [ ] Link navigates to `/export` route
- [ ] Current page highlighted
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Create export history log
**Description:** As Roland, I want to see my recent exports.

**Acceptance Criteria:**
- [ ] Create `export_logs` table: id, user_id, export_type, format, record_count, file_size, created_at
- [ ] Log each export
- [ ] Show recent exports on export page (last 10)
- [ ] Re-download link if file still available (cache 24h)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-020: Ensure round-trip compatibility
**Description:** As a developer, I need exports to be re-importable.

**Acceptance Criteria:**
- [ ] Export column names match import expectations
- [ ] Date formats consistent (ISO 8601)
- [ ] Enum values match exactly (BUY, SELL, etc.)
- [ ] Test: export → import → export produces identical data
- [ ] Document any fields not included in export (system fields)
- [ ] Typecheck passes
- [ ] Lint passes

## Functional Requirements

- FR-1: Export holdings, transactions, snapshots, contributions
- FR-2: Support CSV, JSON, Excel formats
- FR-3: Individual exports per data type
- FR-4: Combined export as ZIP (CSV) or single file (JSON/Excel)
- FR-5: Date range filtering for time-based data
- FR-6: Metadata included in all exports
- FR-7: Documentation (README) included in ZIP exports
- FR-8: Export format matches import format (round-trip)
- FR-9: Filenames include type and export date
- FR-10: Export logs kept for history

## Non-Goals

- No scheduled/automated exports (manual only)
- No export to cloud storage (Google Drive, Dropbox)
- No PDF report generation
- No export of price cache or exchange rates
- No export of user preferences

## Design Considerations

- Export page should be clean and simple
- Format icons help users understand output
- Progress indicator for exports taking >2 seconds
- Clear success state with download button
- Consider export preview (first 5 rows)

## Technical Considerations

- Use streaming for large exports if possible
- Client-side generation for small datasets
- Server-side for large datasets or combined exports
- Consider web workers for heavy processing
- ZIP files can get large - set reasonable limits
- Content-Disposition header for proper filename

## Success Metrics

- Export 1000 records in under 5 seconds
- Exported data re-imports without errors
- All export formats readable in target applications
- No data loss in round-trip
- No TypeScript errors, lint passes

## Open Questions

- Should we offer encrypted exports for sensitive data?
- Should exports include soft-deleted records as an option?
- Should we add export scheduling in a future version?
