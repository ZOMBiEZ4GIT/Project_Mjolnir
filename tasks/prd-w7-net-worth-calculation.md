# PRD: W-7 Net Worth Calculation

## Introduction

Net worth is the hero metric of Mjolnir: **Net Worth = Total Assets - Total Liabilities**. This epic implements the calculation engine and dashboard display, including breakdown cards by asset type, percentage allocations, historical tracking with charts, and top performer highlights. The system uses carry-forward for missing data while clearly indicating staleness.

## Goals

- Calculate accurate net worth from all holdings (tradeable + snapshot-based)
- Display hero net worth card with change from last month
- Show breakdown by asset type with percentage allocation
- Display historical net worth chart (last 12 months)
- Highlight top gainers and losers
- Use carry-forward for missing data with clear stale indicators
- Cache calculations with smart invalidation

## User Stories

### US-001: Create net worth calculation service
**Description:** As a developer, I need a service to calculate total net worth from all holdings.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/net-worth.ts`
- [ ] Function `calculateNetWorth(): Promise<NetWorthResult>`
- [ ] Tradeable assets: sum of (quantity × current price) for stocks, ETFs, crypto
- [ ] Snapshot assets: sum of latest snapshot balances for super, cash
- [ ] Debt: sum of latest snapshot balances for debt holdings
- [ ] Net Worth = Total Assets - Total Debt
- [ ] Returns: { netWorth, totalAssets, totalDebt, breakdown, calculatedAt }
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create asset breakdown calculation
**Description:** As a developer, I need to calculate asset values grouped by type.

**Acceptance Criteria:**
- [ ] Add to `lib/calculations/net-worth.ts`
- [ ] Function `calculateAssetBreakdown(): Promise<AssetBreakdown>`
- [ ] Groups by type: stocks, etfs, crypto, super, cash, debt
- [ ] Each group: { type, totalValue, count, percentage, holdings[] }
- [ ] Percentage = (group value / total assets) × 100
- [ ] Holdings include: name, value, percentage of group
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create carry-forward logic for missing data
**Description:** As a developer, I need to handle missing prices/snapshots gracefully.

**Acceptance Criteria:**
- [ ] Add to `lib/calculations/net-worth.ts`
- [ ] For tradeable: use cached price even if stale, flag as stale
- [ ] For snapshots: use most recent snapshot, flag if older than 2 months
- [ ] Track stale holdings: { holdingId, name, type, lastUpdated, reason }
- [ ] NetWorthResult includes: { staleHoldings: StaleHolding[], hasStaleData: boolean }
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create historical net worth calculation
**Description:** As a developer, I need to calculate net worth at past points in time.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/net-worth-history.ts`
- [ ] Function `calculateHistoricalNetWorth(months: number): Promise<HistoryPoint[]>`
- [ ] HistoryPoint: { date, netWorth, totalAssets, totalDebt }
- [ ] Uses snapshots for that month (carry-forward if missing)
- [ ] For tradeable: uses quantity at month-end × price at month-end (if available) or current price
- [ ] Returns last N months of data points
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create net worth cache service
**Description:** As a developer, I need to cache net worth calculations for performance.

**Acceptance Criteria:**
- [ ] Create `lib/services/net-worth-cache.ts`
- [ ] Function `getCachedNetWorth(): Promise<NetWorthResult | null>`
- [ ] Function `setCachedNetWorth(result): Promise<void>`
- [ ] Function `invalidateNetWorthCache(): Promise<void>`
- [ ] Cache stored in database or memory (consider redis for production)
- [ ] TTL: 5 minutes (recalculate if older)
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create cache invalidation triggers
**Description:** As a developer, I need to invalidate cache when underlying data changes.

**Acceptance Criteria:**
- [ ] Invalidate on: transaction created/updated/deleted
- [ ] Invalidate on: snapshot created/updated/deleted
- [ ] Invalidate on: holding created/updated/deleted
- [ ] Invalidate on: prices refreshed
- [ ] Add invalidation calls to relevant API routes
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create net worth API endpoint
**Description:** As a developer, I need an API endpoint to get current net worth.

**Acceptance Criteria:**
- [ ] Create `app/api/net-worth/route.ts` with GET handler
- [ ] Returns cached result if valid, otherwise recalculates
- [ ] Response: { netWorth, totalAssets, totalDebt, breakdown, staleHoldings, calculatedAt }
- [ ] Supports `?refresh=true` to force recalculation
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create net worth history API endpoint
**Description:** As a developer, I need an API endpoint to get historical net worth.

**Acceptance Criteria:**
- [ ] Create `app/api/net-worth/history/route.ts` with GET handler
- [ ] Supports `?months=12` query param (default 12)
- [ ] Returns array of monthly data points
- [ ] Response: { history: HistoryPoint[], generatedAt }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Create top performers calculation
**Description:** As a developer, I need to identify top gainers and losers.

**Acceptance Criteria:**
- [ ] Create `lib/calculations/performers.ts`
- [ ] Function `getTopPerformers(limit: number): Promise<{ gainers: Performer[], losers: Performer[] }>`
- [ ] Performer: { holdingId, name, symbol, gainLoss, gainLossPercent, type }
- [ ] Based on unrealized gain/loss for tradeable holdings
- [ ] Sorted by absolute gain/loss or percentage (configurable)
- [ ] Returns top N gainers and top N losers
- [ ] Typecheck passes
- [ ] Lint passes

### US-010: Create top performers API endpoint
**Description:** As a developer, I need an API endpoint to get top performers.

**Acceptance Criteria:**
- [ ] Create `app/api/net-worth/performers/route.ts` with GET handler
- [ ] Supports `?limit=5` query param (default 5)
- [ ] Returns: { gainers: Performer[], losers: Performer[] }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Dashboard hero net worth card
**Description:** As Roland, I want to see my net worth prominently on the dashboard.

**Acceptance Criteria:**
- [ ] Large hero card at top of dashboard
- [ ] Displays net worth in AUD (formatted: $1,234,567.89)
- [ ] Shows change from last month: +$12,345 (+2.5%) in green or red
- [ ] Shows "as of [time]" timestamp
- [ ] Stale data warning icon if hasStaleData is true
- [ ] Loading skeleton while fetching
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-012: Dashboard total assets and debt cards
**Description:** As Roland, I want to see total assets and debt alongside net worth.

**Acceptance Criteria:**
- [ ] Two smaller cards below hero: "Total Assets" and "Total Debt"
- [ ] Each shows value in AUD
- [ ] Each shows change from last month
- [ ] Consistent styling with hero card
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Dashboard asset allocation cards
**Description:** As Roland, I want to see my asset allocation by type.

**Acceptance Criteria:**
- [ ] Card/section showing breakdown by type
- [ ] Each type: icon, name, value, percentage of total
- [ ] Types: Stocks, ETFs, Crypto, Super, Cash (Debt shown separately)
- [ ] Visual indicator (progress bar or pie segment) for percentage
- [ ] Sorted by value descending
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Dashboard net worth history chart
**Description:** As Roland, I want to see how my net worth has changed over time.

**Acceptance Criteria:**
- [ ] Line chart showing net worth over last 12 months
- [ ] X-axis: months (Jan, Feb, etc.)
- [ ] Y-axis: net worth value (auto-scaled)
- [ ] Hover shows exact value for that month
- [ ] Uses Tremor or Recharts
- [ ] Handles missing months gracefully (gaps or interpolation)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Dashboard top performers section
**Description:** As Roland, I want to see my best and worst performing holdings.

**Acceptance Criteria:**
- [ ] Section showing "Top Gainers" and "Top Losers" (5 each)
- [ ] Each shows: name/symbol, gain/loss amount, percentage
- [ ] Gainers in green, losers in red
- [ ] Click navigates to holding detail
- [ ] Empty state if no tradeable holdings
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Stale data indicator and breakdown
**Description:** As Roland, I want to know which holdings have stale data affecting my net worth.

**Acceptance Criteria:**
- [ ] Warning banner on dashboard if hasStaleData is true
- [ ] Expandable to show list of stale holdings
- [ ] Each shows: name, type, last updated, reason (e.g., "Price 2 days old", "No snapshot for March")
- [ ] Link to holding or action to refresh
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Dashboard refresh functionality
**Description:** As Roland, I want to refresh all data to get the latest net worth.

**Acceptance Criteria:**
- [ ] "Refresh" button on dashboard header
- [ ] Refreshes: prices, then recalculates net worth
- [ ] Shows loading state during refresh
- [ ] Updates all cards and charts on completion
- [ ] Shows success/error toast
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Update dashboard home page
**Description:** As a developer, I need to replace placeholder dashboard with real content.

**Acceptance Criteria:**
- [ ] Update `app/(dashboard)/dashboard/page.tsx`
- [ ] Remove placeholder "Net worth tracking coming soon" text
- [ ] Integrate all dashboard components: hero card, breakdowns, chart, performers
- [ ] Responsive layout: cards stack on mobile
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Net Worth = Total Assets - Total Debt
- FR-2: Total Assets = Tradeable (qty × price) + Super (latest snapshot) + Cash (latest snapshot)
- FR-3: Total Debt = Debt holdings (latest snapshot balances)
- FR-4: Asset breakdown by type with percentage allocation
- FR-5: Historical net worth calculated monthly for last 12 months
- FR-6: Carry-forward used for missing snapshots/prices with stale indicator
- FR-7: Cache invalidated on any data change affecting calculations
- FR-8: Top 5 gainers and losers based on unrealized gain/loss
- FR-9: All monetary values displayed in AUD (conversion in W-8)
- FR-10: Dashboard shows change from previous month

## Non-Goals

- No goal setting or target net worth
- No projections or forecasting
- No comparison to benchmarks (e.g., index funds)
- No detailed attribution analysis (why net worth changed)
- No PDF/image export of dashboard
- No multi-currency breakdown (W-8)

## Design Considerations

- Hero card should be visually prominent (larger font, centered)
- Use consistent green/red for positive/negative changes
- Charts should be readable on mobile (consider horizontal scroll)
- Stale data warning should be noticeable but not alarming
- Consider dark mode chart colors (avoid pure black backgrounds)

## Technical Considerations

- Net worth calculation can be expensive - cache aggressively
- Historical calculation may need optimization for large transaction history
- Consider database views or materialized queries for performance
- TanStack Query for client-side caching and refetching
- Invalidation should be surgical (don't refetch everything)

## Success Metrics

- Dashboard loads in under 2 seconds
- Net worth calculation accurate to the cent
- Historical data matches sum of individual holdings
- Cache hit rate >90% during normal browsing
- No TypeScript errors, lint passes

## Open Questions

- Should we store historical net worth snapshots for faster history queries?
- Should we show net worth in multiple currencies on dashboard?
- Should we add a "simulate" feature to see impact of hypothetical changes?
