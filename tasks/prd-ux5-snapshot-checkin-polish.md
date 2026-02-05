# PRD: UX-5 — Snapshot & Check-in Polish

## Introduction

Create a delightful monthly check-in experience by converting the current single-form modal into a 3-step wizard with animated transitions, adding a prominent dashboard prompt card with accent glow, and showing a success summary on completion. The check-in flow is the primary data entry interface for super, cash, and debt holdings — making it feel guided and polished is critical to user retention. This epic also polishes the snapshots list page and applies design system tokens throughout.

## Goals

- Convert the check-in modal into a 3-step wizard: Month Selection → Holdings Entry → Review & Save
- Add animated step-to-step transitions (directional slide)
- Create a prominent check-in prompt card for the dashboard with accent glow and animation
- Add a visual stepper showing progress through the wizard
- Show a success summary card on completion with changes from last month
- Add "Remind me later" dismissal to the prompt card
- Polish the super contributions expandable section
- Improve the month selector with clear date limit logic
- Apply design tokens across all check-in and snapshot components

## User Stories

### US-001: Create check-in prompt card for dashboard
**Description:** As a user, I want a prominent reminder on my dashboard when my monthly check-in is due so I don't forget.

**Acceptance Criteria:**
- [ ] Create `components/dashboard/checkin-prompt.tsx` (replaces existing `check-in-prompt-card.tsx`)
- [ ] Card appears at the top of the dashboard content area when check-in is needed
- [ ] Card has accent border/glow (`border-accent/30 shadow-glow-sm`) to draw attention
- [ ] Animated entrance: slides down from top with fade-in (`slideUp` preset, reversed direction)
- [ ] Content displays:
  - Icon (CalendarCheck or similar from Lucide)
  - Title: "Monthly Check-in Due"
  - Description: "X holdings need updating for [Month Year]"
  - Primary CTA button: "Start Check-in" — opens the check-in modal
  - Secondary action: "Remind me later" — dismisses the card for the session
- [ ] "Remind me later" stores dismissal in `sessionStorage` (reappears next visit)
- [ ] Card hidden when: no holdings need check-in, or dismissed for this session
- [ ] Uses design system tokens throughout
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Create check-in stepper component
**Description:** As a user, I want to see my progress through the check-in flow so I know how much is left.

**Acceptance Criteria:**
- [ ] Create `components/check-in/checkin-stepper.tsx`
- [ ] Displays 3 steps: "Select Month" → "Update Holdings" → "Review & Save"
- [ ] Each step shows: step number (circle), label text, and connection line to next step
- [ ] Step states:
  - Completed: accent-coloured circle with checkmark icon, solid connection line
  - Current: accent-coloured circle with step number, pulsing glow (`shadow-glow-sm`), dashed connection line
  - Upcoming: muted circle with step number, dashed muted connection line
- [ ] Step transitions animate: circle fills with colour, checkmark draws in (using `checkmark` preset from UX-10)
- [ ] Horizontal layout on desktop, compact horizontal on mobile (labels below circles on mobile)
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Convert check-in modal to 3-step wizard
**Description:** As a user, I want a guided check-in flow so I can focus on one thing at a time without being overwhelmed.

**Acceptance Criteria:**
- [ ] Refactor `components/check-in/check-in-modal.tsx` into a wizard with 3 steps:
  - **Step 1 — Select Month**: Month picker (current or previous month), shows which holdings need updating, "Continue" button
  - **Step 2 — Update Holdings**: All holdings grouped by type (Super, Cash, Debt) in a scrollable form, pre-populated with previous balances where available, "Back" and "Continue" buttons
  - **Step 3 — Review & Save**: Summary of all entered data, comparison with previous month's values (change amount + direction arrow), "Back" and "Save All" buttons
- [ ] Use `AnimatedDialog` wrapper (from UX-10)
- [ ] Stepper component (US-002) displayed at the top of the modal
- [ ] Modal width: `max-w-2xl` to accommodate the content comfortably
- [ ] "Continue" on Step 2 validates that all holding balances are filled in (error shake if not)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Add directional step transitions
**Description:** As a user, I want step transitions to feel spatial — forward slides left, backward slides right — so the wizard feels intuitive.

**Acceptance Criteria:**
- [ ] Wrap step content in Framer Motion `AnimatePresence` with `mode="wait"`
- [ ] Forward transition (Next/Continue): current step slides out to the left + fades, new step slides in from the right + fades
- [ ] Backward transition (Back): current step slides out to the right + fades, new step slides in from the left + fades
- [ ] Transition duration: 250ms, ease-in-out
- [ ] Direction determined by comparing current and previous step indices
- [ ] Key each step content by step index for AnimatePresence to track
- [ ] Respects `prefers-reduced-motion` — instant switch, no slide
- [ ] No layout shift during transition (step container has fixed minimum height)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Polish month selector
**Description:** As a user, I want a clear month picker that only allows valid months so I can't accidentally log data for the wrong period.

**Acceptance Criteria:**
- [ ] Create `components/check-in/month-selector.tsx` — a dedicated month picker component
- [ ] Displays two options as styled cards/buttons: "Current Month ([Month Year])" and "Previous Month ([Month Year])"
- [ ] Selected month has accent border and background (`bg-accent/10 border-accent`)
- [ ] Unselected month has default card styling with hover state
- [ ] Current month is selected by default
- [ ] No other months selectable (hard limit to current and previous only)
- [ ] Shows a note below: "You can log on the 5th for the previous month" or similar helpful text
- [ ] Selection triggers a fetch of check-in status for that month
- [ ] Uses design tokens, no hardcoded colours
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Polish super contributions section
**Description:** As a user, I want the super contributions section to expand smoothly and feel part of the check-in flow.

**Acceptance Criteria:**
- [ ] Super holding entries in Step 2 show: balance input (always visible) + expandable contributions section
- [ ] Contributions section toggle: "Add contributions" link/button below the balance field
- [ ] Expand/collapse uses Framer Motion height animation (`accordionExpand`/`accordionCollapse` presets from UX-10)
- [ ] Contributions fields: Employer Contribution and Employee Contribution (both optional, default 0)
- [ ] If contributions have values from previous check-in, pre-populate and auto-expand the section
- [ ] Dormant super holdings: no contributions section (balance only)
- [ ] Active super holdings: contributions section available but collapsed by default (unless pre-populated)
- [ ] Uses `FormField` components from UX-10 for inputs
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Create review step with change comparison
**Description:** As a user, I want to see a summary of what I'm about to save, including how values changed from last month.

**Acceptance Criteria:**
- [ ] Step 3 displays a summary table/card list with all holdings being updated:
  - Holding name and type icon
  - New balance (the value being saved)
  - Previous balance (from last month's snapshot, or "First entry" if none)
  - Change amount (new - previous) with green/red colouring
  - Change direction arrow (↑ for increase, ↓ for decrease, → for no change)
  - For super: also show employer + employee contributions if entered
- [ ] Holdings grouped by type (Super, Cash, Debt) with group headers
- [ ] For debt: decrease is positive (green, paying off debt), increase is negative (red)
- [ ] "Save All" button at the bottom with accent styling
- [ ] If any balance looks unusual (>50% change from previous), show a subtle amber warning: "Large change detected" — informational only, does not block save
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Add success summary on completion
**Description:** As a user, I want to see what was saved after completing my check-in so I feel confident the data is recorded.

**Acceptance Criteria:**
- [ ] After successful save, Step 3 transforms into a success summary (no new step — replace the review content in-place)
- [ ] Success summary shows:
  - Checkmark animation (using `checkmark` preset)
  - Title: "Check-in Complete!"
  - Subtitle: "X snapshots saved for [Month Year]"
  - Brief list of what was saved: holding name + balance for each
  - Net worth change indicator if calculable: "Estimated net worth: $X (+$Y from last month)"
- [ ] "Done" button closes the modal
- [ ] Modal close triggers cache invalidation (existing behaviour preserved)
- [ ] Success toast also fires: "Check-in complete! X snapshots saved."
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Refactor check-in modal to react-hook-form + zod
**Description:** As a developer, I want the check-in form using the standardised validation approach from UX-10.

**Acceptance Criteria:**
- [ ] Replace manual useState form state with `useForm` from react-hook-form
- [ ] Create zod schema:
  - `month`: required, string (YYYY-MM-DD format)
  - `holdings`: array of objects, each with:
    - `holdingId`: required UUID
    - `balance`: required number, > 0 for super/cash, any positive number for debt
    - `employerContrib`: optional number, >= 0 (super only)
    - `employeeContrib`: optional number, >= 0 (super only)
- [ ] Validation on Step 2 "Continue": all balance fields filled in
- [ ] Error shake on validation failure, focus moves to first empty balance
- [ ] Use `useFieldArray` for the dynamic holdings list
- [ ] Form state persists across step navigation (going back doesn't lose entered data)
- [ ] Typecheck passes (`npm run build`)

### US-010: Replace hardcoded colours across check-in and snapshot components
**Description:** As a developer, I want all check-in and snapshot components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit and update:
  - `components/check-in/check-in-modal.tsx`
  - `components/check-in/check-in-prompt-card.tsx` (or new `checkin-prompt.tsx`)
  - `app/(dashboard)/snapshots/page.tsx`
  - `components/snapshots/edit-snapshot-modal.tsx`
  - `components/snapshots/delete-snapshot-dialog.tsx`
- [ ] Replace:
  - `text-white` → `text-foreground`
  - `text-gray-*` → `text-muted-foreground`
  - `bg-gray-*` → `bg-card`, `bg-muted`, or `bg-background`
  - `border-gray-*` → `border-border`
  - `text-green-*` → `text-positive`
  - `text-red-*` → `text-destructive`
- [ ] Visual appearance preserved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The wizard must maintain form state across all 3 steps — navigating back and forward preserves entered data
- FR-2: Month selection in Step 1 triggers a fetch of check-in status to determine which holdings need updating
- FR-3: Step 2 only shows holdings that need updating for the selected month (holdings already checked in for that month are excluded)
- FR-4: The "Save All" action sends data to the existing `/api/check-in/save` endpoint — no API changes required
- FR-5: The "Remind me later" dismissal uses `sessionStorage` with key `mjolnir-checkin-dismissed` — clears on browser close
- FR-6: The review step comparison data is calculated client-side by comparing entered values with the most recent snapshot for each holding
- FR-7: If the user has no snapshot-based holdings (no super, cash, or debt), the check-in prompt card does not appear
- FR-8: The stepper component is generic and reusable — it accepts `steps` array and `currentStep` index as props

## Non-Goals

- No confetti animation on completion
- No snapshot balance-over-time chart on holding detail page (deferred to UX-7)
- No automatic check-in scheduling or push notifications
- No multi-month bulk check-in (one month at a time only)
- No changes to the check-in API endpoints
- No snapshot creation outside the check-in flow in this epic
- No edit of previously saved check-in data within the wizard (use the snapshots page for edits)

## Design Considerations

- **Prompt card**: Positioned at the very top of the dashboard content, above the hero net worth card. Uses `bg-card` with `border-accent/30` and `shadow-glow-sm`. The accent glow makes it stand out without being garish.
- **Stepper**: Horizontal bar at the top of the modal, above the step content. Step circles are 32px diameter. Connection lines are 2px. Uses accent colour for active/completed, muted for upcoming.
- **Step transitions**: Content container has a fixed minimum height (`min-h-[400px]`) to prevent layout jump between steps. Steps slide horizontally — the spatial metaphor reinforces the linear flow.
- **Review step**: Card-based layout rather than table — each holding gets a small card showing old→new values. Cards grouped under type headers.
- **Success state**: Replaces review content in-place rather than adding a 4th step. The stepper shows all 3 steps as completed. Checkmark animation draws in the centre of the content area.

## Technical Considerations

- **AnimatePresence direction**: Track step direction in state (1 = forward, -1 = backward). Pass as a custom `data-direction` or use Framer Motion `custom` prop on variants to determine slide direction.
- **useFieldArray for dynamic holdings**: The holdings list is dynamic (varies per user). Use `useFieldArray({ name: "holdings" })` to manage the array. Each holding entry is a field array item with `balance`, `employerContrib`, `employeeContrib`.
- **Previous balance fetching**: The review step needs previous balances for comparison. These can come from the check-in status API which already returns holdings data, or fetch latest snapshots per holding.
- **Large change detection**: Calculate `Math.abs((newBalance - prevBalance) / prevBalance)` and flag if > 0.5 (50% change). Skip for first-time entries.
- **Modal size**: `max-w-2xl` provides enough width for the review summary. On mobile the modal goes full-screen (shadcn/ui Dialog behaviour).

## Success Metrics

- Check-in flow takes 3 clear steps with smooth transitions
- Dashboard prompt card is visible and actionable when check-in is due
- "Remind me later" dismisses for the session without data loss
- Review step shows meaningful comparison with previous month
- Success summary gives confidence that data was saved
- All hardcoded colours replaced with design tokens
- `npm run build` and `npm run lint` pass cleanly

## Open Questions

- None — scope is well-defined.
