# PRD: UX-3 — Holdings UI Enhancement

## Introduction

Transform the holdings list from a functional data table into a premium, animated portfolio view. This epic adds animated filter tabs for holding types, stagger animations on filter change, polished row hover effects, collapsible group sections with summary stats, a speed-dial floating action button, and improved empty/dormant states. The existing currency filter dropdown is retained alongside the new type tabs, while the group-by selector is removed (grouping is now determined by the active filter tab).

## Goals

- Add animated type filter tabs (All, Crypto, Stocks, ETFs, Super, Cash, Debt)
- Retain the existing currency filter dropdown
- Show collapsible group sections with summary stats when "All" is selected, flat list for specific types
- Add stagger animation when holdings appear or filter changes
- Polish table row hover effects with subtle highlight
- Create a speed-dial floating action button (Add Holding, Add Transaction, Monthly Check-in)
- Improve dormant holdings visual treatment
- Enhance the empty state component
- Replace hardcoded colour classes with design system tokens throughout holdings components

## User Stories

### US-001: Create animated type filter tabs
**Description:** As a user, I want filter tabs so I can quickly view holdings by type without navigating away.

**Acceptance Criteria:**
- [ ] Create `components/holdings/filter-tabs.tsx` with tabs: All, Crypto, Stocks, ETFs, Super, Cash, Debt
- [ ] Active tab has a sliding background indicator that animates between tabs (use Framer Motion `layoutId` for the pill)
- [ ] Active tab uses accent colour background (`bg-accent/20`) with `text-foreground`
- [ ] Inactive tabs use `text-muted-foreground`, hover → `text-foreground`
- [ ] Tab indicator slides smoothly (200ms, ease-in-out)
- [ ] Tabs are horizontally scrollable on mobile (overflow-x-auto with hidden scrollbar)
- [ ] Filter state is stored in URL search params (`type` param) so it persists on refresh
- [ ] Replace the existing `group-by-selector.tsx` — remove it from the page
- [ ] Currency filter dropdown remains alongside the tabs (positioned to the right)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Implement hybrid grouping — groups on "All", flat list on specific type
**Description:** As a user, I want my holdings visually grouped by type when viewing all, but a clean flat list when I've filtered to a specific type.

**Acceptance Criteria:**
- [ ] When "All" tab is active: holdings display in collapsible group sections (Stocks, ETFs, Crypto, Super, Cash, Debt)
- [ ] When a specific type tab is active (e.g., "Crypto"): holdings display as a flat list with no group header
- [ ] Group sections expanded by default on page load
- [ ] Each group section has a collapsible header — clicking it toggles the group content visibility
- [ ] Collapse/expand uses Framer Motion height animation (200ms, ease-out)
- [ ] Chevron icon in group header rotates on collapse (90° → 0° transition)
- [ ] Empty groups are hidden (don't show "Stocks" header if user has no stocks)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Add group summary stats
**Description:** As a user, I want to see a quick summary for each holding group so I can understand my portfolio composition at a glance.

**Acceptance Criteria:**
- [ ] Create `components/holdings/group-header.tsx` that displays:
  - Group name (e.g., "Crypto", "Superannuation")
  - Count of holdings in group (e.g., "3 holdings")
  - Total value of group in display currency (e.g., "$82,450 AUD")
  - Percentage of total portfolio (e.g., "34%") — displayed as a subtle badge
- [ ] For debt groups: total shown as negative with `text-destructive` colour
- [ ] Summary values update when currency toggle or display currency changes
- [ ] Stats are right-aligned on desktop, wrap below group name on mobile
- [ ] Uses design system tokens: `text-muted-foreground` for secondary text, `bg-card` background
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Add stagger animation on holdings list
**Description:** As a user, I want smooth animations when holdings appear so changes feel intentional and polished.

**Acceptance Criteria:**
- [ ] Wrap the holdings list in a Framer Motion stagger container (`staggerContainer` preset from UX-1)
- [ ] Each holding row uses the `staggerItem` preset — fades in with 50ms delay between rows
- [ ] On filter tab change: existing rows animate out (fade, 100ms), new rows stagger in
- [ ] Use `AnimatePresence` with `mode="popLayout"` to handle enter/exit of rows
- [ ] On initial page load: rows stagger in after data loads
- [ ] Respects `prefers-reduced-motion` — instant display, no stagger
- [ ] Stagger animation completes within 500ms total regardless of row count (cap delay for large lists)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Polish table row hover effects
**Description:** As a user, I want subtle hover feedback on holdings rows so I know they're interactive.

**Acceptance Criteria:**
- [ ] Update `components/holdings/holdings-table.tsx` row styling:
  - Default: `bg-transparent`
  - Hover: subtle background shift to `bg-accent/5` with 150ms transition
  - Hover: slight scale effect (1.005) using CSS transform — barely perceptible but adds "lift"
  - Active/pressed: `bg-accent/10`
- [ ] Clicking a row navigates to the holding detail page (`/holdings/[id]`)
- [ ] Entire row is clickable (not just the name) — cursor changes to pointer
- [ ] Action buttons (Edit/Delete) within the row still work independently (stopPropagation)
- [ ] Row hover does not cause layout shift (use transform, not padding/margin changes)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Create speed-dial floating action button
**Description:** As a user, I want quick access to common actions from anywhere on the holdings page.

**Acceptance Criteria:**
- [ ] Create `components/shared/speed-dial.tsx` — a FAB that expands to show multiple actions
- [ ] FAB positioned fixed at bottom-right of viewport (bottom-6 right-6)
- [ ] Default state: single round button with "+" icon, accent background (`bg-accent`)
- [ ] On click/tap: expands upward to reveal 3 action buttons with labels:
  1. "Add Holding" — opens AddHoldingDialog
  2. "Add Transaction" — navigates to `/transactions` (or opens transaction modal if available)
  3. "Monthly Check-in" — opens CheckInModal
- [ ] Each action button has an icon + text label to its left
- [ ] Expand animation: actions stagger in from bottom (50ms delay each), main button rotates 45° (+ becomes ×)
- [ ] Collapse: reverse animation on clicking the main button or clicking outside
- [ ] Backdrop overlay (subtle dark) appears when expanded, clicking it collapses
- [ ] FAB has subtle shadow (`shadow-lg`) and hover glow (`shadow-glow-sm`)
- [ ] Hidden on mobile screens below 640px (actions accessible via other UI)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Improve dormant holdings visual treatment
**Description:** As a user, I want dormant holdings to be visually distinct so I can focus on active holdings.

**Acceptance Criteria:**
- [ ] Dormant holding rows have reduced opacity (60%) applied to the entire row
- [ ] Dormant badge: subtle pill badge showing "Dormant" in `text-muted-foreground` with `bg-muted` background
- [ ] When "Show dormant" toggle is OFF: dormant holdings are completely hidden (current behaviour preserved)
- [ ] When "Show dormant" toggle is ON: dormant holdings appear at the bottom of each group section (below active holdings)
- [ ] Dormant toggle uses design system tokens — replace any hardcoded colours
- [ ] The toggle itself uses a `Switch` component with a label "Show dormant"
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Enhance empty state component
**Description:** As a user, I want helpful empty states so I know what to do when a section has no data.

**Acceptance Criteria:**
- [ ] Update `components/ui/empty-state.tsx`:
  - Replace hardcoded `bg-gray-800` with `bg-muted` design token
  - Replace hardcoded text colours with `text-muted-foreground` and `text-foreground` tokens
  - Add Framer Motion entrance animation (fadeIn + slideUp preset)
  - Icon container gets a subtle border (`border border-border`)
- [ ] Holdings page empty states:
  - No holdings at all: "No holdings yet" with "Add your first holding" CTA button
  - Filter returns no results: "No [type] holdings" with "Try a different filter" message (no CTA button)
  - All holdings dormant + dormant toggle OFF: "All holdings are dormant" with "Show dormant holdings" toggle CTA
- [ ] Empty state animation respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Replace hardcoded colours across holdings components
**Description:** As a developer, I want all holdings components using design system tokens so styles are consistent.

**Acceptance Criteria:**
- [ ] Audit all files in `components/holdings/` for hardcoded colour classes (`gray-*`, `green-*`, `red-*`, `yellow-*`, `blue-*`, `white`)
- [ ] Replace with semantic design tokens:
  - `text-white` → `text-foreground`
  - `text-gray-400` → `text-muted-foreground`
  - `bg-gray-800` → `bg-muted` or `bg-card`
  - `border-gray-700` → `border-border`
  - `text-green-*` → `text-positive` (for gains)
  - `text-red-*` → `text-destructive` or `text-negative` (for losses)
  - `text-yellow-*` → `text-warning` or keep amber for staleness indicators
- [ ] Replace in `app/(dashboard)/holdings/page.tsx` and `app/(dashboard)/holdings/[id]/page.tsx`
- [ ] Replace in `components/holdings/holdings-table.tsx` and sub-components
- [ ] Visual appearance preserved — new tokens should map to equivalent colours
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The type filter tabs must update the URL `type` search param — linking directly to `/holdings?type=crypto` must work
- FR-2: The currency filter dropdown must coexist with type tabs — both filters apply simultaneously (e.g., type=crypto + currency=USD shows only USD crypto holdings)
- FR-3: The group-by selector (`components/holdings/group-by-selector.tsx`) must be removed — grouping is now automatic (groups on "All", flat on specific type)
- FR-4: Group headers must be interactive — clicking collapses/expands the group content
- FR-5: Group collapse state does not persist across page refreshes (always expanded on load)
- FR-6: The speed-dial FAB must not overlap with page content — main content area needs bottom padding when FAB is visible
- FR-7: Row click navigation must not trigger when clicking Edit/Delete buttons within the row
- FR-8: Dormant holdings sort to the bottom within each group when visible
- FR-9: Stagger animations must not block interaction — holdings must be clickable during animation

## Non-Goals

- No sparkline mini-charts in table rows (deferred to UX-7: Charts)
- No drag-and-drop reordering of holdings
- No inline editing of holdings in the table
- No column sorting (click header to sort) — may be added later
- No search/filter by holding name (command menu handles search)
- No changes to the holding detail page (`/holdings/[id]`) beyond colour token replacement
- No changes to the holdings data model or API

## Design Considerations

- **Filter tabs**: Horizontal bar above the table. On desktop: all tabs visible. On mobile: horizontally scrollable with subtle fade on edges to indicate scrollability.
- **Group headers**: Full-width row spanning the table, slightly elevated background (`bg-card`), left-aligned name with right-aligned stats. Use `rounded-lg` corners.
- **Speed-dial**: Floating above content with `z-50`. Action labels appear to the left of each action button. Main button is 56px (w-14 h-14), action buttons are 44px (w-11 h-11).
- **Row hover**: Very subtle — the scale(1.005) is barely visible but creates a "breathing" feel. Combined with background change it creates a premium interactive feel.

## Technical Considerations

- **AnimatePresence for filter changes**: When the type filter changes, wrap the list in `AnimatePresence` with `mode="popLayout"`. Key each row by holding ID so React/Framer can track which rows enter/exit.
- **URL search params**: Use `useSearchParams()` and `router.replace()` (not `router.push()`) for filter changes to avoid cluttering browser history.
- **Group-by removal**: The existing `groupHoldingsByType()` function in the holdings table can be reused for the "All" tab grouping. The `groupHoldingsByCurrency()` function is no longer needed since group-by-currency is removed.
- **Speed-dial z-index**: Use `z-50` for the FAB and `z-40` for the backdrop. Ensure it doesn't interfere with modals (`z-50` from shadcn/ui Dialog).
- **Row click vs button click**: Use `e.stopPropagation()` on Edit/Delete buttons. Make the row a `<tr>` with `onClick` handler and `cursor-pointer`, but action cell buttons prevent bubbling.
- **Performance**: For large holdings lists (50+), consider capping stagger delay so total animation time stays under 500ms. E.g., `delay = Math.min(index * 0.05, 0.5)`.

## Success Metrics

- Filter tab changes feel instant with smooth animation
- Group sections expand/collapse without layout shift
- Row hover feedback is subtle but noticeable
- Speed-dial FAB provides quick access to 3 key actions
- Empty states are helpful and on-brand
- No hardcoded colour values remain in holdings components
- `npm run build` and `npm run lint` pass cleanly

## Open Questions

- None — scope is well-defined.
