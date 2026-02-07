# PRD: UX-7 — Charts & Data Visualisation

## Introduction

Upgrade the charting experience across the dashboard and holdings views. The main net worth growth chart is replaced with TradingView Lightweight Charts for a premium financial charting experience with purple gradient fill. All other charts remain on Recharts but get visual polish, animations, and design token treatment. The time range selector becomes animated sliding tabs. Sparkline mini-charts are added to tradeable holding table rows. The donut chart gets a centre overlay with animated total using the NumberTicker component from UX-6.

## Goals

- Replace the net worth growth chart with TradingView Lightweight Charts (area chart, purple gradient)
- Add animated time range selector tabs with sliding indicator
- Add sparkline mini-charts to tradeable holding rows in the holdings table
- Add centre overlay to the asset allocation donut chart with animated total
- Create chart loading skeletons that match chart shapes
- Polish all chart tooltips with design tokens
- Add chart entrance animations (fade in on mount)
- Create a reusable chart wrapper component with consistent styling
- Apply design tokens to all chart components

## User Stories

### US-001: Install TradingView Lightweight Charts and create wrapper
**Description:** As a developer, I want a configured TradingView Lightweight Charts wrapper so I can build premium financial charts.

**Acceptance Criteria:**
- [ ] Install `lightweight-charts` as a dependency
- [ ] Create `components/charts/tv-chart-wrapper.tsx` — a React wrapper for TradingView Lightweight Charts
- [ ] Wrapper handles: creating the chart instance on mount, disposing on unmount, resizing on container resize
- [ ] Wrapper accepts: `data` (array of `{ time, value }` objects), `height` (default 264px), `className`
- [ ] Chart uses dark theme: background `#09090b` (page background), text colour from design tokens
- [ ] Grid lines: subtle, matching `border-border` colour
- [ ] Crosshair: visible on hover, matches accent colour
- [ ] Chart is SSR-safe — uses dynamic import with `ssr: false` (TradingView requires DOM)
- [ ] Typecheck passes (`npm run build`)

### US-002: Replace net worth chart with TradingView area chart
**Description:** As a user, I want a premium net worth growth chart with purple gradient fill so my financial data looks polished.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/net-worth-chart.tsx` to use TradingView Lightweight Charts for the "Net Worth" view mode
- [ ] Area chart with purple gradient fill: line colour `#8b5cf6` (accent), top fill `rgba(139, 92, 246, 0.3)`, bottom fill `rgba(139, 92, 246, 0.02)`
- [ ] Area fill gradient from top (30% opacity) to bottom (2% opacity)
- [ ] Hover crosshair shows: date, net worth value formatted in display currency
- [ ] Custom tooltip styled with design tokens: `bg-card`, `border-border`, `text-foreground`
- [ ] Chart line has 2px width, smooth rendering
- [ ] Y-axis: auto-scaled with padding, formatted as compact currency
- [ ] X-axis: month labels
- [ ] Chart animates in: fades from transparent to visible on mount (200ms)
- [ ] Keep Recharts `AssetsVsDebtChart` for the "Assets vs Debt" view mode (unchanged)
- [ ] Chart view toggle continues to switch between the two modes
- [ ] Export button continues to work (use html2canvas on the chart container)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Create animated time range selector
**Description:** As a user, I want the time range selector to have a smooth sliding indicator so selecting ranges feels interactive.

**Acceptance Criteria:**
- [ ] Create `components/charts/time-range-selector.tsx` — replaces the existing inline `TimeRangeSelector` function in `net-worth-chart.tsx`
- [ ] Options: 3M, 6M, 1Y, All (same as current)
- [ ] Active option has a sliding background indicator using Framer Motion `layoutId="time-range-indicator"`
- [ ] Active tab: `bg-accent/20 text-foreground` with sliding pill
- [ ] Inactive tabs: `text-muted-foreground` with `hover:text-foreground`
- [ ] Indicator slides smoothly between options (200ms, ease-in-out)
- [ ] Props: `value: TimeRange`, `onChange: (range: TimeRange) => void`
- [ ] Compact size to fit alongside chart view toggle and export button
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Add donut chart centre overlay with NumberTicker
**Description:** As a user, I want to see my total net worth in the centre of the allocation donut so I get both the breakdown and total at a glance.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/asset-allocation-pie-chart.tsx`:
  - Add an absolute-positioned overlay in the centre of the donut
  - Centre displays: "Total" label in `text-body-sm text-muted-foreground` above the value
  - Value uses `NumberTicker` component from UX-6 with compact currency formatting
  - Centre text is vertically and horizontally centred within the inner radius
- [ ] Centre overlay does not interfere with donut hover/click interactions (use `pointer-events: none` on the overlay, `pointer-events: auto` on the value text if clickable)
- [ ] Centre value updates when display currency changes (NumberTicker animates the change)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Add sparkline mini-charts to holdings table rows
**Description:** As a user, I want to see a tiny trend line in each holding row so I can spot performance at a glance without navigating to the detail page.

**Acceptance Criteria:**
- [ ] Create `components/charts/sparkline.tsx` — a small, reusable sparkline component
- [ ] Props: `data: number[]` (array of values), `width?: number` (default 80), `height?: number` (default 32), `positive?: boolean` (controls colour)
- [ ] Renders using Recharts `LineChart` with no axes, no grid, no dots — just the line
- [ ] Positive trend (last > first): accent/green line colour
- [ ] Negative trend (last < first): destructive/red line colour
- [ ] Line width: 1.5px, smooth monotone interpolation
- [ ] No animation on the sparkline (static render for performance in table rows)
- [ ] Component handles edge cases: empty data (renders nothing), single data point (renders nothing), all same values (flat line)
- [ ] Typecheck passes (`npm run build`)

### US-006: Integrate sparklines into holdings table
**Description:** As a developer, I want sparklines displayed in the holdings table for tradeable assets.

**Acceptance Criteria:**
- [ ] Add a "Trend" column to the holdings table for tradeable holdings (stocks, ETFs, crypto)
- [ ] Column shows the `Sparkline` component with the last 30 days of price data
- [ ] Fetch sparkline data: add a new API endpoint `GET /api/holdings/[id]/sparkline` that returns daily prices for the last 30 days from the price cache, or derive from transaction history
- [ ] Alternatively, batch-fetch sparkline data for all tradeable holdings in a single API call to avoid N+1 queries
- [ ] Column hidden on mobile (below `md` breakpoint) — sparklines are desktop-only in the table
- [ ] Snapshot-based holdings (super, cash, debt) show no sparkline — column cell is empty for these rows
- [ ] Loading state: show a small skeleton (gray rectangle) while sparkline data loads
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Create reusable chart wrapper component
**Description:** As a developer, I want a consistent chart wrapper so all chart sections have the same card styling, title, and animation.

**Acceptance Criteria:**
- [ ] Create `components/charts/chart-card.tsx`
- [ ] Props: `title: string`, `actions?: ReactNode` (for buttons/toggles in the header), `children: ReactNode`, `className?: string`
- [ ] Renders: card container with `bg-card border border-border rounded-2xl p-4 sm:p-6`
- [ ] Header: title in `text-label` typography (left), actions slot (right)
- [ ] Entrance animation: `fadeIn` preset on mount
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)

### US-008: Update chart loading skeletons
**Description:** As a user, I want chart loading states that match the shape of the chart being loaded.

**Acceptance Criteria:**
- [ ] Update `components/charts/chart-skeleton.tsx`:
  - Replace hardcoded `bg-gray-*` colours with design tokens (`bg-muted`, `bg-border`)
  - Line variant: shows wavy line skeleton shape
  - Pie variant: shows circular skeleton shape
  - Bar variant: shows bar skeleton shapes of varying heights
  - Use `animate-pulse` for shimmer effect
- [ ] All skeletons use the `ChartCard` wrapper for consistent card styling
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Polish chart tooltips with design tokens
**Description:** As a user, I want consistent, polished tooltips across all charts.

**Acceptance Criteria:**
- [ ] Update all custom tooltip components across chart files:
  - `net-worth-chart.tsx` CustomTooltip
  - `asset-allocation-pie-chart.tsx` CustomTooltip
  - `assets-vs-debt-chart.tsx` CustomTooltip
  - Holdings chart tooltips (`holding-price-chart.tsx`, `super-balance-history-chart.tsx`)
- [ ] All tooltips use: `bg-card border border-border rounded-lg p-3 shadow-lg`
- [ ] Text colours: `text-foreground` for values, `text-muted-foreground` for labels
- [ ] Positive values in `text-positive`, negative in `text-destructive`
- [ ] Consistent padding, font sizes, and spacing across all tooltips
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Apply design tokens to all chart components
**Description:** As a developer, I want all chart components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit and update all files in `components/charts/` and `components/dashboard/` chart components:
  - `net-worth-chart.tsx`: card, time range buttons, view toggle
  - `asset-allocation.tsx`: card, progress bars, toggle
  - `asset-allocation-pie-chart.tsx`: card, legend, tooltip
  - `assets-vs-debt-chart.tsx`: tooltip
  - `currency-exposure.tsx`: card, progress bars, text
  - `holding-price-chart.tsx`: card, tooltip, legend
  - `super-balance-history-chart.tsx`: card, tooltip, legend
- [ ] Replace: `bg-gray-*` → `bg-card`/`bg-muted`, `text-gray-*` → `text-muted-foreground`, `border-gray-*` → `border-border`, `text-white` → `text-foreground`
- [ ] Recharts colour constants (hex values passed to chart components) remain as hex but should be defined as named constants in a shared chart colour palette
- [ ] Visual appearance preserved or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-011: Add chart entrance animations
**Description:** As a user, I want charts to fade in smoothly when they load rather than appearing abruptly.

**Acceptance Criteria:**
- [ ] Wrap each chart section in a Framer Motion container using `fadeIn` preset
- [ ] Animation triggers after data loads (not on skeleton state)
- [ ] Charts that switch between views (net worth ↔ assets vs debt, bars ↔ pie) use `AnimatePresence` for crossfade between views
- [ ] Respects `prefers-reduced-motion`
- [ ] No layout shift during animation (chart container has fixed height)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: TradingView Lightweight Charts must be dynamically imported with `ssr: false` — it requires browser DOM APIs
- FR-2: The TradingView chart must handle data updates (when time range changes or price refresh occurs) by calling `setData()` on the existing series, not recreating the chart
- FR-3: The TradingView chart must resize when the container resizes (handle window resize and sidebar collapse)
- FR-4: Sparkline data must be fetched efficiently — either batch-fetch for all holdings or lazy-load per row as they scroll into view
- FR-5: The time range selector must update the URL `range` param (existing behaviour preserved)
- FR-6: The donut centre overlay must not capture mouse events that should reach the donut segments
- FR-7: Chart export (PNG) must continue working for both TradingView and Recharts charts
- FR-8: All chart components must be wrapped in `SectionErrorBoundary` (existing pattern preserved)

## Non-Goals

- No real-time streaming price charts (WebSocket-based live updates)
- No candlestick/OHLC charts for individual holdings
- No comparison charts (overlay multiple holdings)
- No chart annotations or drawing tools
- No chart zoom/pan with mouse drag (TradingView handles scroll zoom by default — this is acceptable)
- No backend changes to the net worth history API
- No chart data caching beyond TanStack Query

## Design Considerations

- **TradingView area chart**: The purple gradient fill creates the premium fintech look described in the UI/UX plan. The gradient goes from solid accent (30% opacity at top) to nearly transparent (2% at bottom). The line itself is solid accent colour.
- **Time range selector**: Same visual style as the holdings filter tabs (UX-3) — horizontal pills with a sliding background indicator. Compact height to fit in the chart header alongside other controls.
- **Sparklines**: Very small (80×32px), no interactivity, just a visual trend indicator. Green for positive trend, red for negative. They should feel like a subtle data decoration, not a full chart.
- **Donut centre**: Value text should be large enough to read (`text-heading-md`) but not so large it overwhelms the donut segments. The "Total" label above it provides context.
- **Chart card**: All chart sections use the same card treatment — `rounded-2xl`, consistent padding, title in upper-left, action controls in upper-right.

## Technical Considerations

- **TradingView Lightweight Charts**: Version 4.x. It's a standalone library (not React-specific). The wrapper component manages the chart lifecycle: create on mount → update data on prop changes → dispose on unmount. Use `useRef` for the chart instance and container element.
- **TradingView + html2canvas**: TradingView renders on a `<canvas>` element. `html2canvas` can capture canvas content, but verify the export works correctly. If not, TradingView has its own `takeScreenshot()` method as a fallback.
- **Bundle size**: `lightweight-charts` is ~45KB gzipped. Since it's dynamically imported and only used on the dashboard, it doesn't affect initial page load for other routes.
- **Sparkline data API**: The simplest approach is to add a query parameter to the existing `/api/prices` endpoint: `GET /api/prices?include_history=true` that returns the last 30 cached price points per holding. Alternatively, create a dedicated endpoint. Keep it lightweight — just `[{ date, price }]` arrays.
- **Recharts hex colours**: Recharts requires hex/rgb colour strings (not Tailwind classes). Define a shared palette object: `const CHART_COLORS = { stock: "#3B82F6", etf: "#8B5CF6", ... }` in `lib/chart-palette.ts` and import it everywhere charts need asset-type colours.
- **Donut centre positioning**: Use CSS absolute positioning with `inset-0 flex items-center justify-center`. The inner radius of the Recharts PieChart is 60px, outer is 90px — the centre overlay sits within the 60px inner radius.

## Success Metrics

- Net worth chart renders with purple gradient fill and TradingView's premium charting experience
- Time range selector animates smoothly between options
- Sparklines appear in all tradeable holding rows without performance degradation
- Donut centre shows animated total that updates on currency change
- All chart tooltips are consistent and use design tokens
- Charts fade in smoothly after data loads
- `npm run build` and `npm run lint` pass cleanly
- No visual regressions on existing chart functionality

## Open Questions

- None — scope is well-defined.
