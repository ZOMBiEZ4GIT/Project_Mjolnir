# PRD: W-3 Holdings Management

## Introduction

Holdings are the central registry of everything being tracked in Mjolnir. This epic implements full CRUD (Create, Read, Update, Delete) functionality for holdings, including a list view with grouping by type, modal-based forms for adding/editing, and support for marking holdings as dormant. Holdings span all asset types: stocks, ETFs, crypto, superannuation, cash, and debt.

## Goals

- Enable Roland to add, view, edit, and soft-delete holdings of any type
- Provide a clear overview of all holdings grouped by type with summary statistics
- Support type-specific fields (e.g., symbol/exchange for tradeable assets)
- Allow marking holdings as dormant with filtering to show/hide them
- Establish the data foundation for transactions (W-4) and snapshots (W-5)

## User Stories

### US-001: Create holdings database schema
**Description:** As a developer, I need the holdings table in the database so holdings can be persisted.

**Acceptance Criteria:**
- [ ] Create `holdings` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), type (enum: stock, etf, crypto, super, cash, debt), name, symbol (nullable), currency (enum: AUD, NZD, USD), exchange (nullable), is_dormant (boolean, default false), created_at, updated_at, deleted_at (nullable for soft delete)
- [ ] Generate migration with `npm run db:generate`
- [ ] Migration runs successfully with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)

### US-002: Create holdings API routes
**Description:** As a developer, I need API endpoints for holdings CRUD operations so the frontend can manage holdings.

**Acceptance Criteria:**
- [ ] `GET /api/holdings` - returns all non-deleted holdings (with optional `include_dormant` query param)
- [ ] `GET /api/holdings/[id]` - returns single holding by ID
- [ ] `POST /api/holdings` - creates new holding with validation
- [ ] `PATCH /api/holdings/[id]` - updates existing holding
- [ ] `DELETE /api/holdings/[id]` - soft deletes holding (sets deleted_at)
- [ ] All routes require Clerk authentication
- [ ] Returns appropriate HTTP status codes (200, 201, 400, 401, 404)
- [ ] Typecheck passes

### US-003: Create holdings list page
**Description:** As Roland, I want to see all my holdings in a list so I can understand what I'm tracking.

**Acceptance Criteria:**
- [ ] Create page at `/holdings` route
- [ ] Display holdings in a table format
- [ ] Group holdings by type with section headers (Stocks, ETFs, Crypto, Super, Cash, Debt)
- [ ] Show columns: Name, Symbol (if applicable), Currency, Status (active/dormant)
- [ ] Show count of holdings per type in section header
- [ ] Empty state message when no holdings exist
- [ ] Loading state while fetching
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-004: Add holding modal - base structure
**Description:** As Roland, I want to add new holdings via a modal dialog so I can quickly add assets without leaving the page.

**Acceptance Criteria:**
- [ ] "Add Holding" button on holdings list page opens modal
- [ ] Modal has holding type selector (radio buttons or dropdown)
- [ ] Modal shows different fields based on selected type
- [ ] Cancel button closes modal without saving
- [ ] Modal is accessible (focus trap, escape to close)
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-005: Add holding form - tradeable assets (stock/etf/crypto)
**Description:** As Roland, I want to add stocks, ETFs, and crypto with their specific fields so I can track tradeable assets.

**Acceptance Criteria:**
- [ ] Form fields for tradeable types: Name, Symbol, Currency (dropdown), Exchange (dropdown for stock/etf: ASX, NZX, NYSE, NASDAQ)
- [ ] Symbol field validates format (e.g., requires `.AX` suffix for ASX stocks)
- [ ] Crypto type hides exchange field
- [ ] Save button creates holding via API
- [ ] Success: closes modal, refreshes list, shows success toast
- [ ] Error: displays validation errors inline
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-006: Add holding form - snapshot assets (super/cash/debt)
**Description:** As Roland, I want to add super funds, cash accounts, and debt so I can track snapshot-based holdings.

**Acceptance Criteria:**
- [ ] Form fields for snapshot types: Name, Currency (dropdown)
- [ ] No symbol or exchange fields for these types
- [ ] Super type shows optional "Is Dormant" checkbox (for Kiwisaver etc.)
- [ ] Save button creates holding via API
- [ ] Success: closes modal, refreshes list, shows success toast
- [ ] Error: displays validation errors inline
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-007: Edit holding modal
**Description:** As Roland, I want to edit existing holdings so I can correct mistakes or update names.

**Acceptance Criteria:**
- [ ] Click on holding row or edit button opens edit modal
- [ ] Modal pre-populated with existing holding data
- [ ] Holding type is read-only (cannot change type after creation)
- [ ] Save button updates holding via API
- [ ] Success: closes modal, refreshes list, shows success toast
- [ ] Error: displays validation errors inline
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-008: Delete holding (soft delete)
**Description:** As Roland, I want to delete holdings I no longer need so my list stays clean.

**Acceptance Criteria:**
- [ ] Delete button/icon on each holding row
- [ ] Clicking delete shows confirmation dialog
- [ ] Confirmation dialog warns if holding has transactions/snapshots
- [ ] Confirming soft-deletes the holding (sets deleted_at)
- [ ] Holding disappears from list after deletion
- [ ] Success toast confirms deletion
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-009: Dormant holdings filter
**Description:** As Roland, I want to hide dormant holdings by default but optionally show them so I can focus on active assets.

**Acceptance Criteria:**
- [ ] Toggle/checkbox to "Show dormant holdings" on holdings list
- [ ] Dormant holdings hidden by default
- [ ] When shown, dormant holdings display with visual indicator (muted styling or badge)
- [ ] Filter state persists in URL params
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-010: Mark holding as dormant
**Description:** As Roland, I want to mark holdings as dormant so I can keep them for history without cluttering my active view.

**Acceptance Criteria:**
- [ ] Toggle or menu option to mark holding as dormant/active
- [ ] Available from edit modal or context menu
- [ ] Updates holding via API
- [ ] Holding moves to/from dormant section based on filter
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

### US-011: Holdings list navigation from dashboard
**Description:** As Roland, I want to access the holdings list from the dashboard so I can easily navigate there.

**Acceptance Criteria:**
- [ ] Add "Holdings" link to dashboard navigation/sidebar
- [ ] Link navigates to `/holdings` route
- [ ] Current page highlighted in navigation
- [ ] Typecheck passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Holdings table stores: id, type, name, symbol, currency, exchange, is_dormant, created_at, updated_at, deleted_at
- FR-2: Holding types are: stock, etf, crypto, super, cash, debt
- FR-3: Currencies supported: AUD, NZD, USD
- FR-4: Exchanges supported: ASX, NZX, NYSE, NASDAQ (for stocks/ETFs only)
- FR-5: Symbol is required for stock, etf, crypto; null for super, cash, debt
- FR-6: Symbol format validation: ASX stocks must end with `.AX`, NZX with `.NZ`
- FR-7: Soft delete via deleted_at timestamp; never hard delete
- FR-8: All API routes require authenticated user via Clerk
- FR-9: Holdings list groups by type with count per group
- FR-10: Dormant holdings hidden by default, shown via toggle
- FR-11: Add/Edit forms use modal dialogs with type-specific fields

## Non-Goals

- No transaction tracking (W-4)
- No snapshot/balance entry (W-5)
- No live price display (W-6)
- No net worth calculations (W-7)
- No CSV import (W-11)
- No undo/restore for deleted holdings
- No bulk operations (multi-select delete/edit)

## Design Considerations

- Dark mode only (per project requirements)
- Use shadcn/ui components: Table, Dialog, Button, Input, Select, Toast
- Modal dialogs for add/edit to avoid page navigation
- Muted styling for dormant holdings (lower opacity or gray badge)
- Responsive: table scrolls horizontally on mobile
- Type icons or colored badges to visually distinguish holding types

## Technical Considerations

- Use Drizzle ORM for database operations
- TanStack Query for server state (holdings list, single holding)
- Zod for form validation (shared between client and server)
- API routes in Next.js App Router format (`app/api/holdings/route.ts`)
- Clerk `auth()` helper for route protection
- Consider creating reusable form components for add/edit modal

## Success Metrics

- All holding types can be created, viewed, edited, and soft-deleted
- Holdings list loads in under 1 second
- Form validation prevents invalid data entry
- Dormant filter correctly hides/shows holdings
- No TypeScript errors, lint passes

## Open Questions

- Should we add a "Restore" option for soft-deleted holdings in a future epic?
- Should holdings have notes/description field for additional context?
- Should we enforce unique symbol+exchange combinations to prevent duplicates?
