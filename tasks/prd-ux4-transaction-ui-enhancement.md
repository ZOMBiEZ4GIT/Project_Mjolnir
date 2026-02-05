# PRD: UX-4 — Transaction UI Enhancement

## Introduction

Polish the transaction entry and history views with smooth interactions, consistent animation patterns, and improved data presentation. This epic adds animated type selector tabs to the add/edit dialogs, groups the transaction history by month with sticky headers, refactors both dialogs to use react-hook-form + zod + animated dialog wrappers, moves the aggregated totals from the table footer into summary cards above the table, and applies design system tokens throughout.

## Goals

- Replace radio button type selector with animated tabs (sliding indicator) in add/edit dialogs
- Refactor add/edit transaction dialogs to react-hook-form + zod + animated dialog wrappers
- Group transaction history by month with sticky section headers
- Move aggregated totals (buys, sells, dividends, net cash flow) into summary cards above the table
- Add stagger animation on transaction rows and row hover effects
- Apply colour-coded visual indicators for transaction types using design system tokens
- Add success confirmation animation on save
- Replace all hardcoded colour values with design tokens

## User Stories

### US-001: Create animated transaction type selector
**Description:** As a user, I want a polished type selector with animated indicator so choosing a transaction type feels interactive and clear.

**Acceptance Criteria:**
- [ ] Create `components/transactions/type-selector.tsx` — animated tab bar with options: BUY, SELL, DIVIDEND, SPLIT
- [ ] Active tab has a sliding background indicator that animates between options (Framer Motion `layoutId`)
- [ ] Each tab is colour-coded:
  - BUY: positive/green-tinted background when active
  - SELL: destructive/red-tinted background when active
  - DIVIDEND: accent/purple-tinted background when active
  - SPLIT: blue-tinted background when active
- [ ] Inactive tabs: `text-muted-foreground` with `hover:text-foreground`
- [ ] Indicator slides smoothly (200ms, ease-in-out)
- [ ] Component accepts `value` and `onChange` props for controlled usage
- [ ] Component accepts an optional `disabled` prop (used in edit dialog where type is read-only)
- [ ] When disabled: shows the active type but no interaction, reduced opacity on other tabs
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Refactor AddTransactionDialog to animated dialog + react-hook-form + zod
**Description:** As a developer, I want the add transaction dialog refactored to the new form and dialog patterns for consistency.

**Acceptance Criteria:**
- [ ] Update `components/transactions/add-transaction-dialog.tsx`:
  - Replace `Dialog` with `AnimatedDialog` (from UX-10)
  - Replace manual useState form state with `useForm` from react-hook-form
  - Create zod schema with conditional validation:
    - All types: date required, holding required
    - BUY/SELL: quantity > 0, unitPrice > 0, fees >= 0
    - DIVIDEND: quantity > 0 (shares held), unitPrice > 0 (dividend per share), no fees
    - SPLIT: quantity > 0 (split ratio), no price/fees
  - Use `FormField` components for inputs with inline error display
  - Replace radio buttons with `TypeSelector` component (US-001)
  - Add error shake on submit with validation errors
  - Use toast helpers for success/error feedback
- [ ] Two-step flow preserved: Step 1 (holding + type) → Step 2 (details)
- [ ] SELL validation still checks available quantity and prevents overselling
- [ ] Calculated totals (estimated cost/proceeds) still display in real-time
- [ ] Step 2 form fields change dynamically based on selected transaction type
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Refactor EditTransactionDialog to animated dialog + react-hook-form + zod
**Description:** As a developer, I want the edit transaction dialog refactored for consistency with the add dialog.

**Acceptance Criteria:**
- [ ] Update `components/transactions/edit-transaction-dialog.tsx`:
  - Replace `Dialog` with `AnimatedDialog`
  - Replace manual form state with `useForm`, pre-populated with existing transaction data
  - Create zod schema matching the transaction type's requirements (same rules as add)
  - Use `FormField` components for inputs
  - Use `TypeSelector` in disabled mode (type cannot be changed)
  - Use toast helpers for feedback
- [ ] Holding name and action type displayed as read-only information
- [ ] SELL validation still accounts for the transaction being edited when calculating available quantity
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Add transaction summary cards above table
**Description:** As a user, I want to see my transaction totals at a glance in summary cards so I can understand my cash flow quickly.

**Acceptance Criteria:**
- [ ] Create `components/transactions/transaction-summary.tsx` — a row of summary cards
- [ ] Display 4 cards in a responsive grid:
  1. **Total Bought** — sum of all BUY transactions (quantity × unitPrice + fees), positive/green colour
  2. **Total Sold** — sum of all SELL transactions, destructive/red colour
  3. **Dividends Received** — sum of all DIVIDEND transactions, accent/purple colour
  4. **Net Cash Flow** — (sells + dividends - buys), colour based on positive/negative
- [ ] Each card shows: label, formatted dollar amount, transaction count (e.g., "12 transactions")
- [ ] Cards use design system tokens: `bg-card`, `border-border`, appropriate text colours
- [ ] Cards stagger in on load (50ms delay each) using `staggerContainer`/`staggerItem` presets
- [ ] Grid: 4 columns on desktop (lg+), 2 columns on tablet (md), 1 column on mobile
- [ ] Remove the existing aggregated totals from the table footer
- [ ] Summary values respect the current filter state (if filtered by holding or currency, totals reflect filtered data)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Group transaction history by month with sticky headers
**Description:** As a user, I want transactions grouped by month so I can scan my history chronologically.

**Acceptance Criteria:**
- [ ] Group transactions by month (e.g., "February 2026", "January 2026")
- [ ] Month headers are sticky — they stick to the top of the scroll container as the user scrolls
- [ ] Month headers display: month/year name (left) and transaction count for that month (right)
- [ ] Month headers use `bg-background` to avoid content showing through when sticky
- [ ] Month headers have a subtle bottom border (`border-border`)
- [ ] Groups sorted in reverse chronological order (most recent month first)
- [ ] When filters change, grouping recalculates based on filtered transactions
- [ ] Empty months are not shown (only months with matching transactions appear)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Add stagger animation and row hover effects to transaction table
**Description:** As a user, I want smooth animations and hover feedback on transaction rows for a polished feel.

**Acceptance Criteria:**
- [ ] Transaction rows use stagger animation on initial load and filter change (50ms delay, capped at 500ms total)
- [ ] Row hover: `bg-accent/5` background with 150ms transition
- [ ] Rows animate out on filter change (fade, 100ms) and new rows stagger in
- [ ] Use `AnimatePresence` with row keys based on transaction ID
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Polish transaction type badges with design tokens
**Description:** As a user, I want clear, consistent colour coding for transaction types throughout the page.

**Acceptance Criteria:**
- [ ] Update transaction action badges in the table:
  - BUY: `bg-positive/20 text-positive` (green)
  - SELL: `bg-destructive/20 text-destructive` (red)
  - DIVIDEND: `bg-accent/20 text-accent` (purple)
  - SPLIT: `bg-blue-500/20 text-blue-400` (blue — add `--info` CSS variable if not present)
- [ ] Badges are pill-shaped (`rounded-full px-2 py-0.5 text-xs font-medium`)
- [ ] Same colour scheme used in: table badges, type selector tabs, summary cards
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Add success confirmation animation on save
**Description:** As a user, I want visual confirmation when I save a transaction so I know it worked.

**Acceptance Criteria:**
- [ ] On successful transaction save (add or edit):
  - Dialog closes with exit animation (scale 1→0.95 + fade out)
  - Success toast appears with checkmark icon: "Transaction saved" (or "Transaction updated")
  - The new/updated transaction row in the table briefly highlights with a subtle accent pulse (1 second, `bg-accent/10` → transparent)
- [ ] Row highlight only applies to the specific transaction that was just saved
- [ ] Highlight uses Framer Motion animation, respects `prefers-reduced-motion`
- [ ] On successful deletion: toast shows "Transaction deleted", row fades out before being removed from list
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Replace hardcoded colours across transaction components
**Description:** As a developer, I want all transaction components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit all files in `components/transactions/` and `app/(dashboard)/transactions/page.tsx`
- [ ] Replace hardcoded colour classes:
  - `bg-green-900 text-green-300` → `bg-positive/20 text-positive`
  - `bg-red-900 text-red-300` → `bg-destructive/20 text-destructive`
  - `bg-blue-900 text-blue-300` → info colour tokens
  - `text-white` → `text-foreground`
  - `text-gray-*` → `text-muted-foreground`
  - `bg-gray-*` → `bg-card`, `bg-muted`, or `bg-background` as appropriate
  - `border-gray-*` → `border-border`
- [ ] Filter dropdowns use design tokens
- [ ] Empty state uses design tokens
- [ ] Visual appearance preserved — colours should be equivalent or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The type selector component must be reusable — it accepts `value`, `onChange`, and optional `disabled` props
- FR-2: Transaction type cannot be changed when editing — the type selector is displayed in read-only/disabled mode
- FR-3: Summary cards must update dynamically when filters (holding, action, currency) change
- FR-4: Monthly grouping must handle the case where a single transaction spans a month boundary (use transaction date, not created date)
- FR-5: Sticky month headers must use `position: sticky` with appropriate `top` value accounting for any fixed header/navbar
- FR-6: The row highlight animation on save must target the specific transaction by ID using a ref or state flag
- FR-7: The two-step add flow is preserved — Step 1 validates holding + type, Step 2 validates the detail fields
- FR-8: Zod schemas must use `.refine()` or `.superRefine()` for cross-field validation (e.g., SELL quantity cannot exceed available)

## Non-Goals

- No bulk transaction entry (multi-row add)
- No inline editing of transactions in the table
- No transaction search by notes or amount
- No chart/visualisation of transaction history (handled in UX-7)
- No changes to the transaction API or database schema
- No drag-and-drop reordering of transactions
- No column sorting (click header to sort)

## Design Considerations

- **Type selector tabs**: Same visual style as holdings filter tabs (UX-3) but with colour-coded active states per type. Horizontal layout, fits within the dialog width.
- **Summary cards**: Compact cards with icon, label, value, and count. Similar style to the dashboard summary cards. Use the same `bg-card border border-border rounded-2xl p-4` pattern.
- **Month headers**: Full-width, slightly elevated from rows. Format: "February 2026" on the left, "8 transactions" on the right in `text-muted-foreground`.
- **Row highlight on save**: Very subtle pulse — starts at `bg-accent/10`, fades to transparent over 1 second. Should not be distracting.

## Technical Considerations

- **Conditional zod schemas**: Use `z.discriminatedUnion("action", [...])` to define different validation rules per transaction type. This gives precise TypeScript types for each action's form data.
- **Sticky headers with scroll container**: If the transaction table is inside a scrollable container, sticky headers need `top: 0` relative to that container. If the page itself scrolls, sticky headers need `top` set to the height of any fixed navbar.
- **Row highlight state**: After a successful save, store the transaction ID in component state (e.g., `highlightedId`). Clear it after 1 second via `setTimeout`. Pass it to the table to conditionally apply the highlight animation.
- **Summary card calculations**: Reuse the existing aggregation logic from the table footer. Lift it into a shared utility or compute in the page component and pass to both summary and table.
- **Form reset on step change**: When the user goes back from Step 2 to Step 1 and changes the transaction type, the Step 2 form fields should reset to defaults for the new type. Use `form.reset()` with type-specific defaults.

## Success Metrics

- Type selector tabs animate smoothly between options
- All 4 summary cards display correct values matching the filtered data
- Monthly grouping headers stick correctly during scroll
- Transaction save shows confirmation toast + row highlight
- All hardcoded colours replaced with design tokens
- `npm run build` and `npm run lint` pass cleanly
- No regressions in transaction CRUD functionality

## Open Questions

- None — scope is well-defined.
