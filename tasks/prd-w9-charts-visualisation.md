# PRD: W-9 Charts & Visualisation

## Introduction

Charts and visualisation bring Mjolnir's data to life, helping Roland understand portfolio trends, allocation, and performance at a glance. This epic implements reusable chart components for net worth over time, asset allocation, super breakdown, and holding performance. Charts are interactive with hover tooltips and support multiple time ranges.

## Goals

- Create reusable chart components for use across the app
- Display net worth history with configurable time ranges
- Show asset allocation as donut chart with toggle to bar chart
- Visualise super growth breakdown (contributions vs returns)
- Add charts to dashboard, dedicated charts page, and holding details
- Support time ranges: 3M, 6M, 12M, YTD, All time
- Interactive hover tooltips showing exact values

## User Stories

### US-001: Set up chart library
**Description:** As a developer, I need a chart library configured for the project.

**Acceptance Criteria:**
- [ ] Evaluate Tremor and Recharts for each chart type needed
- [ ] Install chosen library/libraries (`npm install`)
- [ ] Configure dark mode theming for charts
- [ ] Create base chart wrapper component with consistent styling
- [ ] Document library choice in `lib/charts/README.md`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create time range selector component
**Description:** As a developer, I need a reusable time range selector for charts.

**Acceptance Criteria:**
- [ ] Create `components/charts/time-range-selector.tsx`
- [ ] Options: 3M, 6M, 12M, YTD, All
- [ ] Props: value, onChange, availableRanges (optional)
- [ ] Styled as button group or segmented control
- [ ] Returns date range (startDate, endDate) based on selection
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-003: Create chart tooltip component
**Description:** As a developer, I need consistent tooltips across all charts.

**Acceptance Criteria:**
- [ ] Create `components/charts/chart-tooltip.tsx`
- [ ] Shows date/label and formatted value(s)
- [ ] Supports multiple series (e.g., assets, debt, net worth)
- [ ] Uses CurrencyDisplay for monetary values
- [ ] Dark mode styling
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create net worth history line chart
**Description:** As Roland, I want to see how my net worth has changed over time.

**Acceptance Criteria:**
- [ ] Create `components/charts/net-worth-chart.tsx`
- [ ] Line chart with net worth over time
- [ ] X-axis: months/dates, Y-axis: value (auto-scaled)
- [ ] Optional: show total assets and debt as additional lines
- [ ] Hover shows tooltip with exact values
- [ ] Supports time range prop (filters data)
- [ ] Handles sparse data (missing months)
- [ ] Responsive sizing
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-005: Create asset allocation donut chart
**Description:** As Roland, I want to see my asset allocation as a donut chart.

**Acceptance Criteria:**
- [ ] Create `components/charts/allocation-donut-chart.tsx`
- [ ] Donut chart with segments for each asset type
- [ ] Center shows total value
- [ ] Legend with type names, values, percentages
- [ ] Hover on segment highlights and shows tooltip
- [ ] Colors consistent with asset type badges
- [ ] Handles empty state (no holdings)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-006: Create asset allocation bar chart
**Description:** As Roland, I want to toggle to a bar chart view for allocation.

**Acceptance Criteria:**
- [ ] Create `components/charts/allocation-bar-chart.tsx`
- [ ] Horizontal bar chart showing each asset type
- [ ] Bars sized proportionally to value
- [ ] Shows value and percentage on each bar
- [ ] Sorted by value descending
- [ ] Hover shows tooltip
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-007: Create allocation chart wrapper with toggle
**Description:** As Roland, I want to switch between donut and bar chart views.

**Acceptance Criteria:**
- [ ] Create `components/charts/allocation-chart.tsx`
- [ ] Toggle button: Donut | Bar
- [ ] Renders appropriate chart based on selection
- [ ] Toggle state persists in local storage
- [ ] Smooth transition between views
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-008: Create super growth breakdown chart
**Description:** As Roland, I want to see how my super has grown over time with contribution breakdown.

**Acceptance Criteria:**
- [ ] Create `components/charts/super-growth-chart.tsx`
- [ ] Stacked area or bar chart showing monthly changes
- [ ] Three series: employer contributions, employee contributions, investment returns
- [ ] Investment returns = balance change - total contributions
- [ ] Legend explains each component
- [ ] Hover shows breakdown for that month
- [ ] Supports time range prop
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-009: Create holding performance chart
**Description:** As Roland, I want to see an individual holding's value over time.

**Acceptance Criteria:**
- [ ] Create `components/charts/holding-performance-chart.tsx`
- [ ] Line chart showing holding value over time
- [ ] For tradeable: quantity × price at each point
- [ ] For snapshot: balance at each snapshot
- [ ] Optional: show cost basis line for comparison
- [ ] Supports time range prop
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Create currency exposure chart
**Description:** As Roland, I want to visualise my currency exposure.

**Acceptance Criteria:**
- [ ] Create `components/charts/currency-exposure-chart.tsx`
- [ ] Donut or pie chart showing allocation by currency
- [ ] Segments: AUD, NZD, USD
- [ ] Shows value and percentage per currency
- [ ] Center shows total in display currency
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-011: Create chart data API endpoints
**Description:** As a developer, I need API endpoints to fetch chart-specific data.

**Acceptance Criteria:**
- [ ] Create `app/api/charts/net-worth/route.ts`
- [ ] GET returns time series data: [{ date, netWorth, totalAssets, totalDebt }]
- [ ] Supports `?range=3m|6m|12m|ytd|all` query param
- [ ] Create `app/api/charts/allocation/route.ts`
- [ ] GET returns breakdown: [{ type, value, percentage, count }]
- [ ] Create `app/api/charts/super-growth/[id]/route.ts`
- [ ] GET returns super breakdown: [{ date, employerContrib, employeeContrib, returns }]
- [ ] All require Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Update dashboard with enhanced charts
**Description:** As Roland, I want to see charts on my dashboard.

**Acceptance Criteria:**
- [ ] Replace simple net worth chart with NetWorthChart component
- [ ] Add time range selector (default 12M)
- [ ] Add AllocationChart component (donut by default)
- [ ] Add CurrencyExposureChart component
- [ ] Responsive layout - charts stack on mobile
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Create dedicated charts page
**Description:** As Roland, I want a dedicated page with all charts for deeper analysis.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/charts/page.tsx`
- [ ] Larger versions of all charts
- [ ] Global time range selector affecting all charts
- [ ] Sections: Net Worth, Asset Allocation, Currency Exposure, Super Growth
- [ ] Each section expandable/collapsible
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Add chart to holding detail view
**Description:** As Roland, I want to see performance chart on each holding's detail.

**Acceptance Criteria:**
- [ ] Add HoldingPerformanceChart to holding detail/modal
- [ ] Shows value history for that holding
- [ ] Time range selector
- [ ] For super: option to show growth breakdown
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Create comparison chart (net worth vs target)
**Description:** As Roland, I want to see my progress visually (optional enhancement).

**Acceptance Criteria:**
- [ ] Create `components/charts/progress-chart.tsx`
- [ ] Shows net worth line with optional target/goal line
- [ ] Target can be: fixed amount, percentage growth, or none
- [ ] Shaded area between current and target
- [ ] Only displays if user has set a target (future feature hook)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Add charts navigation
**Description:** As Roland, I want to access the charts page from navigation.

**Acceptance Criteria:**
- [ ] Add "Charts" link to dashboard navigation
- [ ] Link navigates to `/charts` route
- [ ] Current page highlighted in navigation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Chart loading and error states
**Description:** As a developer, I need consistent loading and error states for charts.

**Acceptance Criteria:**
- [ ] Create `components/charts/chart-skeleton.tsx`
- [ ] Skeleton loader matching chart dimensions
- [ ] Create `components/charts/chart-error.tsx`
- [ ] Error state with retry button
- [ ] All chart components use these states
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Chart responsive behaviour
**Description:** As Roland, I want charts to work well on mobile devices.

**Acceptance Criteria:**
- [ ] Charts resize appropriately on mobile
- [ ] Touch-friendly tooltips (tap instead of hover)
- [ ] Legend moves below chart on small screens
- [ ] Donut chart remains readable at small sizes
- [ ] Consider horizontal scroll for time-based charts
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Export chart as image (optional)
**Description:** As Roland, I want to save a chart as an image.

**Acceptance Criteria:**
- [ ] Add "Download" button to chart headers
- [ ] Exports chart as PNG
- [ ] Uses html-to-image or similar library
- [ ] Filename includes chart type and date
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

## Functional Requirements

- FR-1: Chart library chosen based on chart type requirements
- FR-2: All charts support dark mode
- FR-3: Time ranges: 3M, 6M, 12M, YTD, All time
- FR-4: Hover tooltips show exact values with currency formatting
- FR-5: Net worth chart shows net worth line (optional: assets, debt lines)
- FR-6: Asset allocation available as donut (default) or bar chart
- FR-7: Super growth shows employer, employee, returns breakdown
- FR-8: Charts appear on dashboard, dedicated page, and holding details
- FR-9: Charts are responsive and mobile-friendly
- FR-10: Loading and error states for all charts

## Non-Goals

- No real-time updating charts (refresh on user action)
- No chart annotations or notes
- No custom chart creation by user
- No sharing charts publicly
- No chart comparison between holdings (beyond overlay)

## Design Considerations

- Consistent color palette across all charts
- Asset type colors match badges used elsewhere
- Dark mode: avoid pure black backgrounds, use grays
- Chart heights proportional to importance (net worth largest)
- Mobile: prioritize key charts, allow scroll for others
- Tooltips should not obscure data

## Technical Considerations

- Tremor good for simple charts (donut, bar)
- Recharts better for complex (multi-line, stacked area)
- Lazy load chart components for performance
- Memoize chart data transformations
- Consider virtualization for long time series
- SVG-based charts for crisp rendering at any size

## Success Metrics

- Charts render in under 500ms
- All charts readable on mobile (320px width)
- Tooltips appear within 100ms of hover
- No chart library bundle size > 100KB
- No TypeScript errors, lint passes

## Open Questions

- Should we add mini sparkline charts to holdings list rows?
- Should charts support PDF export in addition to PNG?
- Should we add benchmark comparison (e.g., vs S&P 500)?
