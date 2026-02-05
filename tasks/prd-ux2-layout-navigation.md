# PRD: UX-2 — Layout & Navigation

## Introduction

Replace the current top-header navigation with a persistent sidebar layout. The sidebar will be collapsible on desktop (toggle between full-width with icons + labels and icon-only mode), and become a slide-out drawer on mobile. The top header bar is removed entirely — branding, UserButton, and action controls (refresh, currency selector) all move into the sidebar or the main content area.

This creates the three-zone layout foundation described in the UI/UX plan: sidebar (left) + main content (center) + optional right panel (future). Page transitions use a subtle fade/crossfade between routes.

## Goals

- Replace header-based navigation with a collapsible sidebar
- Provide a toggle to expand/collapse the sidebar on desktop
- Show icons only when collapsed, icons + text labels when expanded
- Move branding and Clerk UserButton into the sidebar
- Relocate refresh/currency controls to the dashboard page content (no longer in a global header)
- Create a mobile drawer that matches the sidebar's content
- Add subtle crossfade page transitions
- Maintain keyboard accessibility and Cmd+K command menu
- Persist sidebar collapse state across sessions

## User Stories

### US-001: Create sidebar component with expand/collapse
**Description:** As a user, I want a persistent sidebar so I can navigate between sections easily, and toggle it between expanded and collapsed states to save screen space.

**Acceptance Criteria:**
- [ ] Create `components/layout/sidebar.tsx` as a client component
- [ ] Sidebar renders on the left side of the viewport
- [ ] Expanded state: 240px wide, shows icon + text label for each nav item
- [ ] Collapsed state: 64px wide, shows icon only with tooltip showing the label on hover
- [ ] Toggle button visible at the bottom of the sidebar (e.g., chevron icon that flips direction)
- [ ] Collapse state persists in `localStorage` so it survives page refreshes
- [ ] Smooth width transition when toggling (200-300ms, ease-in-out)
- [ ] Sidebar uses design system tokens: `bg-card` background, `border-border` right border
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Add navigation items with active state indicator
**Description:** As a user, I want visual feedback on which page I'm on so I don't lose context.

**Acceptance Criteria:**
- [ ] Create `components/layout/nav-item.tsx` for individual navigation items
- [ ] Navigation items: Dashboard, Holdings, Transactions, Snapshots, Import, Export, Settings (7 items — same as current desktop nav)
- [ ] Each item has a Lucide icon (reuse icons from `command-menu.tsx`: LayoutDashboard, Wallet, ArrowRightLeft, Camera, Upload, Download, Settings)
- [ ] Active item has an animated indicator — a background pill/highlight that slides to the active item using Framer Motion `layoutId`
- [ ] Active item has subtle purple glow (`shadow-glow-sm` from design system)
- [ ] Inactive items: `text-muted-foreground`, hover → `text-foreground` with `bg-accent/50` background
- [ ] Active item: `text-foreground` with accent-tinted background
- [ ] When sidebar is collapsed, active indicator still visible (icon highlighted)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Add branding and user section to sidebar
**Description:** As a user, I want to see the app branding and my account controls in the sidebar since there is no header bar.

**Acceptance Criteria:**
- [ ] Top of sidebar: Mjolnir logo/text — show "Mjolnir" when expanded, "M" or a small icon when collapsed
- [ ] Bottom of sidebar: Clerk `UserButton` component
- [ ] When expanded: UserButton shows alongside user name (if available)
- [ ] When collapsed: UserButton shows as just the avatar circle
- [ ] Vertical layout: Branding (top) → Nav items (middle, flex-grow) → User section (bottom) → Collapse toggle (bottom-most)
- [ ] Branding section has a subtle bottom border separating it from nav items
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Create mobile navigation drawer
**Description:** As a user on mobile, I want a slide-out navigation drawer since the sidebar is hidden on small screens.

**Acceptance Criteria:**
- [ ] Create `components/layout/mobile-nav.tsx` (replaces existing `components/dashboard/mobile-nav.tsx`)
- [ ] Sidebar is hidden below `lg` breakpoint (1024px)
- [ ] A hamburger menu button appears in a slim mobile header bar on screens below `lg`
- [ ] Mobile header shows: hamburger button (left), "Mjolnir" text (center), UserButton (right)
- [ ] Tapping hamburger opens a `Sheet` (slide-out drawer) from the left
- [ ] Drawer contains the same nav items as the sidebar with icons + labels
- [ ] Active item highlighted with same styling as sidebar
- [ ] Drawer closes when a nav item is tapped
- [ ] Drawer closes when pressing Escape
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Create app shell layout component
**Description:** As a developer, I want a single layout component that composes the sidebar, mobile nav, and content area so the dashboard layout is clean.

**Acceptance Criteria:**
- [ ] Create `components/layout/app-shell.tsx` that composes all layout pieces
- [ ] Desktop (lg+): sidebar on left + main content area taking remaining width
- [ ] Mobile (<lg): mobile header + full-width content
- [ ] Main content area has appropriate padding (`p-6` on desktop, `p-4` on mobile)
- [ ] Content area max-width: `1400px` (from design system `maxContentWidth`)
- [ ] Update `app/(dashboard)/layout.tsx` to use `AppShell` instead of the current header-based layout
- [ ] Remove old `components/dashboard/nav.tsx` and `components/dashboard/mobile-nav.tsx` after migration
- [ ] `CommandMenu` remains rendered at layout level (keyboard shortcut still works)
- [ ] `DashboardErrorBoundary` still wraps the content area
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Add page transition wrapper
**Description:** As a user, I want smooth transitions between pages so the app feels cohesive rather than jarring.

**Acceptance Criteria:**
- [ ] Create `components/layout/page-wrapper.tsx` using Framer Motion
- [ ] Wraps page content with a subtle fade transition: opacity 0→1 on mount, duration 200ms
- [ ] Uses `AnimatePresence` with `mode="wait"` for crossfade between routes
- [ ] Respects `prefers-reduced-motion` — no animation when reduced motion is enabled (use `useAnimationConfig` hook from UX-1)
- [ ] No layout shift during transitions (content position stays stable)
- [ ] Wrap dashboard layout's `{children}` in the page wrapper
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Relocate dashboard action controls
**Description:** As a developer, I need to move the refresh button and currency controls out of the deleted header and into the dashboard page content area.

**Acceptance Criteria:**
- [ ] The `DashboardHeader` component (welcome message, refresh button, currency selector, FX rates) remains on the dashboard page — it is already rendered at page level, not in the layout
- [ ] Verify that removing the layout header does not break the DashboardHeader component's positioning
- [ ] DashboardHeader uses design system tokens (replace any hardcoded `text-white`, `bg-gray-*` classes)
- [ ] On non-dashboard pages (holdings, transactions, etc.), the page title is shown at the top of the content area — each page already handles its own header
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Keyboard navigation and accessibility
**Description:** As a user, I want to navigate the sidebar with keyboard so the app is accessible.

**Acceptance Criteria:**
- [ ] All sidebar nav items are focusable via Tab key
- [ ] Enter/Space activates the focused nav item (navigates to that route)
- [ ] Focus ring visible on all interactive elements (`focus-visible:ring-2 focus-visible:ring-ring`)
- [ ] Sidebar collapse toggle is keyboard accessible
- [ ] Mobile hamburger button has `aria-label="Open navigation menu"`
- [ ] Mobile drawer traps focus when open (handled by shadcn/ui Sheet)
- [ ] Sidebar has `role="navigation"` and `aria-label="Main navigation"`
- [ ] Collapsed icon-only items have `aria-label` matching their text label
- [ ] Cmd+K command menu continues to work from any page
- [ ] Typecheck passes (`npm run build`)

## Functional Requirements

- FR-1: The sidebar must be a persistent element on desktop (lg+), visible on all dashboard routes
- FR-2: The sidebar collapse state must persist in `localStorage` under a key like `mjolnir-sidebar-collapsed`
- FR-3: The sidebar width transition must animate using CSS transition (not Framer Motion layout animation) to avoid re-rendering content
- FR-4: The mobile breakpoint is `lg` (1024px) — below this, sidebar is hidden and mobile header + drawer appears
- FR-5: The main content area must adjust its left margin/padding based on sidebar state (expanded vs collapsed)
- FR-6: Page transitions must not interfere with scroll position — each page starts scrolled to top
- FR-7: The nav items array must be defined in a single shared location (e.g., `lib/navigation.ts`) and consumed by sidebar, mobile nav, and command menu
- FR-8: Old navigation components (`components/dashboard/nav.tsx`, `components/dashboard/mobile-nav.tsx`) must be deleted after migration

## Non-Goals

- No right-side panel in this epic (future UX epics may add one)
- No breadcrumb navigation
- No sidebar sections/grouping (all items in one flat list)
- No drag-to-resize sidebar
- No notification badges on nav items
- No sub-navigation or nested routes in the sidebar

## Design Considerations

- **Sidebar background**: `bg-card` (#18181b) with `border-r border-border` — slightly elevated from page background
- **Active indicator**: Use Framer Motion `layoutId="active-nav"` on a background element to animate the pill sliding between items. This creates the "sliding highlight" effect described in the UI/UX plan.
- **Tooltip on collapsed state**: Use shadcn/ui `Tooltip` component on icon-only nav items to show the label on hover
- **Collapse toggle icon**: `PanelLeftClose` / `PanelLeftOpen` from Lucide, positioned at the bottom of the sidebar
- **Content area**: Should feel spacious — use `px-6 py-6` on desktop, `px-4 py-4` on mobile

## Technical Considerations

- **CSS transition for width**: Use `transition-[width]` on the sidebar and `transition-[margin-left]` or `transition-[padding-left]` on the content area. Avoid Framer Motion `layout` prop here as it would cause expensive re-renders of all content.
- **localStorage sync**: Use a simple `useState` + `useEffect` pattern for localStorage. No need for Zustand — this is a single boolean value.
- **Next.js App Router page transitions**: `AnimatePresence` with route-based keys is tricky in App Router. Use a `usePathname()` key on the motion wrapper. If crossfade proves problematic, fall back to mount-only fade-in (no exit animation).
- **Shared nav items**: Create `lib/navigation.ts` exporting the nav items array with `href`, `label`, `icon`, and `description`. This eliminates the current duplication between `nav.tsx`, `mobile-nav.tsx`, and `command-menu.tsx`.
- **Profile route**: The existing `/profile` route is not in any nav menu. It should remain accessible via the UserButton dropdown but does not need a sidebar entry.

## Success Metrics

- Sidebar renders correctly at all viewport widths (375px to 1920px+)
- Collapse toggle works and state persists across page refreshes
- Active nav indicator animates smoothly between items
- Page fade transitions render at 60fps
- No layout shift when sidebar collapses/expands
- All existing dashboard functionality continues to work
- `npm run build` and `npm run lint` pass cleanly

## Open Questions

- None — scope is well-defined.
