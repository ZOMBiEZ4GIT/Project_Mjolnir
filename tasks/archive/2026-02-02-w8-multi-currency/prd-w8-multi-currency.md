# PRD: W-8 Multi-Currency Support

## Introduction

Multi-currency support enables accurate tracking of holdings denominated in AUD, NZD, and USD. All values are stored in their native currency and converted at display time using current exchange rates. Users can toggle their preferred display currency and view values in either native or converted form. The dashboard includes a currency breakdown showing exposure by currency.

## Goals

- Store all values in native currency (no conversion on storage)
- Convert to display currency at display time using cached exchange rates
- Allow user to configure and toggle preferred display currency
- Show native currency with converted equivalent where helpful
- Provide currency breakdown on dashboard showing exposure
- Filter and group holdings by currency
- Design for future historical FX rate tracking

## User Stories

### US-001: Create user preferences schema
**Description:** As a developer, I need to store user display preferences including currency.

**Acceptance Criteria:**
- [ ] Create `user_preferences` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), user_id (text, from Clerk), display_currency (enum: AUD, NZD, USD, default AUD), created_at, updated_at
- [ ] Add unique constraint on user_id
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create user preferences API endpoints
**Description:** As a developer, I need API endpoints to get and update user preferences.

**Acceptance Criteria:**
- [ ] Create `app/api/preferences/route.ts` with GET and PATCH handlers
- [ ] GET returns current user preferences (creates default if none exist)
- [ ] PATCH updates display_currency
- [ ] Returns: { displayCurrency, updatedAt }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create currency conversion utility
**Description:** As a developer, I need a utility to convert between currencies.

**Acceptance Criteria:**
- [ ] Create `lib/utils/currency.ts`
- [ ] Function `convertCurrency(amount, from, to, rates): number`
- [ ] Handles AUD↔NZD, AUD↔USD, NZD↔USD conversions
- [ ] Returns original amount if from === to
- [ ] Uses rates object: { 'USD/AUD': 1.53, 'NZD/AUD': 0.92, ... }
- [ ] Rounds to 2 decimal places for display
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create currency formatting utility
**Description:** As a developer, I need consistent currency formatting across the app.

**Acceptance Criteria:**
- [ ] Add to `lib/utils/currency.ts`
- [ ] Function `formatCurrency(amount, currency, options?): string`
- [ ] Options: { showCode: boolean, showSymbol: boolean, compact: boolean }
- [ ] Default: symbol with code on hover (handled by component)
- [ ] Symbols: $ for AUD, NZ$ for NZD, US$ for USD
- [ ] Handles negative numbers: -$1,234.56
- [ ] Compact mode: $1.2M, $500K
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create CurrencyDisplay component
**Description:** As a developer, I need a reusable component for displaying currency values.

**Acceptance Criteria:**
- [ ] Create `components/ui/currency-display.tsx`
- [ ] Props: amount, currency, showNative?, nativeCurrency?, nativeAmount?
- [ ] Shows formatted amount in display currency
- [ ] Hover/tooltip shows ISO code
- [ ] If showNative and currencies differ: shows "(NZ$1,234 native)"
- [ ] Handles loading state (skeleton)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-006: Create currency context provider
**Description:** As a developer, I need a context to provide display currency and rates throughout the app.

**Acceptance Criteria:**
- [ ] Create `components/providers/currency-provider.tsx`
- [ ] Provides: displayCurrency, setDisplayCurrency, rates, isLoading
- [ ] Fetches user preference on mount
- [ ] Fetches exchange rates on mount
- [ ] Function `convert(amount, fromCurrency): number` using current rates
- [ ] Wrap app in CurrencyProvider
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create currency selector component
**Description:** As Roland, I want to switch my display currency easily.

**Acceptance Criteria:**
- [ ] Create `components/ui/currency-selector.tsx`
- [ ] Dropdown/toggle showing current display currency
- [ ] Options: AUD, NZD, USD with flags or symbols
- [ ] Selecting updates user preference via API
- [ ] Updates context immediately (optimistic update)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-008: Add currency selector to dashboard header
**Description:** As Roland, I want to toggle display currency from the dashboard.

**Acceptance Criteria:**
- [ ] Add CurrencySelector to dashboard header/toolbar
- [ ] Position: near refresh button or user menu
- [ ] Changing currency updates all displayed values immediately
- [ ] Persists preference across sessions
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-009: Update holdings list with currency conversion
**Description:** As Roland, I want to see holding values in my display currency.

**Acceptance Criteria:**
- [ ] Holdings list uses CurrencyDisplay component
- [ ] Market value shown in display currency
- [ ] Shows native currency indicator if different from display
- [ ] Cost basis and gain/loss converted to display currency
- [ ] Hover shows native currency value
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Update net worth calculations with currency conversion
**Description:** As a developer, I need net worth calculations to respect display currency.

**Acceptance Criteria:**
- [ ] Update `lib/calculations/net-worth.ts`
- [ ] Function accepts optional displayCurrency parameter
- [ ] Converts all values to display currency before summing
- [ ] Breakdown values also in display currency
- [ ] Returns rates used for conversion (for transparency)
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Update dashboard with currency conversion
**Description:** As Roland, I want dashboard values in my selected display currency.

**Acceptance Criteria:**
- [ ] Hero net worth card shows value in display currency
- [ ] Total assets/debt in display currency
- [ ] Asset allocation values in display currency
- [ ] Chart values in display currency
- [ ] All use CurrencyDisplay component
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-012: Add native currency toggle option
**Description:** As Roland, I want to optionally see values in their native currency.

**Acceptance Criteria:**
- [ ] Toggle/checkbox: "Show native currencies"
- [ ] When enabled: shows values in native currency (not converted)
- [ ] Market value, cost basis, gain/loss in native
- [ ] Totals still aggregate in display currency
- [ ] Toggle state stored in user preferences
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Currency filter on holdings list
**Description:** As Roland, I want to filter holdings by currency.

**Acceptance Criteria:**
- [ ] Add currency filter dropdown to holdings list
- [ ] Options: All, AUD, NZD, USD
- [ ] Filters holdings to show only selected currency
- [ ] Filter state persists in URL params
- [ ] Works with existing type and dormant filters
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Currency grouping option on holdings list
**Description:** As Roland, I want to group holdings by currency.

**Acceptance Criteria:**
- [ ] Add "Group by" option: Type (default) or Currency
- [ ] When grouped by currency: sections for AUD, NZD, USD
- [ ] Each section shows subtotal in that currency
- [ ] Section headers show count and subtotal
- [ ] Toggle state persists in URL params
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Dashboard currency exposure breakdown
**Description:** As Roland, I want to see my currency exposure on the dashboard.

**Acceptance Criteria:**
- [ ] Add "Currency Exposure" card/section to dashboard
- [ ] Shows total value held in each currency (in display currency)
- [ ] Shows percentage allocation per currency
- [ ] Visual indicator (pie chart or bars)
- [ ] Includes all asset types
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Update transactions display with currency
**Description:** As Roland, I want transaction values to show currency clearly.

**Acceptance Criteria:**
- [ ] Transactions list shows currency for each transaction
- [ ] Uses CurrencyDisplay component
- [ ] Filter by currency option
- [ ] Total row shows aggregates (converted if mixed currencies)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Update snapshots display with currency
**Description:** As Roland, I want snapshot values to show currency clearly.

**Acceptance Criteria:**
- [ ] Snapshots list shows currency for each snapshot
- [ ] Uses CurrencyDisplay component
- [ ] Check-in modal shows currency per holding
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: FX rate display on dashboard
**Description:** As Roland, I want to see current exchange rates.

**Acceptance Criteria:**
- [ ] Small section/tooltip showing current rates
- [ ] Shows: USD/AUD, NZD/AUD rates
- [ ] Shows "as of [time]" indicator
- [ ] Accessible from currency selector or dashboard
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Design for historical FX rates (no implementation)
**Description:** As a developer, I need schema design to support future historical rates.

**Acceptance Criteria:**
- [ ] Document proposed schema in `docs/future-historical-fx.md`
- [ ] Schema: exchange_rate_history (from, to, rate, date, fetched_at)
- [ ] Explain how calculations would change to use historical rates
- [ ] No implementation in this epic
- [ ] Typecheck passes
- [ ] Lint passes

## Functional Requirements

- FR-1: All monetary values stored in native currency (no conversion on storage)
- FR-2: Conversion happens at display time using current exchange rates
- FR-3: User can select display currency: AUD, NZD, USD (default AUD)
- FR-4: Display currency preference persists across sessions
- FR-5: CurrencyDisplay shows symbol with ISO code on hover
- FR-6: Native currency shown alongside converted value where helpful
- FR-7: Holdings filterable and groupable by currency
- FR-8: Dashboard shows currency exposure breakdown
- FR-9: Exchange rates from W-6 used for conversion (1-hour cache)
- FR-10: Net worth and all aggregates calculated in display currency

## Non-Goals

- No historical exchange rate tracking (design only)
- No currency conversion on data entry (always native)
- No support for currencies beyond AUD, NZD, USD
- No automatic currency detection from symbol
- No currency hedging or FX gain/loss calculations

## Design Considerations

- Currency symbols: $ (AUD), NZ$ (NZD), US$ (USD)
- Consistent placement: symbol before amount, code after
- Hover states for additional currency info
- Color coding not needed for currencies (avoid confusion with gain/loss)
- Mobile: consider space constraints for dual currency display

## Technical Considerations

- CurrencyProvider should be high in component tree (below ClerkProvider)
- Memoize conversion calculations to avoid repeated computation
- Consider number precision (use decimal, not float)
- Exchange rate updates should trigger recalculation
- Test edge cases: 0 amounts, negative amounts, very large amounts

## Success Metrics

- All values display correctly in selected currency
- Currency switching is instant (no page reload)
- Conversion accurate to 2 decimal places
- No TypeScript errors, lint passes

## Open Questions

- Should we support additional currencies in the future (GBP, EUR)?
- Should we show FX gain/loss on holdings bought in foreign currency?
- Should historical net worth use historical rates when available?
