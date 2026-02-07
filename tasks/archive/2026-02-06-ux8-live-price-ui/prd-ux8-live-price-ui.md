# PRD: UX-8 — Live Price UI

## Introduction

Create clear, delightful visual feedback for live price updates and refresh states across the holdings table and dashboard. Price cells get animated value transitions using the NumberTicker component from UX-6, with a brief colour flash when values change. The refresh button gets a progress counter ("Refreshing 3/12..."), timestamps show relative time with exact-time tooltips, and stale/failed price indicators are polished with design tokens and subtle animations. The goal is to make price updates feel dynamic and trustworthy — users should always know when data was last updated, whether it's fresh, and what to do if it's stale.

## Goals

- Add animated price value transitions (NumberTicker + colour flash) when prices update
- Enhance refresh button with progress counter showing fetch progress
- Polish "last updated" timestamps with relative time and exact-time tooltips
- Polish inline retry button for failed price fetches with design tokens and animations
- Add price change flash animation (green flash for up, red for down) on value change
- Create a stale price visual treatment using design tokens
- Add loading skeleton for price cells during initial fetch
- Apply design tokens to all price-related UI components
- Ensure all price states (loading, fresh, stale, error, retrying) have clear, consistent visual treatment

## User Stories

### US-001: Add price update flash animation
**Description:** As a user, I want to see a brief colour flash when a price changes so I notice which holdings just updated.

**Acceptance Criteria:**
- [ ] Create `components/holdings/price-flash.tsx` — a wrapper component that flashes on value change
- [ ] Props: `value: number`, `children: ReactNode`, `className?: string`
- [ ] On value increase: brief green flash (`bg-positive/20` → transparent, 400ms)
- [ ] On value decrease: brief red flash (`bg-destructive/20` → transparent, 400ms)
- [ ] No change: no flash
- [ ] Flash uses CSS transition or Framer Motion `animate` — not a full re-render
- [ ] Tracks previous value via `useRef` to detect direction of change
- [ ] Flash only triggers on actual value change, not on initial mount
- [ ] Respects `prefers-reduced-motion` — no flash, just update the value
- [ ] Typecheck passes (`npm run build`)

### US-002: Integrate NumberTicker into price cells
**Description:** As a user, I want price values to animate smoothly when they change so updates feel dynamic rather than jarring.

**Acceptance Criteria:**
- [ ] Update `PriceCell` in `components/holdings/holdings-table.tsx` to use `NumberTicker` (from UX-6) for the main price display
- [ ] NumberTicker animates digits when price value changes (e.g., on manual refresh or background refresh)
- [ ] On initial load: NumberTicker counts up from 0 to the price value (600ms)
- [ ] On price update: NumberTicker morphs from old value to new value (400ms)
- [ ] Price formatted with currency symbol prefix (A$, NZ$, US$) — prefix does not animate, only digits
- [ ] Wrap NumberTicker in `PriceFlash` (US-001) so both the digit animation and colour flash happen together
- [ ] Change percentage text (`+1.23%`) also updates with a brief crossfade (150ms)
- [ ] Performance: NumberTicker in table rows must not cause jank — use `will-change: transform` on digit slots
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Enhance refresh button with progress counter
**Description:** As a user, I want to see how many prices have been fetched during a refresh so I know the progress.

**Acceptance Criteria:**
- [ ] Update the refresh button in `components/dashboard/dashboard-header.tsx`
- [ ] While refreshing, button text shows: "Refreshing X/Y..." where X = completed, Y = total tradeable holdings
- [ ] Progress updates in real-time as each price fetch completes
- [ ] Implementation: modify the `/api/prices` POST endpoint to accept a streaming response, OR track progress client-side by sending individual fetch requests — choose the simpler approach (client-side tracking recommended)
- [ ] Alternative simpler approach: show "Refreshing..." with a count of total holdings, then on completion show "Refreshed X prices" in the toast (current behaviour enhanced with count in button)
- [ ] `RefreshCw` icon continues to spin (`animate-spin`) during refresh
- [ ] Button disabled during refresh (current behaviour preserved)
- [ ] On completion: button returns to default "Refresh" state
- [ ] Toast on completion: "Refreshed X prices" (success) or "Refreshed X prices, Y failed" (partial failure)
- [ ] Uses design tokens for button styling — replace any hardcoded colours
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Polish last-updated timestamps with tooltips
**Description:** As a user, I want to see when each price was last updated with a clear relative time and the option to see the exact time.

**Acceptance Criteria:**
- [ ] Create `components/holdings/price-timestamp.tsx` — a dedicated timestamp display component
- [ ] Props: `fetchedAt: Date | null`, `isStale: boolean`, `error?: string`
- [ ] Displays relative time: "just now", "2 min ago", "1 hour ago", "3 days ago"
- [ ] Relative time auto-updates every 30 seconds (use `useEffect` with interval)
- [ ] Tooltip (shadcn/ui `Tooltip`) shows exact timestamp: "Feb 5, 2026, 3:42:15 PM AEST"
- [ ] Fresh state: `Clock` icon + relative time in `text-muted-foreground`
- [ ] Stale state: `AlertTriangle` icon in `text-warning` (amber) + relative time in `text-warning`
- [ ] Error state: `AlertTriangle` icon in `text-destructive` + relative time + "(failed)" suffix
- [ ] No timestamp (null): shows "—" with no tooltip
- [ ] Replace the inline timestamp logic currently in `PriceCell` with this component
- [ ] Uses design tokens throughout — no hardcoded colours
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Polish inline retry button for failed prices
**Description:** As a user, I want a clear, polished retry button when a price fetch fails so I can easily try again.

**Acceptance Criteria:**
- [ ] Update the retry button UI within `PriceCell` in `components/holdings/holdings-table.tsx`
- [ ] Retry button: small pill-shaped button (`rounded-full px-2 py-0.5`) with `RotateCw` icon + "Retry" text
- [ ] Default state: `bg-muted text-muted-foreground` with `hover:bg-accent/20 hover:text-foreground`
- [ ] Retrying state: `RotateCw` icon spins (`animate-spin`), text changes to "Retrying...", button disabled
- [ ] On success: button disappears, price cell updates with flash animation (US-001)
- [ ] On failure: button returns to default state, toast shows "Failed to refresh [holding name]"
- [ ] Button has a subtle entrance animation (fade in) when error state appears
- [ ] Button has exit animation (fade out) when price successfully refreshes
- [ ] Uses design tokens throughout
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Create price cell loading skeleton
**Description:** As a user, I want a shaped loading skeleton in price cells while prices are being fetched so the layout feels stable.

**Acceptance Criteria:**
- [ ] Create a loading skeleton variant for the price cell area
- [ ] Skeleton shows: price placeholder (wider bar) + change percentage placeholder (narrower bar) + timestamp placeholder (narrow bar)
- [ ] Skeleton uses `animate-pulse` with `bg-muted` (design tokens, not hardcoded `bg-gray-*`)
- [ ] Skeleton dimensions match the typical rendered price cell content to prevent layout shift
- [ ] Replace the current "Loading..." text in `PriceCell` with the skeleton
- [ ] Skeleton also used for `MarketValueCell` and `GainLossCell` when prices are loading
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Polish stale price visual treatment
**Description:** As a user, I want stale prices to be visually distinct so I can tell at a glance which prices are outdated.

**Acceptance Criteria:**
- [ ] Update `PriceCell` styling for stale prices:
  - Price value text: `text-muted-foreground` (dimmed, instead of full `text-foreground`)
  - Subtle amber left border on the price cell area (`border-l-2 border-warning/50`)
  - Timestamp shows amber warning styling (handled by `PriceTimestamp` US-004)
- [ ] Stale price still shows the cached value (not hidden or replaced)
- [ ] Stale state determined by `isStale` flag from the API (>15 minute cache TTL)
- [ ] When price refreshes and becomes fresh: stale styling removes with a smooth transition (200ms)
- [ ] Fresh → stale transition happens automatically as the relative time updates (when cache expires client-side)
- [ ] Uses design tokens: `text-warning` for amber accents
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Add change indicator animations to price cells
**Description:** As a user, I want the price change indicator (arrow + percentage) to animate when values update.

**Acceptance Criteria:**
- [ ] Update the change percentage display in `PriceCell`:
  - Positive change: `TrendingUp` icon + percentage in `text-positive`
  - Negative change: `TrendingDown` icon + percentage in `text-destructive`
  - Zero/no change: `Minus` icon + "0.00%" in `text-muted-foreground`
- [ ] On price update, if direction changes (positive → negative or vice versa):
  - Icon crossfades from old to new (150ms, `AnimatePresence`)
  - Text colour transitions smoothly
- [ ] Absolute change value in parentheses: `text-muted-foreground` (consistent with design tokens)
- [ ] Replace hardcoded `text-green-*` and `text-red-*` with `text-positive` and `text-destructive`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Polish dashboard refresh integration
**Description:** As a user, I want the dashboard header refresh to feel connected to the price cells below — when I click refresh, I should see a coordinated response.

**Acceptance Criteria:**
- [ ] When refresh starts (button clicked or background refresh triggered):
  - All price cells in the holdings table show a brief "refreshing" indicator (subtle shimmer or pulse on the price value area, 1 cycle, `animate-pulse`)
  - Indicator is subtle — not as prominent as the full loading skeleton (used only on initial load)
- [ ] As prices return from the API:
  - Each price cell updates individually with flash + NumberTicker animation (US-001, US-002)
  - Updated cells stop pulsing
- [ ] On refresh completion:
  - All timestamps reset to "just now"
  - Toast confirms completion
- [ ] Background auto-refresh (triggered on page load when stale prices detected) uses the same visual treatment but no toast
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Replace hardcoded colours across price UI components
**Description:** As a developer, I want all price-related components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit and update all price-related UI in:
  - `components/holdings/holdings-table.tsx` (PriceCell, MarketValueCell, GainLossCell, CostBasisCell)
  - `components/dashboard/dashboard-header.tsx` (refresh button)
  - `components/dashboard/stale-data-warning.tsx` (stale banner)
  - `app/(dashboard)/holdings/page.tsx` (price-related state rendering)
- [ ] Replace:
  - `text-white` → `text-foreground`
  - `text-gray-*` → `text-muted-foreground`
  - `text-green-*` → `text-positive`
  - `text-red-*` → `text-destructive`
  - `text-yellow-*` / `text-amber-*` → `text-warning`
  - `bg-gray-*` → `bg-card`, `bg-muted`, or `bg-background`
  - `border-gray-*` → `border-border`
  - `bg-yellow-900/20` → `bg-warning/10`
  - `border-yellow-600/50` → `border-warning/30`
- [ ] Stale data warning banner (`stale-data-warning.tsx`): replace all hardcoded yellow/amber/gray colours with semantic tokens
- [ ] Visual appearance preserved or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The NumberTicker in price cells must handle rapid value changes gracefully — if a new price arrives before the current animation completes, it should interrupt and animate to the new target
- FR-2: The price flash animation must only trigger on actual value changes, not on component re-renders or unrelated state changes
- FR-3: The refresh progress counter must accurately reflect the total number of tradeable holdings being refreshed
- FR-4: The relative timestamp must auto-update every 30 seconds without causing unnecessary re-renders of the entire table (use isolated component state)
- FR-5: The tooltip with exact timestamp must use the user's local timezone
- FR-6: Stale price styling must transition smoothly when a price goes from stale to fresh (after refresh)
- FR-7: Individual retry must only refresh the specific holding's price, not all prices
- FR-8: Loading skeletons must match the dimensions of rendered price content to prevent layout shift
- FR-9: All price animations must respect `prefers-reduced-motion` — show final values instantly, no flash or animation
- FR-10: Background auto-refresh must be silent (no toast) — only manual refresh shows toasts

## Non-Goals

- No real-time streaming prices (WebSocket-based live updates)
- No auto-refresh countdown timer or progress bar showing cache freshness
- No "failed prices" summary card above the table — use inline retry only
- No price alerts or notifications when prices cross thresholds
- No historical price display in the holdings table (sparklines are in UX-7)
- No changes to the price cache TTL or API endpoints (backend logic unchanged)
- No price comparison or benchmark display

## Design Considerations

- **Price flash**: Very brief (400ms), low opacity (20%). Should feel like a subtle highlight, not a strobe. Green for up, red for down — same colours as the change percentage.
- **NumberTicker in table rows**: Must be performant. Unlike the hero card NumberTicker (single large instance), price cells may have 10-20+ concurrent NumberTicker instances. Use simpler animation (no per-digit slot machine) for table cells — just the spring-based value morphing approach (approach B from UX-6). Reserve per-digit animation for the hero card.
- **Refresh progress**: "Refreshing 3/12..." in the button text is informative without being noisy. The button is already in the dashboard header so it's visible but not intrusive.
- **Stale styling**: Dimmed text + amber left border is subtle enough to not alarm users but clear enough to indicate data age. The amber border creates a visual "flag" that draws the eye to stale rows.
- **Loading skeletons**: Three stacked bars of varying width (price = long bar, change = medium bar, timestamp = short bar) create a recognisable placeholder that maps to the final content shape.

## Technical Considerations

- **NumberTicker performance in tables**: For table cells, use Framer Motion `useSpring` on the raw number value (approach B from UX-6 PRD) rather than per-digit animation (approach A). This is significantly cheaper to render — one animated `<span>` vs 8-12 animated digit slots per cell. Format the spring value through `useTransform` with the currency formatter.
- **Price flash implementation**: Use a CSS transition on `background-color` triggered by a state change. Set `backgroundColor` to the flash colour on value change, then reset to `transparent` after 400ms. Alternatively, use `@keyframes` with `animation` property triggered by adding/removing a class.
- **Tooltip component**: Use shadcn/ui `Tooltip` (`@radix-ui/react-tooltip`) which is already in the project. The tooltip content shows the formatted `fetchedAt` date using `Intl.DateTimeFormat` for locale-aware formatting.
- **Auto-updating relative time**: The `PriceTimestamp` component should use a `useEffect` with `setInterval(30000)` to re-render relative time. To avoid re-rendering the entire table, isolate this in the `PriceTimestamp` component with its own state — the parent `PriceCell` doesn't need to re-render.
- **Refresh progress tracking**: The simplest approach is to count the total tradeable holdings before the refresh starts, show "Refreshing..." with the total, and then show the completion count in the toast. True real-time progress would require either streaming responses or individual per-holding API calls, which adds complexity without significant UX benefit.
- **AnimatePresence for change indicators**: Wrap the `TrendingUp`/`TrendingDown` icon swap in `AnimatePresence` with `mode="wait"` and a short fade transition. Key by direction ("up" | "down" | "neutral") so Framer Motion tracks the swap.

## Success Metrics

- Price values animate smoothly on refresh with NumberTicker morphing
- Price cells flash green/red briefly when values change
- Refresh button shows "Refreshing..." with count during refresh
- All timestamps show relative time with exact-time tooltip on hover
- Stale prices are visually dimmed with amber indicator
- Retry button is polished and clearly actionable on failed fetches
- Loading skeletons replace "Loading..." text for price cells
- All hardcoded colours replaced with design tokens
- `npm run build` and `npm run lint` pass cleanly
- No performance degradation with 10-20 concurrent NumberTicker instances in the table

## Open Questions

- None — scope is well-defined.
