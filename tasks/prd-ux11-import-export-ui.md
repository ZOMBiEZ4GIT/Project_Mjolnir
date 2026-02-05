# PRD: UX-11 — Import/Export UI

## Introduction

Polish the import and export experiences with design tokens, animations, and improved feedback. The file upload gets animated progress and a row-preview step before committing. The export page gets staggered card animations with download progress indicators. Import results get animated count-up numbers, expandable error rows with fix suggestions, and a downloadable error report. The recent imports history section gets stagger animations and smooth expand/collapse details. All components get design token treatment throughout.

## Goals

- Polish the file upload component with design tokens, animated drag-and-drop feedback, and upload progress
- Add a parsed-row preview step before committing an import
- Polish export cards with stagger animations and download progress indicators
- Add success animations on completed downloads
- Enhance import results with animated counts, expandable errors, and fix suggestions
- Add downloadable error report for failed import rows
- Polish recent imports history with stagger, hover, and expandable details
- Apply design tokens across all import/export components

## User Stories

### US-001: Polish file upload component with design tokens and animation
**Description:** As a user, I want the file upload area to feel polished and responsive so dragging and dropping files feels natural.

**Acceptance Criteria:**
- [ ] Update `components/import/file-upload.tsx`:
  - Default state: dashed border using `border-border`, `bg-card` background, upload icon in `text-muted-foreground`
  - Drag-over state: border becomes `border-accent`, background becomes `bg-accent/5`, icon pulses with `animate-pulse`
  - Drag-over transition: 150ms ease-in-out
  - File selected state: solid border `border-border`, file icon + filename + size in `text-foreground`, clear button in `text-muted-foreground`
  - Error state: border becomes `border-destructive`, error message in `text-destructive`
- [ ] Add entrance animation: `fadeIn` preset on mount
- [ ] File icon animates in when a file is selected (scale 0.8 → 1.0, 200ms)
- [ ] Clear button has hover effect: `hover:text-foreground`
- [ ] Replace all hardcoded `bg-gray-*`, `text-gray-*`, `border-gray-*` with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Add animated upload progress bar
**Description:** As a user, I want to see clear progress when my file is being processed so I know the import is working.

**Acceptance Criteria:**
- [ ] Update `components/import/import-progress.tsx`:
  - Replace indeterminate spinner with a determinate progress bar when row count is known
  - Progress bar: `bg-accent` fill on `bg-muted` track, `rounded-full`, height 6px
  - Progress fills from 0% to 100% as rows are processed
  - Below the bar: "Processing row X of Y..." text in `text-muted-foreground`
  - Progress bar fill animates smoothly (use CSS transition `width 300ms ease-out`)
- [ ] If row count is unknown (initial parsing phase): show an indeterminate progress bar with shimmer animation
- [ ] Add a subtle pulsing glow on the progress bar during processing (`shadow-glow-sm`)
- [ ] Entrance animation: progress bar slides in from left (200ms)
- [ ] Uses design tokens throughout — no hardcoded colours
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Add parsed-row preview step before import
**Description:** As a user, I want to see a preview of my data before it's imported so I can verify it looks correct and catch issues early.

**Acceptance Criteria:**
- [ ] Add a preview step between file selection and import execution on the import page (`app/(dashboard)/import/page.tsx`)
- [ ] After file is selected and parsed, show a preview table:
  - First 10 rows of the parsed CSV displayed in a compact table
  - Column headers from the CSV shown as table headers
  - If more than 10 rows: show "...and X more rows" below the table
  - Total row count displayed prominently: "Y rows ready to import"
- [ ] Preview table uses design tokens: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground` for secondary data
- [ ] Preview table rows stagger in (30ms delay per row, capped at 300ms)
- [ ] Two buttons below the preview:
  - "Import [Y] Rows" — primary button with accent styling, triggers the import
  - "Cancel" — secondary button, clears the file and returns to upload state
- [ ] If CSV has validation issues visible in preview (e.g., missing required columns), show an amber warning banner above the table: "Some columns may be missing — import will skip invalid rows"
- [ ] Preview step transitions in with a slide animation (slide left from file upload, 250ms)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Polish export cards with stagger animations
**Description:** As a user, I want the export page to feel polished with animated cards that make the options clear.

**Acceptance Criteria:**
- [ ] Update `app/(dashboard)/export/page.tsx`:
  - Export section cards use: `bg-card border border-border rounded-2xl p-4 sm:p-6`
  - Cards stagger in on page load (80ms delay between cards) using `staggerContainer`/`staggerItem` presets
  - Each card fades in + slides up
- [ ] Card layout for each export type:
  - Icon (top-left): relevant Lucide icon (FileSpreadsheet for CSV, FileJson for JSON, Database for backup)
  - Title: data type name in `text-foreground font-medium`
  - Description: brief explanation of what's included in `text-muted-foreground text-body-sm`
  - Count badge: number of records (e.g., "142 transactions") in `text-muted-foreground`
  - Export buttons: CSV and JSON buttons side by side
- [ ] Card hover effect: `shadow-card-hover` with 150ms transition
- [ ] Full backup card has accent border: `border-accent/30` to distinguish it from individual exports
- [ ] Replace all hardcoded colours with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Add download progress indicator and success animation
**Description:** As a user, I want to see progress when downloading exports and a clear success indicator when complete.

**Acceptance Criteria:**
- [ ] Update export buttons with download states:
  - Default: button text (e.g., "Export CSV") with download icon
  - Downloading: button text changes to "Downloading...", icon spins (`animate-spin`), button disabled
  - Success: button briefly shows checkmark icon + "Downloaded!" in `text-positive` (1.5 seconds), then returns to default
  - Error: button briefly shows X icon + "Failed" in `text-destructive` (2 seconds), then returns to default
- [ ] Success state includes a brief scale pulse animation on the button (scale 1.0 → 1.05 → 1.0, 300ms)
- [ ] Toast notification on success: "Exported [type] as [format] — [filename]"
- [ ] Toast notification on error: "Failed to export [type]"
- [ ] Download state tracked per-button (multiple exports can be triggered independently)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Enhance import results with animated counts
**Description:** As a user, I want import results to feel dynamic with animated numbers so I can quickly understand the outcome.

**Acceptance Criteria:**
- [ ] Update `components/import/import-results.tsx`:
  - Three result cards in a row: Imported (green), Skipped (amber), Errors (red)
  - Each card shows: icon + count + label
  - Counts animate up from 0 to final value using `NumberTicker` (from UX-6), 600ms
  - Imported card: checkmark icon, `text-positive`, `bg-positive/10` background
  - Skipped card: alert-circle icon, `text-warning`, `bg-warning/10` background
  - Errors card: x-circle icon, `text-destructive`, `bg-destructive/10` background
- [ ] Cards stagger in (100ms delay between them)
- [ ] If all rows imported successfully (0 skipped, 0 errors): show a success banner with checkmark animation above the cards: "All rows imported successfully!"
- [ ] Replace all hardcoded colour classes with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Add expandable error rows with fix suggestions
**Description:** As a user, I want to see detailed errors from my import with helpful suggestions so I can fix my CSV and re-import.

**Acceptance Criteria:**
- [ ] Update the error details section in `components/import/import-results.tsx`:
  - Error section is collapsible (collapsed by default if > 5 errors)
  - Toggle button: "Show X errors" / "Hide errors"
  - Expand/collapse uses Framer Motion height animation (200ms, ease-out)
- [ ] Each error row displays:
  - Row number badge: `bg-muted text-muted-foreground rounded-full` (e.g., "Row 15")
  - Error message in `text-destructive`
  - Fix suggestion in `text-muted-foreground text-body-sm` (e.g., "Missing required field 'quantity' — ensure all BUY/SELL rows have a quantity value")
- [ ] Fix suggestions generated based on error type:
  - Missing field → "Ensure all rows have a value for '[field]'"
  - Invalid format → "Expected format: [format example]"
  - Duplicate detected → "This row matches an existing record — duplicates are automatically skipped"
  - Invalid value → "Value '[value]' is not valid — expected [type]"
- [ ] Error rows stagger in when expanded (30ms delay per row)
- [ ] Each error row has a subtle left border colour-coded by severity: `border-l-2 border-destructive`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Add downloadable error report
**Description:** As a user, I want to download a report of import errors so I can fix my CSV file offline and re-import.

**Acceptance Criteria:**
- [ ] Add a "Download Error Report" button in the error section of import results
- [ ] Button: secondary styling with download icon, `text-muted-foreground`
- [ ] Button only appears when there are errors (> 0)
- [ ] Downloaded file: CSV format with columns: `row_number`, `error_message`, `suggestion`, `original_data`
- [ ] Filename: `import-errors-YYYY-MM-DD.csv`
- [ ] Download triggers the same success animation as export buttons (US-005): brief checkmark + "Downloaded!" state
- [ ] Typecheck passes (`npm run build`)

### US-009: Polish recent imports history with animations
**Description:** As a user, I want the recent imports section to feel polished with smooth animations and clear status indicators.

**Acceptance Criteria:**
- [ ] Update `components/import/recent-imports.tsx`:
  - Section title: "Recent Imports" in `text-label` typography
  - Import rows stagger in on mount (50ms delay per row)
  - Each row shows: filename, import type badge, counts summary, relative timestamp
- [ ] Import type badges: pill-shaped
  - Transactions: `bg-accent/20 text-accent`
  - Snapshots: `bg-positive/20 text-positive`
- [ ] Row hover effect: `bg-accent/5` with 150ms transition
- [ ] Expandable details per row (click to expand):
  - Shows: imported count, skipped count, error count, full timestamp
  - If errors exist: shows first 3 error messages with row numbers
  - Expand/collapse uses Framer Motion height animation (200ms)
  - Chevron icon rotates on expand (90° → 0°)
- [ ] Relative timestamps: "2 hours ago", "Yesterday", "3 days ago"
- [ ] Empty state: "No imports yet" with subtle illustration, uses design tokens
- [ ] Skeleton loading state uses `bg-muted animate-pulse`
- [ ] Replace all hardcoded colours with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Replace hardcoded colours across all import/export components
**Description:** As a developer, I want all import/export components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit and update all files:
  - `app/(dashboard)/export/page.tsx`
  - `app/(dashboard)/import/page.tsx`
  - `components/import/file-upload.tsx`
  - `components/import/import-progress.tsx`
  - `components/import/import-results.tsx`
  - `components/import/recent-imports.tsx`
  - `components/charts/chart-export-button.tsx`
- [ ] Replace:
  - `text-white` → `text-foreground`
  - `text-gray-*` → `text-muted-foreground`
  - `bg-gray-*` → `bg-card`, `bg-muted`, or `bg-background`
  - `border-gray-*` → `border-border`
  - `text-green-*` → `text-positive`
  - `text-red-*` → `text-destructive`
  - `text-yellow-*` / `text-amber-*` → `text-warning`
  - `bg-green-*` → `bg-positive/10` or `bg-positive/20`
  - `bg-red-*` → `bg-destructive/10` or `bg-destructive/20`
  - `bg-yellow-*` → `bg-warning/10` or `bg-warning/20`
- [ ] Page headers use typography tokens (`text-heading-lg`, `text-heading-md`)
- [ ] Descriptions use `text-body-sm text-muted-foreground`
- [ ] Visual appearance preserved or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The parsed-row preview must display accurately — column headers must match the CSV headers, data must be displayed as-is without transformation
- FR-2: The preview step must not trigger any database writes — import only happens when the user clicks "Import [Y] Rows"
- FR-3: The download progress indicator must track per-button state independently — clicking "Export CSV" on transactions while holdings JSON is downloading must not conflict
- FR-4: The error report CSV must include the original data from the source CSV row so the user can identify and fix the issue
- FR-5: Fix suggestions must be generated deterministically from the error type — no LLM or AI-generated suggestions, just pattern-matched templates
- FR-6: The import flow step transitions (upload → preview → importing → results) must preserve state — going back from preview to upload should retain the selected file
- FR-7: Recent imports history must be sorted by most recent first (current behaviour preserved)
- FR-8: Export record counts must be fetched on page load and update if data changes (use TanStack Query with appropriate stale time)
- FR-9: The chart export button (`chart-export-button.tsx`) must also receive design token treatment consistent with other export buttons

## Non-Goals

- No column mapping wizard (auto-detect columns only)
- No import of holdings directly (holdings are auto-created during transaction/snapshot import)
- No JSON import (CSV only for import)
- No export scheduling or automatic backups
- No import from third-party services (e.g., Sharesight, Yahoo Finance portfolio)
- No drag-and-drop reordering of export cards
- No import undo/rollback functionality
- No changes to the import/export API endpoints or CSV parsing logic

## Design Considerations

- **File upload area**: Large drop zone (at least 200px tall) with dashed border creates a clear target. The drag-over state with accent border and background tint provides unmistakable feedback. Selected file display is compact but informative (icon + name + size + clear button).
- **Preview table**: Compact, read-only table with alternating row backgrounds (`bg-card` / `bg-muted/50`). Column headers in `text-muted-foreground`. Data truncated with ellipsis if too wide. The "...and X more rows" indicator prevents the preview from becoming unwieldy.
- **Export cards**: Consistent card layout with the rest of the app (`rounded-2xl`, consistent padding). The backup card's accent border subtly communicates it's the "premium" export option. Icon + title + description + buttons creates a clear visual hierarchy.
- **Import results cards**: Three cards in a horizontal row on desktop, stacked on mobile. Colour-coded backgrounds (green/amber/red) with matching icons create an instant visual summary. NumberTicker animation on counts adds polish without slowing the user down.
- **Error rows**: Left border colour-coding (red) creates a visual "flag". Row number badge provides quick identification. Fix suggestion in smaller, muted text is helpful but doesn't overwhelm the error message.

## Technical Considerations

- **Preview table data**: After parsing the CSV with `parseCSV()`, slice the first 10 rows for display. The full parsed data is held in state and passed to the import API when the user confirms.
- **Error report generation**: Build a CSV string client-side from the error data returned by the import API. Each error row includes the original CSV row data (stored in the error object's context). Use `URL.createObjectURL()` and `<a download>` pattern for the download.
- **Fix suggestion mapping**: Create a simple map of error type patterns to suggestion templates:
  ```
  "missing_field" → "Ensure all rows have a value for '{field}'"
  "invalid_date" → "Expected date format: YYYY-MM-DD (e.g., 2026-01-15)"
  "invalid_number" → "Expected a numeric value for '{field}'"
  "duplicate" → "This row matches an existing record — duplicates are automatically skipped"
  ```
- **Download state per-button**: Use a `Map<string, DownloadState>` in component state, keyed by export type + format (e.g., `"transactions-csv"`). Each button reads its own state from the map.
- **NumberTicker in results**: Since there are only 3 result cards, NumberTicker performance is not a concern. Use the full per-digit approach (approach A from UX-6) for visual polish.
- **Step flow state machine**: The import page flow (upload → preview → importing → results) can be managed with a simple `useState<"upload" | "preview" | "importing" | "results">` state machine. Wrap steps in `AnimatePresence` with directional slide transitions (same pattern as UX-5 check-in wizard).

## Success Metrics

- File upload drag-and-drop feels responsive with clear visual feedback
- Parsed-row preview gives users confidence before importing
- Export cards stagger in smoothly on page load
- Download buttons show clear progress and success states
- Import results animate with NumberTicker count-up
- Error details are expandable with fix suggestions
- Error report is downloadable as CSV
- Recent imports section is polished with smooth expand/collapse
- All hardcoded colours replaced with design tokens
- `npm run build` and `npm run lint` pass cleanly
- No regressions in import/export functionality

## Open Questions

- None — scope is well-defined.
