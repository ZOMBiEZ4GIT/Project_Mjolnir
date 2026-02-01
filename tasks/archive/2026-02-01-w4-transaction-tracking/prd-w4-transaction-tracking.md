# PRD: W-4 Transaction Tracking

## Introduction

Transaction tracking enables logging BUY, SELL, DIVIDEND, and SPLIT events for tradeable assets (stocks, ETFs, crypto). The system calculates current holdings quantity, cost basis, and unrealized gain/loss using FIFO (first-in-first-out) methodology. This is the foundation for accurate portfolio valuation and future tax reporting.

## Goals

- Enable logging of BUY, SELL, DIVIDEND, and SPLIT transactions for tradeable holdings
- Calculate current quantity held per holding based on transaction history
- Calculate cost basis using FIFO methodology
- Display unrealized gain/loss per holding
- Provide both quick-entry modal and full transaction history page
- Prevent sells that exceed current quantity

## User Stories

### US-001: Create transactions database schema
**Description:** As a developer, I need a transactions table to store all trading events.

**Acceptance Criteria:**
- [ ] Create `transactions` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), holding_id (uuid, foreign key), date (date), action (enum: BUY, SELL, DIVIDEND, SPLIT), quantity (decimal), unit_price (decimal), fees (decimal, default 0), currency (enum: AUD, NZD, USD), notes (text, nullable), created_at, updated_at, deleted_at (nullable)
- [ ] For SPLIT action: quantity represents the split ratio (e.g., 2 for 2:1 split)
- [ ] For DIVIDEND: quantity is number of shares, unit_price is dividend per share
- [ ] Add foreign key constraint to holdings table
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create transactions API - GET endpoints
**Description:** As a developer, I need API endpoints to retrieve transactions for display.

**Acceptance Criteria:**
- [ ] Create `app/api/transactions/route.ts` with GET handler
- [ ] GET /api/transactions returns all non-deleted transactions (supports `?holding_id=` filter)
- [ ] Create `app/api/transactions/[id]/route.ts` with GET handler
- [ ] GET /api/transactions/[id] returns single transaction or 404
- [ ] Transactions include holding name/symbol in response (join)
- [ ] Results sorted by date descending (newest first)
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create transactions API - POST endpoint
**Description:** As a developer, I need an API endpoint to create transactions with validation.

**Acceptance Criteria:**
- [ ] Add POST handler to `app/api/transactions/route.ts`
- [ ] Validates required fields: holding_id, date, action, quantity, unit_price, currency
- [ ] Validates holding_id exists and is a tradeable type (stock, etf, crypto)
- [ ] For SELL: validates quantity does not exceed current holdings
- [ ] Returns 201 with created transaction on success
- [ ] Returns 400 with validation errors on invalid input
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create transactions API - PATCH and DELETE endpoints
**Description:** As a developer, I need API endpoints to update and delete transactions.

**Acceptance Criteria:**
- [ ] Add PATCH handler to `app/api/transactions/[id]/route.ts`
- [ ] PATCH validates sell quantity against holdings (excluding current transaction)
- [ ] Returns 200 with updated transaction
- [ ] Add DELETE handler - performs soft delete (sets deleted_at)
- [ ] DELETE shows warning in response if transaction affects cost basis
- [ ] Both return 404 if not found
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create quantity calculation helper
**Description:** As a developer, I need a function to calculate current quantity held for a holding.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/quantity.ts`
- [ ] Function `calculateQuantityHeld(holdingId): Promise<number>`
- [ ] Sums BUY quantities, subtracts SELL quantities
- [ ] Applies SPLIT multipliers chronologically
- [ ] DIVIDEND does not affect quantity
- [ ] Only includes non-deleted transactions
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create FIFO cost basis calculation
**Description:** As a developer, I need FIFO cost basis calculation for unrealized gain/loss.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/cost-basis.ts`
- [ ] Function `calculateCostBasis(holdingId): Promise<{ costBasis: number, quantity: number, lots: Lot[] }>`
- [ ] FIFO: oldest buys are sold first
- [ ] Cost basis = remaining quantity × weighted average cost of remaining lots
- [ ] Lot structure: { date, quantity, unitPrice, remainingQuantity }
- [ ] Handles splits by adjusting lot quantities and prices
- [ ] Only includes non-deleted transactions
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create transactions list page
**Description:** As Roland, I want to see all my transactions in a dedicated page.

**Acceptance Criteria:**
- [ ] Create page at `app/(dashboard)/transactions/page.tsx`
- [ ] Display transactions in a table: Date, Holding, Action, Quantity, Unit Price, Fees, Total
- [ ] Total = (quantity × unit_price) + fees for BUY, - fees for SELL
- [ ] Color-code actions: green for BUY/DIVIDEND, red for SELL, blue for SPLIT
- [ ] Filter by holding (dropdown)
- [ ] Filter by action type (multi-select or tabs)
- [ ] Sorted by date descending
- [ ] Loading and empty states
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-008: Add transaction modal - base structure
**Description:** As Roland, I want to add transactions via a modal for quick entry.

**Acceptance Criteria:**
- [ ] Add "Add Transaction" button to transactions page
- [ ] Add "Add Transaction" button to holding detail/row (opens with holding pre-selected)
- [ ] Modal uses shadcn/ui Dialog
- [ ] Holding selector dropdown (only tradeable types: stock, etf, crypto)
- [ ] Action type selector (BUY, SELL, DIVIDEND, SPLIT)
- [ ] Cancel closes modal
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-009: Add transaction form - BUY/SELL
**Description:** As Roland, I want to log buy and sell transactions with all relevant details.

**Acceptance Criteria:**
- [ ] Form fields: Date (date picker), Quantity, Unit Price, Fees (optional, default 0), Notes (optional)
- [ ] Currency auto-filled from holding's currency (read-only display)
- [ ] Shows calculated total: (quantity × unit_price) ± fees
- [ ] For SELL: shows current quantity held, validates against it
- [ ] For SELL: shows warning if selling all shares
- [ ] Save calls POST /api/transactions
- [ ] Success: closes modal, invalidates queries, shows toast
- [ ] Error: displays validation errors inline
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Add transaction form - DIVIDEND
**Description:** As Roland, I want to log dividend payments received.

**Acceptance Criteria:**
- [ ] When action is DIVIDEND, show fields: Date, Shares Held (quantity), Dividend Per Share (unit_price), Notes
- [ ] Shows calculated total dividend: quantity × unit_price
- [ ] Fees field hidden for dividends
- [ ] Save calls POST /api/transactions
- [ ] Success: closes modal, invalidates queries, shows toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-011: Add transaction form - SPLIT
**Description:** As Roland, I want to log stock splits.

**Acceptance Criteria:**
- [ ] When action is SPLIT, show fields: Date, Split Ratio (e.g., "2" for 2:1), Notes
- [ ] Unit price auto-set to 0, fees auto-set to 0
- [ ] Explains: "A 2:1 split doubles your shares and halves the price"
- [ ] Quantity field represents the multiplier
- [ ] Save calls POST /api/transactions
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-012: Edit transaction modal
**Description:** As Roland, I want to edit transactions to correct mistakes.

**Acceptance Criteria:**
- [ ] Edit button on each transaction row opens modal
- [ ] Modal pre-populated with transaction data
- [ ] Holding and action type are read-only after creation
- [ ] For SELL edits: validates new quantity against holdings
- [ ] Save calls PATCH /api/transactions/[id]
- [ ] Success: closes modal, invalidates queries, shows toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Delete transaction with confirmation
**Description:** As Roland, I want to delete incorrect transactions with appropriate warnings.

**Acceptance Criteria:**
- [ ] Delete button on each transaction row
- [ ] Confirmation dialog shows transaction details
- [ ] Warning message: "Deleting this transaction will affect cost basis calculations"
- [ ] Confirm calls DELETE /api/transactions/[id]
- [ ] Success: closes dialog, invalidates queries, shows toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Display holdings with quantity and cost basis
**Description:** As Roland, I want to see current quantity and cost basis on the holdings list.

**Acceptance Criteria:**
- [ ] Holdings list shows additional columns for tradeable assets: Quantity, Cost Basis, Avg Cost
- [ ] Avg Cost = Cost Basis / Quantity
- [ ] Columns hidden for non-tradeable holdings (super, cash, debt)
- [ ] Values update when transactions change
- [ ] Show "-" or "0" appropriately when no transactions exist
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Transactions navigation
**Description:** As Roland, I want to access the transactions page from navigation.

**Acceptance Criteria:**
- [ ] Add "Transactions" link to dashboard navigation
- [ ] Link navigates to `/transactions` route
- [ ] Current page highlighted in navigation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Transactions table stores: id, holding_id, date, action, quantity, unit_price, fees, currency, notes, timestamps, soft delete
- FR-2: Transaction actions are: BUY, SELL, DIVIDEND, SPLIT
- FR-3: Only tradeable holdings (stock, etf, crypto) can have transactions
- FR-4: SELL transactions cannot exceed current quantity held
- FR-5: Current quantity = sum(BUY) - sum(SELL), adjusted for SPLITs
- FR-6: Cost basis calculated using FIFO (first-in-first-out)
- FR-7: SPLITs multiply quantity and divide unit price of prior lots
- FR-8: DIVIDENDs do not affect quantity or cost basis
- FR-9: Transactions can be edited (with validation) and soft-deleted
- FR-10: Delete warnings indicate impact on cost basis

## Non-Goals

- No realized gain/loss calculation (future epic)
- No tax lot reporting or tax year summaries
- No automatic price fetching for transactions
- No recurring/scheduled transactions
- No short selling (quantity cannot go negative)
- No transaction import (W-11)
- No multi-currency conversion in calculations (W-8)

## Design Considerations

- Reuse shadcn/ui Table, Dialog, Form components
- Color-coded action badges (green=buy, red=sell, blue=split, purple=dividend)
- Transaction totals formatted as currency with proper sign
- Mobile: transaction cards instead of table rows
- Date picker should default to today

## Technical Considerations

- Decimal precision: quantity and unit_price should use decimal(18, 8) for crypto
- FIFO calculation should be memoized or cached for performance
- Transaction validation (sell quantity) requires async check against calculated holdings
- Consider optimistic updates for better UX on transaction creation
- Foreign key to holdings ensures referential integrity

## Success Metrics

- Transactions can be logged in under 30 seconds
- Cost basis calculations are accurate (verified against manual calculations)
- No TypeScript errors, lint passes
- FIFO correctly identifies which lots are sold

## Open Questions

- Should we show unrealized gain/loss on holdings list? (Requires live prices from W-6)
- Should DIVIDEND transactions auto-calculate based on shares held at that date?
- Should we support partial lot sales display (e.g., "Sold 50 of 100 shares from lot dated X")?
