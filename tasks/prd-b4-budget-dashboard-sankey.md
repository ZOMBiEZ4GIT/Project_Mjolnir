# PRD: Budget Dashboard & Sankey (Epic B-4)

## Introduction

Build the main budget dashboard — the centrepiece of Phase 3. This combines budget vs actual tracking, an interactive Sankey flow diagram showing income → spending → savings, category progress cards, a payday countdown, and savings indicators. Desktop gets the full Sankey; mobile gets a simplified horizontal bar chart.

## Goals

- Calculate and display budget vs actual spending per category
- Render an interactive Sankey diagram showing money flow (desktop)
- Provide a mobile-friendly horizontal bar chart fallback
- Show per-category progress with visual indicators for over-budget
- Display days until payday countdown
- Show current savings rate and projection
- Allow drilling down from categories to individual transactions
- Support switching between budget periods

## User Stories

### US-001: Budget summary calculation engine
**Description:** As a developer, I need a calculation engine that computes budget vs actual for a given period so all dashboard components have accurate data.

**Acceptance Criteria:**
- [ ] Create `lib/budget/summary.ts` with a `calculateBudgetSummary(periodId)` function
- [ ] Returns: period dates, income (expected vs actual), per-category breakdown (budgeted, spent, remaining, percentUsed, status), totals (budgeted, spent, unallocated, savings, savingsRate), daysRemaining, daysElapsed
- [ ] Income actual = sum of transactions where mjolnir_category_id = 'income' within the period date range
- [ ] Category spent = sum of absolute value of debit transactions (amount_cents < 0) for each category within period
- [ ] Status per category: 'under' (<80% used), 'warning' (80-100%), 'over' (>100%)
- [ ] Excludes internal transfers and soft-deleted transactions
- [ ] Held transactions included but flagged separately (not in main spent total)
- [ ] `npm run build && npm run lint` passes

### US-002: Budget summary API endpoint
**Description:** As a developer, I need an API endpoint that returns the budget summary so the dashboard can fetch it.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/summary` endpoint
- [ ] Accepts optional `period_id` query param — if omitted, uses the current period (based on today's date and payday config)
- [ ] Returns the full BudgetSummary object from the calculation engine
- [ ] If no budget period exists for the current dates, returns a helpful error suggesting setup
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-003: Budget dashboard page layout
**Description:** As a user, I want a budget dashboard page that gives me a complete picture of my spending vs plan at a glance.

**Acceptance Criteria:**
- [ ] Create `/app/budget/page.tsx` — main budget dashboard
- [ ] Layout: period selector at top, Sankey chart (or mobile bars) as hero, category cards below, payday countdown and savings indicator in sidebar/header
- [ ] Fetches budget summary data via TanStack Query
- [ ] Loading skeleton while data loads
- [ ] Empty state with link to budget setup if no period exists
- [ ] Dark mode styling consistent with Mjolnir
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-004: Sankey chart component (desktop)
**Description:** As a user, I want an interactive Sankey flow diagram showing how my income flows into spending categories and savings so I can visualise my budget at a glance.

**Acceptance Criteria:**
- [ ] Create `components/budget/SankeyChart.tsx` using visx (@visx/sankey, @visx/group, d3-sankey)
- [ ] Left node: Income (purple #8b5cf6) showing actual income amount
- [ ] Middle nodes: Each spending category with its colour, showing amount spent
- [ ] Right node: Savings (green #22c55e if positive, red #ef4444 if negative)
- [ ] Flow widths proportional to amounts
- [ ] Over-budget category flows tinted red
- [ ] Hover on flow: tooltip showing amount and percentage of income
- [ ] Hover on node: highlight all connected flows
- [ ] Click on category flow: navigate to transaction list filtered by that category
- [ ] Responsive width (fills container), fixed aspect ratio
- [ ] Labels on nodes showing name and amount
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-005: Mobile budget chart (fallback)
**Description:** As a user on mobile, I want a simplified budget visualisation since Sankey is too complex for small screens.

**Acceptance Criteria:**
- [ ] Create `components/budget/MobileBudgetChart.tsx` — horizontal stacked/progress bars
- [ ] One bar per category showing: category name + icon, spent vs budgeted amounts, progress bar fill with percentage, status indicator (checkmark for under, warning for 80-100%, alert for over)
- [ ] Income bar at top showing actual vs expected
- [ ] Summary row at bottom: total spent, total budgeted, savings amount and rate
- [ ] Tap on category bar navigates to filtered transaction list
- [ ] Show on screens < 768px, hide Sankey. Show Sankey on >= 768px, hide mobile chart
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-006: Category progress cards
**Description:** As a user, I want cards for each budget category showing my progress so I can quickly see which categories need attention.

**Acceptance Criteria:**
- [ ] Create `components/budget/CategoryCard.tsx` — compact card per category
- [ ] Shows: category icon + name, progress bar (spent/budgeted), dollar amounts (spent / budgeted), percentage used
- [ ] Progress bar colour: category colour when under, warning amber when 80-100%, red when over
- [ ] Remaining amount shown (e.g. "$220 left" or "$50 over")
- [ ] Click navigates to transaction list filtered by category
- [ ] Grid layout: 2 columns on mobile, 3-4 on desktop
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-007: Payday countdown component
**Description:** As a user, I want to see how many days until my next payday so I can pace my spending.

**Acceptance Criteria:**
- [ ] Create `components/budget/PaydayCountdown.tsx`
- [ ] Displays: "X days until payday" for normal days, "Payday tomorrow!" for 1 day, "Payday today!" for 0 days
- [ ] Shows the actual payday date below the countdown
- [ ] Also shows days elapsed / total days in period as context (e.g. "Day 15 of 30")
- [ ] Compact card design fitting in dashboard sidebar/header area
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-008: Savings indicator component
**Description:** As a user, I want to see my current savings rate and projection so I stay motivated to save.

**Acceptance Criteria:**
- [ ] Create `components/budget/SavingsIndicator.tsx`
- [ ] Shows: current savings amount (income - spending), savings rate as percentage, target savings rate (30%), on-track indicator (above/below target)
- [ ] If mid-period: project end-of-period savings based on daily spending rate (spent_so_far / days_elapsed * total_days)
- [ ] Colour: green if above target rate, amber if within 5%, red if below
- [ ] Compact card design
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-009: Period selector component
**Description:** As a user, I want to switch between budget periods so I can review past months.

**Acceptance Criteria:**
- [ ] Create `components/budget/PeriodSelector.tsx`
- [ ] Dropdown or prev/next navigation showing period date range (e.g. "14 Jan - 13 Feb 2026")
- [ ] Current period selected by default
- [ ] Switching periods refreshes all dashboard data
- [ ] Disabled forward arrow on current period (can't view future)
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-010: Category drill-down view
**Description:** As a user, I want to click a category in the dashboard and see all transactions in that category for the current period.

**Acceptance Criteria:**
- [ ] Clicking a Sankey flow, mobile bar, or category card navigates to `/budget/transactions?category={id}&from={periodStart}&to={periodEnd}`
- [ ] Transaction list page (from B-3) pre-filters based on URL params
- [ ] Back navigation returns to dashboard with same period selected
- [ ] `npm run build && npm run lint` passes

## Functional Requirements

- FR-1: Budget summary recalculates on each request (no caching needed at this scale)
- FR-2: Sankey node sizes are proportional to actual amounts
- FR-3: If no transactions exist for a category, it still appears in the Sankey with zero-width flow
- FR-4: Held transactions are shown separately (e.g. "including $X pending") but don't count in main spent figures
- FR-5: Mobile breakpoint is 768px — below shows bars, above shows Sankey
- FR-6: Savings projection uses simple linear extrapolation (daily burn rate * remaining days)
- FR-7: The dashboard page adds a "Budget" link to the main navigation

## Non-Goals

- No budget editing from the dashboard (use setup page)
- No transaction editing from the Sankey (just navigation to list)
- No animated transitions between periods
- No real-time updates (manual refresh or page reload)
- No spending trends / month-over-month comparison (that's B-6)

## Technical Considerations

- Install visx packages: `@visx/sankey`, `@visx/group`, `@visx/scale`, `@visx/tooltip`, `d3-sankey`
- Sankey chart uses SVG rendering — hex colours required (not CSS variables)
- Use `useMediaQuery` or CSS for responsive Sankey/mobile switch
- TanStack Query for data fetching with appropriate stale time
- Sankey tooltip positioning needs care to not overflow viewport

## Success Metrics

- Dashboard loads in under 2 seconds with full Sankey rendered
- Sankey accurately represents proportional spending
- Over-budget categories are immediately visually obvious
- Mobile experience is usable for quick balance checks
- All quality checks pass: `npm run build && npm run lint`

## Open Questions

- Should the Sankey animate on first load?
- Should hovering a category card also highlight the corresponding Sankey flow?
