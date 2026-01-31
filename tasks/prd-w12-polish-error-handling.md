# PRD: W-12 Polish & Error Handling

## Introduction

This epic focuses on polishing the user experience across Mjolnir, ensuring the app feels professional, responsive, and resilient. Key areas include mobile-first responsiveness with touch-friendly interactions, skeleton loaders with optimistic updates, comprehensive error handling with recovery options, and accessibility improvements for keyboard and screen reader users.

## Goals

- Mobile-first responsive design with touch-friendly interactions
- Skeleton loaders for all loading states with optimistic updates
- Comprehensive error handling with inline, toast, and full-page patterns
- Accessibility: keyboard navigation, ARIA labels, focus management
- Clear offline state messaging when connection is lost
- Consistent dark mode polish across all components

## User Stories

### US-001: Audit and fix mobile responsiveness
**Description:** As a developer, I need to audit all pages for mobile responsiveness.

**Acceptance Criteria:**
- [ ] Create mobile responsiveness checklist for all pages
- [ ] Test each page at 320px, 375px, 414px widths
- [ ] Fix layout issues: overflow, truncation, spacing
- [ ] Ensure all interactive elements are reachable
- [ ] Document fixes in progress.txt
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Verify in browser using Playwright (mobile viewport)

### US-002: Implement touch-friendly tap targets
**Description:** As Roland on mobile, I want buttons and links to be easy to tap.

**Acceptance Criteria:**
- [ ] Minimum tap target size: 44x44px
- [ ] Adequate spacing between interactive elements (8px minimum)
- [ ] Increase padding on buttons, table rows, list items for mobile
- [ ] Create `lib/utils/responsive.ts` with breakpoint helpers
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-003: Add swipe gestures for mobile
**Description:** As Roland on mobile, I want swipe gestures for common actions.

**Acceptance Criteria:**
- [ ] Swipe left on holding row to reveal edit/delete actions
- [ ] Swipe left on transaction row for edit/delete
- [ ] Swipe down to refresh on list pages
- [ ] Use react-swipeable or similar library
- [ ] Gesture hints for first-time users
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-004: Create skeleton loader components
**Description:** As a developer, I need reusable skeleton loader components.

**Acceptance Criteria:**
- [ ] Create `components/ui/skeleton.tsx` (if not exists from shadcn)
- [ ] Create `components/skeletons/holdings-list-skeleton.tsx`
- [ ] Create `components/skeletons/dashboard-skeleton.tsx`
- [ ] Create `components/skeletons/transactions-skeleton.tsx`
- [ ] Create `components/skeletons/chart-skeleton.tsx`
- [ ] Skeletons match actual content dimensions
- [ ] Animate with subtle pulse effect
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-005: Implement skeleton loaders across app
**Description:** As Roland, I want to see skeleton loaders while content loads.

**Acceptance Criteria:**
- [ ] Dashboard shows skeleton while loading
- [ ] Holdings list shows skeleton while loading
- [ ] Transactions list shows skeleton while loading
- [ ] Charts show skeleton placeholders
- [ ] Modals show skeleton for async content
- [ ] Replace all spinner-only loading states
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-006: Implement optimistic updates
**Description:** As Roland, I want immediate UI feedback when I take actions.

**Acceptance Criteria:**
- [ ] Add holding: appears in list immediately, rolls back on error
- [ ] Edit holding: updates immediately, rolls back on error
- [ ] Delete holding: removes immediately, restores on error
- [ ] Add transaction: appears immediately
- [ ] Use TanStack Query optimistic update pattern
- [ ] Show subtle "saving" indicator
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-007: Create toast notification system
**Description:** As a developer, I need a consistent toast notification system.

**Acceptance Criteria:**
- [ ] Use shadcn/ui toast or create custom
- [ ] Toast types: success (green), error (red), warning (yellow), info (blue)
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Manual dismiss button
- [ ] Stack multiple toasts
- [ ] Position: bottom-right on desktop, bottom-center on mobile
- [ ] Create `lib/hooks/use-toast.ts` for easy usage
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-008: Implement inline form errors
**Description:** As Roland, I want to see form errors next to the fields.

**Acceptance Criteria:**
- [ ] All form fields show inline error messages
- [ ] Error styling: red border, error text below field
- [ ] Errors clear on field change
- [ ] Error summary at form top for accessibility
- [ ] Create `components/ui/form-field.tsx` wrapper
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-009: Create error boundary component
**Description:** As a developer, I need error boundaries to catch rendering errors.

**Acceptance Criteria:**
- [ ] Create `components/error-boundary.tsx`
- [ ] Catches JavaScript errors in component tree
- [ ] Shows friendly error message, not stack trace
- [ ] "Try Again" button to reset boundary
- [ ] "Go to Dashboard" button as escape hatch
- [ ] Logs error to console (production: error service)
- [ ] Wrap major page sections with boundary
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-010: Create full-page error states
**Description:** As Roland, I want clear error pages when things go wrong.

**Acceptance Criteria:**
- [ ] Create `components/error-states/page-error.tsx`
- [ ] Create `components/error-states/not-found.tsx` (404)
- [ ] Create `components/error-states/server-error.tsx` (500)
- [ ] Create `components/error-states/unauthorized.tsx` (401)
- [ ] Each has: icon, message, suggested action, retry button
- [ ] Consistent styling with app design
- [ ] Create `app/not-found.tsx` and `app/error.tsx`
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-011: Implement API error handling
**Description:** As a developer, I need consistent API error handling.

**Acceptance Criteria:**
- [ ] Create `lib/utils/api-error.ts`
- [ ] Standard error response format: { error: string, code?: string, details?: object }
- [ ] Map HTTP status codes to user-friendly messages
- [ ] Handle network errors gracefully
- [ ] Create `lib/hooks/use-api-error.ts` for consistent handling
- [ ] Retry logic for transient failures (5xx)
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Add keyboard navigation
**Description:** As Roland, I want to navigate the app using keyboard only.

**Acceptance Criteria:**
- [ ] All interactive elements focusable with Tab
- [ ] Logical tab order (left-to-right, top-to-bottom)
- [ ] Visible focus indicators (ring style)
- [ ] Escape closes modals and dropdowns
- [ ] Enter activates buttons and links
- [ ] Arrow keys navigate within menus/lists
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Add ARIA labels and roles
**Description:** As a developer, I need proper ARIA attributes for screen readers.

**Acceptance Criteria:**
- [ ] All buttons have accessible names
- [ ] Icons have aria-hidden or aria-label
- [ ] Form inputs have associated labels
- [ ] Tables have proper header associations
- [ ] Live regions for dynamic updates (toasts, loading)
- [ ] Modal dialogs have proper role and aria-modal
- [ ] Create accessibility testing checklist
- [ ] Typecheck passes
- [ ] Lint passes

### US-014: Implement focus management
**Description:** As Roland using keyboard, I want focus to move logically.

**Acceptance Criteria:**
- [ ] Opening modal focuses first focusable element
- [ ] Closing modal returns focus to trigger
- [ ] Focus trap inside modals (can't tab outside)
- [ ] Skip link at page top for main content
- [ ] Focus moves to error summary on form submit error
- [ ] Create `lib/hooks/use-focus-trap.ts`
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Create offline state indicator
**Description:** As Roland, I want to know when I'm offline.

**Acceptance Criteria:**
- [ ] Create `components/ui/offline-indicator.tsx`
- [ ] Shows banner when offline: "You're offline. Some features unavailable."
- [ ] Banner dismissible but reappears on action attempt
- [ ] Uses navigator.onLine and online/offline events
- [ ] Prevents actions that require network
- [ ] Shows cached data age if applicable
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Polish dark mode consistency
**Description:** As a developer, I need to ensure dark mode is consistent everywhere.

**Acceptance Criteria:**
- [ ] Audit all components for dark mode styling
- [ ] Fix any light-colored elements or inconsistencies
- [ ] Ensure proper contrast ratios (WCAG AA: 4.5:1 for text)
- [ ] Charts use dark-mode-appropriate colors
- [ ] Third-party components (date pickers, etc.) themed
- [ ] Create color palette documentation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Add loading states for actions
**Description:** As Roland, I want to see loading states when actions are in progress.

**Acceptance Criteria:**
- [ ] Buttons show spinner when action in progress
- [ ] Buttons disabled during action to prevent double-submit
- [ ] "Saving..." text on form submit buttons
- [ ] Table rows show loading state during updates
- [ ] Create `components/ui/loading-button.tsx`
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Improve empty states
**Description:** As Roland, I want helpful empty states when there's no data.

**Acceptance Criteria:**
- [ ] Create `components/ui/empty-state.tsx`
- [ ] Props: icon, title, description, action (optional button)
- [ ] Holdings list: "No holdings yet. Add your first holding."
- [ ] Transactions: "No transactions yet. Record a buy or sell."
- [ ] Charts: "Not enough data to display chart."
- [ ] Consistent styling across app
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-019: Add page transitions
**Description:** As Roland, I want smooth transitions between pages.

**Acceptance Criteria:**
- [ ] Subtle fade transition on route changes
- [ ] Modal open/close animations
- [ ] Dropdown and menu animations
- [ ] Avoid jarring layout shifts
- [ ] Respect prefers-reduced-motion
- [ ] Use CSS transitions (not heavy JS libraries)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-020: Performance optimization audit
**Description:** As a developer, I need to ensure the app performs well.

**Acceptance Criteria:**
- [ ] Audit bundle size (target: <500KB initial JS)
- [ ] Lazy load routes/components where appropriate
- [ ] Optimize images (if any)
- [ ] Memoize expensive calculations
- [ ] Lighthouse audit: Performance >90, Accessibility >90
- [ ] Document optimizations made
- [ ] Typecheck passes
- [ ] Lint passes

## Functional Requirements

- FR-1: All pages responsive from 320px to 1920px+
- FR-2: Touch targets minimum 44x44px on mobile
- FR-3: Skeleton loaders for all async content
- FR-4: Optimistic updates for CRUD operations
- FR-5: Toast notifications for action feedback
- FR-6: Inline errors for forms
- FR-7: Error boundaries catch rendering errors
- FR-8: Full-page error states for 404, 500, etc.
- FR-9: Keyboard navigation for all interactions
- FR-10: ARIA labels for screen reader support
- FR-11: Focus management for modals and forms
- FR-12: Offline indicator when network unavailable

## Non-Goals

- No full offline mode with sync
- No light mode (dark mode only)
- No native mobile app
- No IE11 or legacy browser support
- No WCAG AAA compliance (aim for AA)

## Design Considerations

- Mobile-first approach for responsive design
- Skeleton loaders should match content shape closely
- Error messages should be helpful, not technical
- Loading states should not block user from navigating away
- Animations should be subtle and fast (200-300ms)

## Technical Considerations

- Use CSS @container queries where beneficial
- Consider react-error-boundary package
- TanStack Query provides optimistic update hooks
- Test with throttled network in DevTools
- Test with screen reader (VoiceOver, NVDA)
- Use Lighthouse CI for regression testing

## Success Metrics

- Mobile usability score >90 in Lighthouse
- Accessibility score >90 in Lighthouse
- No console errors in production
- All loading states have skeleton or spinner
- All API errors show user-friendly message
- No TypeScript errors, lint passes

## Open Questions

- Should we add haptic feedback on mobile for certain actions?
- Should we implement service worker for offline caching?
- Should we add analytics to track error occurrences?
