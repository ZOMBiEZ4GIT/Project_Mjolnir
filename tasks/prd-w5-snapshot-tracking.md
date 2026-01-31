# PRD: W-5 Snapshot Tracking & Monthly Check-in Modal

## Introduction

Snapshot tracking enables point-in-time balance recording for non-tradeable assets: superannuation, cash, and debt. Unlike tradeable assets that calculate value from transactions, these holdings require manual balance entry. The monthly check-in modal provides a streamlined interface to update all snapshot-based holdings at once, with optional super contribution tracking to separate investment returns from contributions.

## Goals

- Enable balance snapshots for super, cash, and debt holdings
- Provide a monthly check-in modal triggered from dashboard prompt
- Collect super contributions (employer/employee) to calculate investment returns
- Enforce one snapshot per holding per month (no duplicates)
- Display snapshot history with charts showing balance over time
- Support backdating for current and previous month only

## User Stories

### US-001: Create snapshots database schema
**Description:** As a developer, I need a snapshots table to store point-in-time balances.

**Acceptance Criteria:**
- [ ] Create `snapshots` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), holding_id (uuid, foreign key), date (date), balance (decimal), currency (enum: AUD, NZD, USD), notes (text, nullable), created_at, updated_at, deleted_at (nullable)
- [ ] Add unique constraint on (holding_id, date) to prevent duplicates
- [ ] Date should be stored as first of month (e.g., 2024-03-01 for March 2024)
- [ ] Add foreign key constraint to holdings table
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create contributions database schema
**Description:** As a developer, I need a contributions table to track super contributions separately.

**Acceptance Criteria:**
- [ ] Create `contributions` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), holding_id (uuid, foreign key), date (date), employer_contribution (decimal), employee_contribution (decimal), notes (text, nullable), created_at, updated_at, deleted_at (nullable)
- [ ] Add unique constraint on (holding_id, date)
- [ ] Date stored as first of month
- [ ] Add foreign key constraint to holdings table
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create snapshots API - GET endpoints
**Description:** As a developer, I need API endpoints to retrieve snapshots.

**Acceptance Criteria:**
- [ ] Create `app/api/snapshots/route.ts` with GET handler
- [ ] GET /api/snapshots returns all non-deleted snapshots (supports `?holding_id=` filter)
- [ ] Create `app/api/snapshots/[id]/route.ts` with GET handler
- [ ] GET /api/snapshots/[id] returns single snapshot or 404
- [ ] Results include holding name in response
- [ ] Results sorted by date descending
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create snapshots API - POST endpoint
**Description:** As a developer, I need an API endpoint to create snapshots with duplicate prevention.

**Acceptance Criteria:**
- [ ] Add POST handler to `app/api/snapshots/route.ts`
- [ ] Validates required fields: holding_id, date, balance, currency
- [ ] Validates holding_id exists and is snapshot type (super, cash, debt)
- [ ] Validates date is current or previous month only
- [ ] Returns 409 Conflict if snapshot exists for same holding/month
- [ ] Returns 201 with created snapshot on success
- [ ] Returns 400 with validation errors on invalid input
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create snapshots API - PATCH and DELETE endpoints
**Description:** As a developer, I need API endpoints to update and delete snapshots.

**Acceptance Criteria:**
- [ ] Add PATCH handler to `app/api/snapshots/[id]/route.ts`
- [ ] PATCH updates balance, notes only (date is immutable)
- [ ] Returns 200 with updated snapshot
- [ ] Add DELETE handler - performs soft delete
- [ ] Both return 404 if not found
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create contributions API endpoints
**Description:** As a developer, I need API endpoints for super contributions CRUD.

**Acceptance Criteria:**
- [ ] Create `app/api/contributions/route.ts` with GET and POST handlers
- [ ] GET supports `?holding_id=` filter, returns with holding name
- [ ] POST validates holding is super type
- [ ] POST returns 409 if contribution exists for same holding/month
- [ ] Create `app/api/contributions/[id]/route.ts` with GET, PATCH, DELETE
- [ ] All routes require Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create latest snapshot helper
**Description:** As a developer, I need a function to get the latest snapshot for each holding.

**Acceptance Criteria:**
- [ ] Create `lib/queries/snapshots.ts`
- [ ] Function `getLatestSnapshots(): Promise<Map<holdingId, Snapshot>>`
- [ ] Function `getLatestSnapshotForHolding(holdingId): Promise<Snapshot | null>`
- [ ] Returns most recent non-deleted snapshot per holding
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create investment returns calculation
**Description:** As a developer, I need to calculate investment returns for super funds.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/super-returns.ts`
- [ ] Function `calculateInvestmentReturns(holdingId, fromDate, toDate): Promise<number>`
- [ ] Returns = (new_balance - old_balance) - employer_contrib - employee_contrib
- [ ] Handles missing contributions (treats as 0)
- [ ] Handles missing previous snapshot (returns null or first-snapshot indicator)
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Dashboard check-in prompt card
**Description:** As Roland, I want to see a prompt on the dashboard when it's time for monthly check-in.

**Acceptance Criteria:**
- [ ] Add "Monthly Check-in" card to dashboard
- [ ] Shows if current month has missing snapshots for any active snapshot holdings
- [ ] Displays: "You have X holdings to update for [Month Year]"
- [ ] "Start Check-in" button opens the check-in modal
- [ ] Card hidden if all holdings have current month snapshots
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Monthly check-in modal - base structure
**Description:** As Roland, I want a modal that guides me through updating all snapshot holdings.

**Acceptance Criteria:**
- [ ] Modal opens from dashboard prompt card
- [ ] Month selector: current month (default) or previous month only
- [ ] Shows list of all snapshot holdings needing updates for selected month
- [ ] Holdings grouped by type: Super, Cash, Debt
- [ ] Skip button to close without saving
- [ ] Shows progress: "2 of 5 holdings updated"
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-011: Check-in modal - super holdings entry
**Description:** As Roland, I want to enter super balances with optional contribution breakdown.

**Acceptance Criteria:**
- [ ] For each super holding, show: Name, Balance input (required)
- [ ] Expandable "Add Contributions" section (collapsed by default)
- [ ] When expanded: Employer Contribution, Employee Contribution inputs
- [ ] For dormant super (is_dormant=true): no contributions section
- [ ] Pre-fill currency from holding
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-012: Check-in modal - cash and debt entry
**Description:** As Roland, I want to enter cash and debt balances.

**Acceptance Criteria:**
- [ ] For each cash holding: Name, Balance input
- [ ] For each debt holding: Name, Balance input (displayed as positive, stored as positive)
- [ ] Debt section header explains: "Enter as positive number (e.g., 5000 for $5,000 owed)"
- [ ] Pre-fill currency from holding
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Check-in modal - save and complete
**Description:** As Roland, I want to save all check-in entries at once.

**Acceptance Criteria:**
- [ ] "Save All" button at bottom of modal
- [ ] Creates snapshot for each holding with entered balance
- [ ] Creates contribution record for super holdings where provided
- [ ] Shows validation errors inline if any balance missing
- [ ] On success: closes modal, shows success toast with count
- [ ] Invalidates relevant queries (holdings, snapshots)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Snapshots list page
**Description:** As Roland, I want to see all my snapshots in a dedicated history page.

**Acceptance Criteria:**
- [ ] Create page at `app/(dashboard)/snapshots/page.tsx`
- [ ] Table columns: Date (Month Year), Holding, Type, Balance, Currency
- [ ] Filter by holding (dropdown)
- [ ] Filter by type (super/cash/debt)
- [ ] Sorted by date descending
- [ ] For super: show contributions in expandable row or tooltip
- [ ] Edit and delete buttons per row
- [ ] Loading and empty states
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Edit snapshot modal
**Description:** As Roland, I want to edit snapshots to correct mistakes.

**Acceptance Criteria:**
- [ ] Edit button on snapshot row opens modal
- [ ] Shows holding name and date (read-only)
- [ ] Editable: balance, notes
- [ ] For super: editable contributions if exists, or "Add Contributions" option
- [ ] Save calls PATCH /api/snapshots/[id]
- [ ] Success: closes modal, invalidates queries, shows toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Delete snapshot with confirmation
**Description:** As Roland, I want to delete incorrect snapshots.

**Acceptance Criteria:**
- [ ] Delete button on snapshot row
- [ ] Confirmation dialog shows snapshot details
- [ ] Confirm soft-deletes the snapshot
- [ ] Also deletes associated contribution if exists
- [ ] Success: closes dialog, invalidates queries, shows toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Balance history chart on holding detail
**Description:** As Roland, I want to see a chart of balance over time for each holding.

**Acceptance Criteria:**
- [ ] Add chart section to holding detail view (or expandable on list)
- [ ] Line chart showing balance over time (x: month, y: balance)
- [ ] For super: optional toggle to show contributions as stacked bars
- [ ] Uses Tremor or Recharts component
- [ ] Shows last 12 months of data (or all if less)
- [ ] Handles missing months gracefully (gaps in line)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Display holdings with latest balance
**Description:** As Roland, I want to see the latest balance on the holdings list for snapshot holdings.

**Acceptance Criteria:**
- [ ] Holdings list shows "Balance" column for super, cash, debt types
- [ ] Displays latest snapshot balance
- [ ] Shows "as of [Month Year]" indicator
- [ ] Shows "No data" if no snapshots exist
- [ ] Stale indicator if latest snapshot is older than 2 months
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Snapshots navigation
**Description:** As Roland, I want to access the snapshots page from navigation.

**Acceptance Criteria:**
- [ ] Add "Snapshots" link to dashboard navigation
- [ ] Link navigates to `/snapshots` route
- [ ] Current page highlighted in navigation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Snapshots table stores: id, holding_id, date, balance, currency, notes, timestamps, soft delete
- FR-2: Contributions table stores: id, holding_id, date, employer_contribution, employee_contribution, timestamps, soft delete
- FR-3: Only snapshot holdings (super, cash, debt) can have snapshots
- FR-4: One snapshot per holding per month (unique constraint)
- FR-5: One contribution per holding per month (unique constraint)
- FR-6: Date is stored as first of month (normalized)
- FR-7: Only current and previous month can be selected for new snapshots
- FR-8: Investment returns = balance_change - total_contributions
- FR-9: Dormant super holdings don't show contribution fields
- FR-10: Check-in modal shows holdings grouped by type
- FR-11: Stale data indicator for snapshots older than 2 months

## Non-Goals

- No automatic data fetching from super funds
- No recurring scheduled snapshots
- No email reminders for check-in (W-10)
- No multiple snapshots per month (duplicates blocked)
- No historical contribution editing for old months
- No projected/estimated balances

## Design Considerations

- Check-in modal should feel like a form wizard, not overwhelming
- Contributions section collapsed by default (most months won't change)
- Debt displayed as positive numbers for UX (negative in calculations)
- Balance charts use consistent colors across holding types
- Mobile: check-in modal as full-screen on small devices

## Technical Considerations

- Date normalization: always store as first of month (YYYY-MM-01)
- Unique constraints handle duplicate prevention at DB level
- API returns 409 Conflict for clearer error handling on duplicates
- Consider batch insert for check-in modal (single transaction)
- Chart component should handle sparse data (missing months)

## Success Metrics

- Monthly check-in completes in under 2 minutes
- All snapshot holdings have current month data
- Super investment returns calculation matches manual verification
- No TypeScript errors, lint passes

## Open Questions

- Should we support importing super statements (PDF/CSV) in a future epic?
- Should the check-in modal pre-fill previous month's balance as starting point?
- Should we track super insurance premiums separately from contributions?
