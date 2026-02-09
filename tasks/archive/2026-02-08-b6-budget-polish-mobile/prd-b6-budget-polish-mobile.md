# PRD: Budget Polish & Mobile (Epic B-6)

## Introduction

Final polish pass on the budget system — mobile optimisation, transaction search, custom category management, spending trends (month-over-month), and budget data export. This epic takes everything built in B-1 through B-5 and makes it feel complete, performant, and usable on every device.

## Goals

- Optimise all budget pages for mobile/touch
- Add transaction search and filtering
- Allow creating and editing custom budget categories
- Show month-over-month spending trends
- Enable CSV export of budget and transaction data
- Ensure consistent styling with existing Mjolnir design tokens

## User Stories

### US-001: Mobile-optimise budget dashboard
**Description:** As a user on mobile, I want the budget dashboard to be touch-friendly and usable for quick balance checks.

**Acceptance Criteria:**
- [ ] Budget dashboard page renders correctly on screens 320px-768px
- [ ] Category cards stack to single column on small screens
- [ ] Payday countdown and savings indicator stack vertically on mobile
- [ ] Period selector is touch-friendly (large tap targets)
- [ ] All text is readable without zooming
- [ ] No horizontal scrolling on any mobile viewport
- [ ] Touch targets are minimum 44x44px
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-002: Mobile-optimise transaction list
**Description:** As a user on mobile, I want the transaction list to be easy to scroll and interact with on my phone.

**Acceptance Criteria:**
- [ ] Transaction rows are compact but readable on mobile
- [ ] Category override dropdown works with touch (no hover-only interactions)
- [ ] Filter bar collapses into a filter icon/button on mobile that expands a filter panel
- [ ] Search input is full-width on mobile
- [ ] Amount and date columns don't get truncated
- [ ] Pull-to-refresh or visible refresh button
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-003: Transaction search and filtering
**Description:** As a user, I want to search and filter my transactions so I can find specific purchases or review spending patterns.

**Acceptance Criteria:**
- [ ] Create `components/budget/TransactionSearch.tsx` — search input with debounced queries (300ms)
- [ ] Searches across description and raw_text fields (case-insensitive)
- [ ] Combine with existing category and date filters
- [ ] URL params updated on filter change for shareable/bookmarkable filtered views
- [ ] Clear all filters button
- [ ] Result count shown (e.g. "Showing 23 transactions")
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-004: Custom category management
**Description:** As a user, I want to create and edit custom budget categories so I can track spending in ways that match my life.

**Acceptance Criteria:**
- [ ] Create `components/budget/CategoryManager.tsx` — category management UI
- [ ] Accessible from budget setup page or a settings section
- [ ] Create new category: name, icon (picker from Lucide icons), colour (colour picker)
- [ ] Edit existing category: change name, icon, colour
- [ ] Reorder categories via drag-and-drop or up/down buttons
- [ ] Cannot delete system categories (income, uncategorised)
- [ ] Deleting a custom category moves its transactions to 'uncategorised'
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-005: Spending trends component
**Description:** As a user, I want to see how my spending compares month-over-month so I can track whether I'm improving.

**Acceptance Criteria:**
- [ ] Create `components/budget/SpendingTrends.tsx` — month-over-month comparison chart
- [ ] Bar chart or line chart showing total spending per period for the last 3-6 periods
- [ ] Breakdown by category available (stacked bars or individual lines)
- [ ] Savings rate trend line overlay
- [ ] Current period shown as "projected" (dashed/lighter) if not yet complete
- [ ] Responsive — works on both desktop and mobile
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-006: Spending trends API endpoint
**Description:** As a developer, I need an endpoint that returns historical spending data across multiple periods for the trends component.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/trends` endpoint
- [ ] Accepts `periods` query param (default 6 — how many periods to include)
- [ ] Returns array of period summaries: period dates, total spent, total income, savings rate, per-category spending breakdown
- [ ] Ordered oldest to newest
- [ ] Current (incomplete) period included with an `isProjected` flag
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-007: Budget data export
**Description:** As a user, I want to export my budget and transaction data as CSV so I have a backup and can analyse it in a spreadsheet.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/export` endpoint
- [ ] Accepts `type` query param: 'transactions' or 'summary'
- [ ] Transactions export: CSV with columns — date, description, raw_text, amount, status, category, settled_at
- [ ] Summary export: CSV with columns — period_start, period_end, category, budgeted, spent, remaining, percentage_used
- [ ] Accepts optional date range filters (from, to)
- [ ] Returns CSV with appropriate Content-Type and Content-Disposition headers
- [ ] Filename includes date range (e.g. `mjolnir-transactions-2026-01-14-to-2026-02-13.csv`)
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-008: Export button in UI
**Description:** As a user, I want an export button on the transaction list and dashboard so I can download my data easily.

**Acceptance Criteria:**
- [ ] Add export dropdown button to transaction list page: "Export Transactions (CSV)"
- [ ] Add export option to budget dashboard: "Export Budget Summary (CSV)"
- [ ] Export respects current filters (date range, category)
- [ ] Shows loading state while generating
- [ ] Browser downloads the file automatically
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-009: Design token consistency pass
**Description:** As a developer, I need to ensure all budget components use Mjolnir's existing design tokens for consistent styling.

**Acceptance Criteria:**
- [ ] All budget components use CSS custom properties from the existing design system (--background, --foreground, --card, --primary, --muted, etc.)
- [ ] Warning states use the --warning token (amber-500, added in UX-9)
- [ ] Over-budget states use --destructive token
- [ ] Chart hex colours remain as hex (required for SVG rendering — don't convert to CSS variables)
- [ ] Typography uses existing Tailwind classes consistently
- [ ] Border radius, spacing, and shadows match existing dashboard components
- [ ] No custom colours outside the design token system (except chart hex colours)
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-010: Budget navigation integration
**Description:** As a user, I want budget pages accessible from the main navigation so I can easily switch between net worth and budget views.

**Acceptance Criteria:**
- [ ] Add "Budget" section to main navigation/sidebar
- [ ] Sub-links: Dashboard (/budget), Transactions (/budget/transactions), Setup (/budget/setup)
- [ ] Active state highlighting on current page
- [ ] Uncategorised badge shown next to Transactions link (from B-3)
- [ ] Navigation works on both desktop sidebar and mobile hamburger menu
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: All pages must be usable on 320px viewport width (iPhone SE)
- FR-2: Transaction search debounces at 300ms to avoid excessive API calls
- FR-3: CSV exports use RFC 4180 compliant formatting (proper escaping of commas, quotes)
- FR-4: Custom category deletion moves all associated transactions to 'uncategorised'
- FR-5: Spending trends handle periods with no data gracefully (skip or show zero)
- FR-6: Design tokens must be sourced from the existing system — no new tokens created unless absolutely necessary

## Non-Goals

- No JSON export (CSV only for v1)
- No transaction import from CSV (existing import system handles this)
- No custom theme or colour scheme picker
- No push notifications for over-budget alerts
- No email digest of spending summary
- No drag-and-drop transaction categorisation

## Technical Considerations

- CSS media queries for responsive breakpoints (existing Tailwind breakpoints)
- CSV generation on the server side to handle large datasets
- Lucide icon picker can use a searchable grid of available icons
- Spending trends chart should reuse Recharts (already in project) rather than adding another chart library
- Design token audit should reference existing `globals.css` and Tailwind config

## Success Metrics

- Budget pages score 90+ on Lighthouse mobile performance
- All touch targets meet 44x44px minimum
- CSV export works for 10,000+ transactions without timeout
- No visual regressions on existing dashboard pages
- All quality checks pass: `npm run build && npm run lint`

## Open Questions

- Should the spending trends view be a separate page or a section on the dashboard?
- Should CSV export include held (pending) transactions or only settled?
