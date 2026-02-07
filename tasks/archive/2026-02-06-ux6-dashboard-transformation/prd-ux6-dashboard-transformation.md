# PRD: UX-6 — Dashboard Transformation

## Introduction

Transform the main dashboard from a functional data display into a premium fintech experience. The hero net worth card gets a visual rebuild with purple glow and animated number ticker. Summary cards, asset allocation, and top performers get animation and visual upgrades. All dashboard components get design token replacements. The layout stays single-column with internal grids (not a three-panel layout), keeping the current responsive structure but polishing every section.

The number ticker animates on both initial load (count-up from 0) and subsequent value changes (morph between old and new values), making price refreshes feel dynamic.

## Goals

- Rebuild the hero net worth card's visual presentation with purple glow, animated number ticker, and refined layout
- Create a reusable animated number ticker component
- Add stagger animations to dashboard sections on load
- Polish summary cards, asset allocation, and top performers with animations and visual upgrades
- Apply design system tokens to ALL dashboard components (hero, summary, allocation, currency exposure, super breakdown, net worth chart, top performers, stale data warning, dashboard header)
- Add change percentage badges with colour coding
- Add stale data indicators using design tokens
- Improve the responsive grid layout within the existing single-column structure

## User Stories

### US-001: Create animated number ticker component
**Description:** As a user, I want to see numbers animate when values change so updates feel dynamic and rewarding.

**Acceptance Criteria:**
- [ ] Create `components/dashboard/number-ticker.tsx`
- [ ] On initial mount: counts up from 0 to the target value over 600ms using spring physics (`numberSpring` preset)
- [ ] On value change: morphs from the previous value to the new value over 400ms
- [ ] Supports currency formatting (e.g., `$1,248,593.00`) — digits animate individually for a "slot machine" feel
- [ ] Props: `value: number`, `currency: Currency`, `className?: string`, `prefix?: string`
- [ ] Handles negative values (displays minus sign, then animates the absolute value)
- [ ] Respects `prefers-reduced-motion` — shows final value instantly, no animation
- [ ] Does not cause layout shift during animation (fixed-width digit slots or `tabular-nums` font feature)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Rebuild hero net worth card visual presentation
**Description:** As a user, I want my net worth displayed prominently with a premium feel so checking it feels rewarding.

**Acceptance Criteria:**
- [ ] Rebuild `components/dashboard/net-worth-hero.tsx` — new markup, same data hooks
- [ ] Card has purple glow effect: `shadow-glow-md` (from design system) + subtle gradient border using accent colour
- [ ] Background: gradient from `bg-card` to slightly lighter, with subtle accent tint (`from-card via-card to-accent/5`)
- [ ] Net worth value uses `NumberTicker` component (US-001) with `text-display-xl` typography
- [ ] "Net Worth" label uses `text-label` typography (small caps, tracking wide)
- [ ] Change indicator below the value:
  - Positive: green badge with up arrow + amount + percentage
  - Negative: red badge with down arrow + amount + percentage
  - Badge has subtle coloured background (`bg-positive/10` or `bg-negative/10`)
- [ ] Existing sparkline preserved (inline to the right of the value on desktop, below on mobile)
- [ ] Stale data warning icon preserved (amber, top-right corner)
- [ ] "as of" timestamp preserved in `text-muted-foreground text-body-sm`
- [ ] Card entrance animation: `fadeIn` + `slideUp` preset on mount
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Create change badge component
**Description:** As a developer, I want a reusable change badge so percentage changes are displayed consistently across the dashboard.

**Acceptance Criteria:**
- [ ] Create `components/dashboard/change-badge.tsx`
- [ ] Props: `amount: number`, `percentage: number`, `currency: Currency`, `size?: "sm" | "md"`, `showAmount?: boolean`
- [ ] Positive values: `text-positive` text, `bg-positive/10` background, TrendingUp icon
- [ ] Negative values: `text-destructive` text, `bg-destructive/10` background, TrendingDown icon
- [ ] Zero/no change: `text-muted-foreground`, neutral icon (Minus or dash)
- [ ] Size `sm`: compact for use in table cells and small cards
- [ ] Size `md`: standard for hero card and summary cards
- [ ] Pill shape: `rounded-full px-2 py-0.5` for sm, `rounded-full px-3 py-1` for md
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Polish summary cards with animations
**Description:** As a user, I want the Total Assets and Total Debt cards to feel premium with animated values and polished styling.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/summary-cards.tsx`:
  - Use `NumberTicker` for the main value display
  - Use `ChangeBadge` for month-over-month change
  - Card background: `bg-card` with `border border-border`
  - Total Assets card: subtle positive accent on the icon (`text-positive`)
  - Total Debt card: subtle destructive accent on the icon (`text-destructive`)
  - Cards stagger in on load (100ms delay between them)
- [ ] Add a percentage-of-net-worth indicator: e.g., "Assets: 105% of net worth" / "Debt: 5% of net worth"
- [ ] Cards have hover effect: `shadow-card-hover` on hover with 150ms transition
- [ ] Replace all hardcoded colours (`text-green-*`, `text-red-*`, `bg-gray-*`) with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Polish asset allocation with animations
**Description:** As a user, I want the asset allocation breakdown to animate in and feel interactive.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/asset-allocation.tsx`:
  - Card uses `bg-card border border-border rounded-2xl`
  - Bar chart rows stagger in on mount (50ms delay per row)
  - Progress bars animate from 0% to target width (400ms, ease-out)
  - Percentage labels use the `text-body-sm` typography token
  - View mode toggle (bars/pie) uses design tokens
  - Donut chart centre overlay shows total assets with `NumberTicker`
- [ ] Replace hardcoded colour hex values with CSS custom properties or Tailwind token classes where possible
- [ ] Hover on bar rows: subtle background shift (`bg-accent/5`)
- [ ] Entrance animation: `fadeIn` preset on the entire card
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Polish top performers with animations
**Description:** As a user, I want to see my top performers animate in with clear visual hierarchy.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/top-performers.tsx`:
  - Card uses `bg-card border border-border rounded-2xl`
  - Section headers ("Top Gainers" / "Top Losers") use `text-label` typography
  - Performer rows stagger in (50ms delay per row)
  - Gain/loss values use `text-positive` and `text-destructive` design tokens
  - Use `ChangeBadge` component for each performer's gain/loss display
  - Row hover: `bg-accent/5` with 150ms transition, cursor pointer (already links to holding)
- [ ] Replace all hardcoded colours (`text-emerald-*`, `text-red-*`, `bg-gray-*`) with design tokens
- [ ] Empty state uses the enhanced empty state component (from UX-3)
- [ ] Entrance animation: `fadeIn` preset on the card
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Add stale data indicator component
**Description:** As a user, I want to know which values are stale so I trust the data I'm seeing.

**Acceptance Criteria:**
- [ ] Create `components/dashboard/stale-indicator.tsx`
- [ ] Props: `isStale: boolean`, `lastUpdated?: Date | string`, `variant?: "icon" | "badge"`
- [ ] Icon variant: amber AlertTriangle icon with tooltip showing "Last updated: X ago"
- [ ] Badge variant: amber pill badge showing "X ago" with warning icon
- [ ] Uses design tokens: warning colour (amber — add `--warning` CSS variable if not present, or use amber directly)
- [ ] Tooltip uses shadcn/ui `Tooltip` component
- [ ] Used by: hero card (existing stale warning), summary cards, holdings table
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Apply design tokens to dashboard header
**Description:** As a developer, I want the dashboard header using design system tokens.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/dashboard-header.tsx`:
  - `text-white` → `text-foreground`
  - Welcome heading uses `text-heading-lg` or `text-heading-md` typography
  - Refresh button uses design tokens for styling
  - FxRatesDisplay and CurrencySelector: verify they use design tokens (update if not)
- [ ] Replace all hardcoded colour classes
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Apply design tokens to stale data warning
**Description:** As a developer, I want the stale data warning banner using design system tokens.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/stale-data-warning.tsx`:
  - Replace hardcoded amber/yellow/gray colour classes with appropriate tokens
  - Use warning colour tokens for the banner background and text
  - Banner uses `bg-warning/10 border-warning/30 text-warning` pattern (or amber equivalents)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Apply design tokens to currency exposure
**Description:** As a developer, I want the currency exposure section using design system tokens.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/currency-exposure.tsx`:
  - Card uses `bg-card border border-border rounded-2xl`
  - Replace all hardcoded colour classes with design tokens
  - Text hierarchy uses typography tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-011: Apply design tokens to super breakdown section
**Description:** As a developer, I want the super breakdown section using design system tokens.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/super-breakdown-section.tsx` and `components/dashboard/super-growth-chart.tsx`:
  - Card uses `bg-card border border-border rounded-2xl`
  - Replace all hardcoded colour classes with design tokens
  - Text hierarchy uses typography tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-012: Apply design tokens to net worth chart
**Description:** As a developer, I want the net worth history chart using design system tokens.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/net-worth-chart.tsx`:
  - Card uses `bg-card border border-border rounded-2xl`
  - Replace hardcoded colour classes with design tokens
  - Chart tooltip styling uses design tokens
  - Text hierarchy uses typography tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-013: Dashboard section stagger animation
**Description:** As a user, I want dashboard sections to animate in sequentially on page load for a polished entrance.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/dashboard-content.tsx`:
  - Wrap all dashboard sections in a Framer Motion stagger container
  - Each section (hero, summary, allocation, etc.) is a stagger item
  - Stagger delay: 80ms between sections
  - Each section fades in + slides up (using `staggerItem` preset)
  - Total animation completes within 800ms
- [ ] Respects `prefers-reduced-motion` — all sections appear instantly
- [ ] No layout shift during stagger (sections occupy their space immediately, just opacity/transform animate)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-014: Responsive dashboard grid refinement
**Description:** As a user, I want the dashboard layout to use space efficiently across all screen sizes.

**Acceptance Criteria:**
- [ ] Update `components/dashboard/dashboard-content.tsx` grid layout:
  - Desktop (lg+): Summary cards in 2 columns, Allocation + Currency in 2 columns, Top Performers full width with internal 2-column split (already done)
  - Tablet (md): Summary cards in 2 columns, Allocation + Currency stacked, Top Performers stacked
  - Mobile: Everything single column
- [ ] Consistent spacing between sections: `gap-6` throughout
- [ ] Content area padding: `px-6 py-6` on desktop, `px-4 py-4` on mobile
- [ ] All cards use consistent border radius: `rounded-2xl` (16px from design system)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The `NumberTicker` component must handle rapid value changes gracefully — if a new value arrives before the current animation completes, it should interrupt and animate to the new target
- FR-2: The `NumberTicker` must use `tabular-nums` font feature or fixed-width digit rendering to prevent layout shift during animation
- FR-3: The `ChangeBadge` component must format values with appropriate precision (2 decimal places for currency, 1 for percentage)
- FR-4: Dashboard section stagger must not delay interactivity — sections should be clickable/interactive as soon as they appear, even while later sections are still animating
- FR-5: All dashboard components must continue using TanStack Query with the existing refetch intervals (60 seconds) — no changes to data fetching logic
- FR-6: The hero card glow effect must use `box-shadow` (not `filter: drop-shadow`) for GPU acceleration
- FR-7: Design token replacements must not change the visual appearance significantly — colours should map to equivalent or improved values

## Non-Goals

- No three-column layout with right panel (single column with internal grids)
- No new data fetching endpoints or API changes
- No charts rewrite (deferred to UX-7)
- No live price UI changes (deferred to UX-8)
- No currency toggle/display changes (deferred to UX-9)
- No new dashboard sections or widgets
- No drag-and-drop dashboard customisation

## Design Considerations

- **Hero card glow**: Use `shadow-glow-md` from the design system. The glow should be visible but not overpowering — it creates a "premium" feel, like a backlit display. The gradient border uses a pseudo-element or border-image with accent colour at low opacity.
- **Number ticker**: Digits animate individually (not the whole number as one unit). This creates a "slot machine" or "odometer" effect. Use `overflow: hidden` on each digit slot with vertical slide animation.
- **Summary cards**: Clean, card-based layout with clear hierarchy — icon top-left, value prominent, change badge below. Not cluttered.
- **Asset allocation bars**: Progress bars should have rounded ends and a smooth fill animation. The accent colour can tint each bar's fill to match the asset type colour while maintaining readability.
- **Top performers rows**: Compact, list-style rows. Each row feels like a clickable list item, not a table row. Subtle left-border colour accent matching gain (green) or loss (red).

## Technical Considerations

- **Number ticker implementation**: Two approaches — (A) Framer Motion `animate` on individual digit `<span>` elements with vertical translateY, or (B) `useSpring` from Framer Motion on the raw number value, then format for display. Approach B is simpler but doesn't give the per-digit effect. Recommend approach A for premium feel.
- **Per-digit animation**: Split the formatted currency string into individual characters. Each character slot has a fixed width. Digits animate vertically (translateY). Non-digit characters (commas, periods, currency symbol) don't animate. Use `key={position}` on each slot so React doesn't re-mount them.
- **Stagger performance**: Use Framer Motion's `staggerChildren` on a parent, not individual `setTimeout` delays. This is more efficient and can be cancelled/reversed cleanly.
- **Design token migration**: Some existing components use hardcoded Recharts colour values (hex strings passed as props). These can remain as hex since Recharts doesn't support Tailwind classes — but define them as constants from a shared palette file.
- **Glow effect**: `box-shadow: 0 0 30px rgba(139, 92, 246, 0.3)` — uses rgba directly, not CSS variables, since box-shadow can't use HSL variables with alpha. This is consistent with the design system glow utilities.

## Success Metrics

- Hero card has visible purple glow and animated number ticker
- Number ticker animates on both initial load and price refresh
- All dashboard sections stagger in smoothly on page load
- All hardcoded colour values replaced with design tokens across all 10+ dashboard components
- Summary cards and allocation bars animate on load
- `npm run build` and `npm run lint` pass cleanly
- No visual regressions — the dashboard looks the same or better

## Open Questions

- None — scope is well-defined.
