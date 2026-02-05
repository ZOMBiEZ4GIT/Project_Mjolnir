# PRD: UX-10 — Forms & Modal Polish

## Introduction

Establish consistent, polished form and modal interactions across the entire app. This epic introduces `react-hook-form` + `zod` for structured validation, creates animated wrappers for dialogs and sheets, adds extended animation presets (error shake, input focus glow, accordion expand), refactors the settings page into accordion sections, and migrates existing delete confirmation dialogs to use the new animated wrapper.

This is a foundational UX epic — subsequent epics (UX-3 through UX-9, UX-11) rely on these components for their forms and modals.

## Goals

- Introduce `react-hook-form` and `zod` as the standard form validation approach and refactor existing forms
- Create animated dialog and sheet wrappers that all modals use
- Extend the animation presets from UX-1 with modal, form, and page-specific transitions
- Add visual feedback for validation errors (inline messages, shake animation, focus glow)
- Standardise toast usage with consistent success/error patterns
- Refactor the settings page into collapsible accordion sections
- Migrate existing delete confirmation dialogs to the animated wrapper
- Ensure all form interactions respect `prefers-reduced-motion`

## User Stories

### US-001: Extend animation presets with modal, form, and page-specific transitions
**Description:** As a developer, I want a complete set of animation presets so all interactive elements have consistent, reusable motion.

**Acceptance Criteria:**
- [ ] Add to `lib/animations.ts` the following presets:
  - `modalScale`: scale 0.95→1 + opacity 0→1, duration 200ms (for dialogs)
  - `modalExit`: scale 1→0.95 + opacity 1→0, duration 150ms
  - `sheetSlide`: x -100%→0 + opacity 0→1, duration 300ms ease-out (for drawers)
  - `sheetSlideRight`: x 100%→0 for right-side sheets
  - `errorShake`: keyframes x [0, -8, 8, -4, 4, 0], duration 400ms (for invalid form submit)
  - `focusGlow`: boxShadow transition to `0 0 0 2px rgba(139,92,246,0.4)`, duration 150ms
  - `accordionExpand`: height 0→auto + opacity 0→1, duration 200ms ease-out
  - `accordionCollapse`: height auto→0 + opacity 1→0, duration 150ms ease-in
  - `checkmark`: pathLength 0→1 + scale 0→1, spring physics (for success state)
- [ ] All presets respect `prefers-reduced-motion` (duration 0 when enabled)
- [ ] Presets are exported as typed objects compatible with Framer Motion `variants` or spread props
- [ ] Typecheck passes (`npm run build`)

### US-002: Create animated dialog wrapper
**Description:** As a user, I want modals to open and close with smooth animations so the app feels premium.

**Acceptance Criteria:**
- [ ] Create `components/ui/animated-dialog.tsx` that wraps shadcn/ui `Dialog`
- [ ] Dialog content scales from 0.95→1.0 + fades in on open (using `modalScale` preset)
- [ ] Dialog content scales to 0.95 + fades out on close (using `modalExit` preset)
- [ ] Backdrop uses blur + dark overlay (`bg-black/80 backdrop-blur-sm`)
- [ ] Component accepts all props that shadcn/ui `Dialog` accepts (drop-in replacement)
- [ ] Exports: `AnimatedDialog`, `AnimatedDialogContent`, `AnimatedDialogHeader`, `AnimatedDialogFooter`, `AnimatedDialogTitle`, `AnimatedDialogDescription`
- [ ] Respects `prefers-reduced-motion` — instant show/hide, no animation
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Create animated alert dialog wrapper
**Description:** As a user, I want confirmation dialogs to have the same polished animations as regular dialogs.

**Acceptance Criteria:**
- [ ] Create `components/ui/animated-alert-dialog.tsx` that wraps shadcn/ui `AlertDialog`
- [ ] Same scale + fade animation as animated dialog
- [ ] Same backdrop treatment (blur + dark overlay)
- [ ] Drop-in replacement — exports all the same parts as `alert-dialog.tsx` with `Animated` prefix
- [ ] Exports: `AnimatedAlertDialog`, `AnimatedAlertDialogContent`, `AnimatedAlertDialogHeader`, `AnimatedAlertDialogFooter`, `AnimatedAlertDialogTitle`, `AnimatedAlertDialogDescription`, `AnimatedAlertDialogAction`, `AnimatedAlertDialogCancel`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Install react-hook-form and zod, create form field component
**Description:** As a developer, I want a standardised form validation approach with inline error display so forms are consistent and maintainable.

**Acceptance Criteria:**
- [ ] Install `react-hook-form`, `@hookform/resolvers`, and `zod` as dependencies
- [ ] Create `components/ui/form-field.tsx` — a wrapper component that connects a shadcn/ui input to react-hook-form:
  - Accepts `name`, `label`, `description` (optional), `placeholder`, and `type` props
  - Displays label above the input
  - Displays inline error message below the input when validation fails (red text, `text-sm text-destructive`)
  - Input border turns red on error (`border-destructive`)
  - Input shows subtle purple glow on focus using `focusGlow` animation preset
- [ ] Create `components/ui/form-textarea-field.tsx` — same pattern for textarea inputs
- [ ] Create `components/ui/form-select-field.tsx` — same pattern for select dropdowns
- [ ] All field components use `Controller` from react-hook-form for integration
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Add error shake animation to form submit
**Description:** As a user, I want visual feedback when I submit a form with errors so I notice what needs fixing.

**Acceptance Criteria:**
- [ ] Create a `useFormShake` hook or utility that triggers the `errorShake` animation on a form container
- [ ] When a form is submitted with validation errors, the form container shakes briefly (400ms)
- [ ] After shake, focus moves to the first field with an error
- [ ] Shake animation only triggers on submit attempt, not on individual field blur
- [ ] Respects `prefers-reduced-motion` — skips shake, still moves focus to first error
- [ ] Typecheck passes (`npm run build`)

### US-006: Standardise toast notifications
**Description:** As a user, I want consistent success and error feedback so I always know whether my action completed.

**Acceptance Criteria:**
- [ ] Update `components/ui/sonner.tsx` to configure toast defaults:
  - Success toasts: auto-dismiss after 3 seconds, show checkmark icon
  - Error toasts: persist until manually dismissed, show X icon, include "Retry" action button when a retry function is provided
  - Info toasts: auto-dismiss after 4 seconds
- [ ] Create `lib/toast-helpers.ts` with convenience functions:
  - `showSuccess(message: string, description?: string)` — wraps `toast.success`
  - `showError(message: string, options?: { description?: string; onRetry?: () => void })` — wraps `toast.error`, adds retry button if `onRetry` provided
  - `showInfo(message: string)` — wraps `toast.info`
- [ ] Migrate at least 3 existing toast calls to use the new helpers to verify they work (e.g., in add-holding-dialog, delete-snapshot-dialog, check-in-modal)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Refactor AddHoldingDialog to use animated dialog + react-hook-form + zod
**Description:** As a developer, I want the Add Holding dialog refactored to use the new form and dialog patterns so it serves as the reference implementation.

**Acceptance Criteria:**
- [ ] Update `components/holdings/add-holding-dialog.tsx`:
  - Replace `Dialog` with `AnimatedDialog`
  - Replace manual useState form state with `useForm` from react-hook-form
  - Create a zod schema for the two-step form validation (step 1: type required; step 2: name required, symbol conditionally required based on type, currency required, exchange conditionally required)
  - Replace inline error display with `FormField` components
  - Add error shake on submit with validation errors
  - Use toast helpers for success/error feedback
- [ ] All existing functionality preserved (two-step wizard, type selection, conditional fields)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Refactor EditHoldingDialog to use animated dialog + react-hook-form + zod
**Description:** As a developer, I want the Edit Holding dialog migrated to the new patterns for consistency.

**Acceptance Criteria:**
- [ ] Update `components/holdings/edit-holding-dialog.tsx`:
  - Replace `Dialog` with `AnimatedDialog`
  - Replace manual form state with `useForm`, pre-populated with existing holding data
  - Create zod schema matching edit form requirements
  - Replace inline error display with `FormField` components
  - Use toast helpers for success/error/info feedback
- [ ] "No changes to save" info toast still works when form is unchanged
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Refactor CheckInModal to use animated dialog + react-hook-form
**Description:** As a developer, I want the monthly check-in modal migrated to the new patterns.

**Acceptance Criteria:**
- [ ] Update `components/check-in/check-in-modal.tsx`:
  - Replace `Dialog` with `AnimatedDialog`
  - Replace manual form state with `useForm` for the check-in data (balances, contributions)
  - Create zod schema: all active holding balances required (number, > 0), contribution fields optional (number, >= 0)
  - Replace inline error display with `FormField` components
  - Add error shake on submit with missing balances
  - Use toast helpers for success/error feedback
- [ ] Multi-step flow still works (month selection → data entry → confirmation)
- [ ] Dynamic field rendering for variable number of holdings still works
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Refactor EditSnapshotModal to use animated dialog + react-hook-form
**Description:** As a developer, I want the edit snapshot modal migrated to the new patterns.

**Acceptance Criteria:**
- [ ] Update `components/snapshots/edit-snapshot-modal.tsx`:
  - Replace `Dialog` with `AnimatedDialog`
  - Replace manual form state with `useForm`
  - Create zod schema: balance required (number), notes optional (string), contribution fields optional (number, >= 0)
  - Replace inline error display with `FormField` components
  - Use toast helpers for feedback
- [ ] Collapsible contributions section for super holdings still works
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-011: Migrate delete confirmation dialogs to animated alert dialog
**Description:** As a user, I want delete confirmations to have the same polished animation as other modals.

**Acceptance Criteria:**
- [ ] Update `components/snapshots/delete-snapshot-dialog.tsx`:
  - Replace `AlertDialog` imports with `AnimatedAlertDialog` equivalents
  - No other logic changes needed — just swap the components
  - Use toast helpers for success/error feedback
- [ ] Update `components/transactions/delete-transaction-dialog.tsx`:
  - Same migration — swap to `AnimatedAlertDialog`
  - Use toast helpers for success/error feedback
- [ ] Both dialogs animate in/out smoothly
- [ ] Both dialogs still show their detail information (holding name, amounts, warnings)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-012: Refactor settings page with accordion sections
**Description:** As a user, I want settings organised into collapsible sections so I can focus on one area at a time.

**Acceptance Criteria:**
- [ ] Install shadcn/ui `Accordion` component if not already present
- [ ] Create `components/settings/settings-section.tsx` — an accordion item wrapper with:
  - Icon + title in the trigger
  - Description text below the title
  - Framer Motion height animation on expand/collapse (using `accordionExpand`/`accordionCollapse` presets)
  - Chevron icon that rotates on expand (90° rotation with transition)
- [ ] Refactor `app/(dashboard)/settings/page.tsx` to use accordion layout:
  - Section 1: "Currency Preferences" — currency selector, native toggle (expanded by default)
  - Section 2: "Email Reminders" — EmailPreferences component
  - Section 3: "Keyboard Shortcuts" — shortcut list
  - Section 4: "About" — app version, links (new section)
- [ ] Multiple sections can be open simultaneously (`type="multiple"` on Accordion)
- [ ] All sections use design system tokens (no hardcoded colours)
- [ ] Smooth height transition on expand/collapse, nested content fades in after expand
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-013: Create confirmation dialog component
**Description:** As a developer, I want a reusable confirmation dialog component so future destructive actions can easily show a consistent confirmation prompt.

**Acceptance Criteria:**
- [ ] Create `components/ui/confirm-dialog.tsx` — a ready-to-use component (not just primitives):
  - Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel` (default "Confirm"), `cancelLabel` (default "Cancel"), `variant` ("default" | "destructive"), `onConfirm`, `loading` (boolean)
  - Uses `AnimatedAlertDialog` under the hood
  - Destructive variant: confirm button uses `variant="destructive"` styling
  - Loading state: confirm button shows spinner, both buttons disabled
  - Keyboard: Enter confirms, Escape cancels
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `react-hook-form`, `@hookform/resolvers`, and `zod` must be installed as project dependencies
- FR-2: Animated dialog/alert-dialog components must be drop-in replacements — consuming components only need to change import paths
- FR-3: Form field components must integrate with react-hook-form's `Controller` or `register` API — they must not manage their own state
- FR-4: The error shake animation must use `transform: translateX()` (GPU-accelerated) — not `left` or `margin`
- FR-5: Toast helpers must not change the underlying sonner library — they are convenience wrappers only
- FR-6: The settings accordion must allow multiple sections open simultaneously
- FR-7: All animation durations must be 0 when `prefers-reduced-motion` is enabled
- FR-8: Zod schemas must be co-located with the component that uses them (not in a separate schemas directory)

## Non-Goals

- No form builder or dynamic form generation system
- No migration of the command menu to new patterns (it's not a form)
- No creation of new forms — only refactor existing ones
- No changes to API routes or backend logic
- No changes to TanStack Query mutation logic (only the form state management layer changes)
- No introduction of a form context provider — each form is self-contained

## Design Considerations

- **Input focus glow**: On focus, inputs get a subtle purple ring — `ring-2 ring-accent/40`. This is in addition to the default browser focus ring, not replacing it. Use Framer Motion to animate the ring appearance.
- **Error state**: Red border (`border-destructive`) + error message below in `text-destructive text-sm`. Message uses `slideUp` animation preset for smooth appearance.
- **Shake direction**: Horizontal shake only (translateX). Vertical shake feels wrong for form errors.
- **Accordion styling**: Trigger has `hover:bg-accent/10` background. Expanded trigger has a subtle bottom border. Content area has `pl-10` (indented past the icon).

## Technical Considerations

- **react-hook-form + zod integration**: Use `zodResolver` from `@hookform/resolvers/zod`. Each form creates a zod schema inline or as a const above the component. Use `useForm<z.infer<typeof schema>>()` for type inference.
- **Multi-step forms**: For the check-in modal (multi-step), use a single `useForm` instance across steps. Validate per-step using `trigger()` on specific field names rather than full form validation.
- **Dynamic fields**: The check-in modal has a variable number of holdings. Use `useFieldArray` or dynamically register fields based on the holdings list.
- **Animated height**: For accordion, use Framer Motion's `animate={{ height: "auto" }}` with `overflow: hidden` on the container. This requires measuring content height — Framer Motion handles this automatically.
- **Bundle size**: react-hook-form (~9KB gzip), zod (~13KB gzip), @hookform/resolvers (~2KB gzip). Total ~24KB. Acceptable for the validation infrastructure.

## Success Metrics

- All existing modals (4 dialogs + 2 alert dialogs) use animated wrappers
- All existing forms use react-hook-form + zod validation
- Error shake triggers on invalid submit across all forms
- Toast notifications are consistent (success auto-dismisses, error persists)
- Settings page accordion sections expand/collapse smoothly
- `npm run build` and `npm run lint` pass cleanly
- No regressions in existing form functionality

## Open Questions

- None — scope is well-defined.
