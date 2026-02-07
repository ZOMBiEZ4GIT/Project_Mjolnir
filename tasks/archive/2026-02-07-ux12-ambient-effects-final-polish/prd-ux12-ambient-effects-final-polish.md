# PRD: UX-12 — Ambient Effects & Final Polish

## Introduction

The final epic in the UI/UX enhancement plan. Add ambient background effects to auth pages and the dashboard hero card for a premium fintech atmosphere. Redesign error and 404 pages with illustrations, animations, and branded gradient backgrounds. Run a comprehensive accessibility audit covering focus-visible states, ARIA labels, touch targets, keyboard navigation, colour contrast, and automated axe-core testing. Add app metadata including favicon, Open Graph tags, theme-color, and a PWA manifest. This epic ties together all the polish from UX-1 through UX-11 and ensures the entire app feels cohesive, accessible, and premium.

## Goals

- Add animated gradient background effect to auth pages (sign-in, sign-up)
- Add subtle beam/particle effect behind the dashboard hero net worth card
- Redesign error page (error.tsx) with illustration, animation, helpful suggestions, and ambient gradient
- Redesign 404 page (not-found.tsx) with illustration, animation, helpful links, and ambient gradient
- Add skip-to-content link for keyboard accessibility
- Audit and fix focus-visible ring states across all interactive elements
- Audit and add ARIA labels to all interactive elements
- Verify and fix touch targets (44×44px minimum) across all interactive elements
- Verify keyboard navigation works correctly across all pages
- Verify colour contrast meets WCAG AA standards
- Integrate axe-core for automated accessibility testing
- Add favicon, Open Graph meta tags, theme-color meta tag, and manifest.json

## User Stories

### US-001: Add animated gradient background to auth pages
**Description:** As a user, I want a premium ambient background on the sign-in and sign-up pages so the first impression of the app feels polished.

**Acceptance Criteria:**
- [ ] Create `components/effects/animated-gradient.tsx` — a reusable animated gradient background component
- [ ] Props: `variant?: "auth" | "error"`, `className?: string`
- [ ] Auth variant: slow-moving gradient using accent purple (`#8b5cf6`) and background (`#09090b`), with subtle blue and indigo tints
- [ ] Gradient animates slowly: 2-3 colour blobs that drift across the background over 15-20 seconds, then loop
- [ ] Implementation: CSS `@keyframes` on `background-position` with a large gradient, OR Framer Motion `animate` on gradient stops — choose the most performant approach (CSS preferred for continuous animation)
- [ ] Gradient is behind all content (`z-0`), content sits above (`z-10`)
- [ ] Gradient opacity is low enough (~30-40%) that it doesn't interfere with readability
- [ ] Update `app/(auth)/sign-in/[[...sign-in]]/page.tsx` to use the animated gradient background
- [ ] Update `app/(auth)/sign-up/[[...sign-up]]/page.tsx` to use the animated gradient background
- [ ] Replace `bg-gray-950` with `bg-background` on auth pages
- [ ] Respects `prefers-reduced-motion` — shows static gradient (no animation)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Add beam/particle effect behind dashboard hero card
**Description:** As a user, I want a subtle ambient effect behind my net worth card so the hero section feels premium and alive.

**Acceptance Criteria:**
- [ ] Create `components/effects/hero-beams.tsx` — a subtle beam/particle effect component
- [ ] Effect renders behind the hero net worth card as a background layer
- [ ] Visual: 3-5 thin, semi-transparent beams of accent purple light that slowly drift upward and fade
- [ ] Beams are barely visible (~10-15% opacity) — atmospheric, not distracting
- [ ] Implementation options (choose simplest that looks good):
  - CSS `@keyframes` with pseudo-elements (::before, ::after) for beams
  - Canvas-based particle system (if CSS is insufficient)
  - SVG lines with Framer Motion animation
- [ ] Effect contained within the hero card area — does not bleed into other sections
- [ ] Effect does not interfere with card content (pointer-events: none)
- [ ] Performance: must not cause jank or high CPU usage (aim for <5% GPU usage)
- [ ] Respects `prefers-reduced-motion` — hides effect entirely
- [ ] Update `components/dashboard/net-worth-hero.tsx` to include the beam effect behind the card
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Redesign error page with ambient gradient
**Description:** As a user, I want a helpful, branded error page so when something goes wrong I know what to do and the app still feels premium.

**Acceptance Criteria:**
- [ ] Redesign `app/error.tsx`:
  - Animated gradient background (using `AnimatedGradient` component, "error" variant — uses destructive red tints instead of purple)
  - Large icon: `AlertTriangle` or `ServerCrash` from Lucide, in `text-destructive`, 64px
  - Title: "Something went wrong" in `text-heading-lg text-foreground`
  - Description: generic error message in `text-muted-foreground text-body-md`
  - In development: show the error message in a collapsible details section (`bg-muted rounded-lg p-4 font-mono text-body-sm`)
  - Helpful action buttons:
    - "Try Again" — calls `reset()` function (current behaviour preserved), primary button
    - "Go to Dashboard" — links to `/`, secondary button
- [ ] Entrance animation: icon and text fade in + slide up (staggered, 80ms between elements)
- [ ] Card container: `bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8` for content area
- [ ] Centred on page both horizontally and vertically
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Redesign 404 page with ambient gradient
**Description:** As a user, I want a helpful 404 page so when I land on a missing page I can easily navigate somewhere useful.

**Acceptance Criteria:**
- [ ] Redesign `app/not-found.tsx`:
  - Animated gradient background (using `AnimatedGradient` component, "auth" variant — purple tints)
  - Large "404" text in `text-display-xl text-accent/30` (very large, decorative)
  - Title: "Page not found" in `text-heading-lg text-foreground`
  - Description: "The page you're looking for doesn't exist or has been moved." in `text-muted-foreground`
  - Helpful links:
    - "Go to Dashboard" — primary button, links to `/`
    - "View Holdings" — secondary button, links to `/holdings`
    - "View Transactions" — secondary button, links to `/transactions`
- [ ] Entrance animation: "404" scales in from 0.8 → 1.0, title and buttons stagger in below (80ms delay)
- [ ] Card container: `bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8`
- [ ] Centred on page both horizontally and vertically
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Add skip-to-content link
**Description:** As a keyboard user, I want a skip link so I can bypass the navigation and jump directly to the main content.

**Acceptance Criteria:**
- [ ] Create `components/shared/skip-link.tsx`
- [ ] Visually hidden by default (off-screen positioning)
- [ ] Becomes visible on focus (keyboard Tab): appears at top of page with `bg-accent text-foreground` styling
- [ ] Text: "Skip to main content"
- [ ] On click/Enter: moves focus to the main content area (using `id="main-content"` anchor)
- [ ] Add `id="main-content"` to the main content container in `app/(dashboard)/layout.tsx`
- [ ] Add the `SkipLink` component to `app/layout.tsx` (renders before everything else)
- [ ] Styled with design tokens: `bg-accent text-accent-foreground rounded-md px-4 py-2 text-body-sm font-medium`
- [ ] Position: `fixed top-4 left-4 z-[100]` when visible
- [ ] Typecheck passes (`npm run build`)

### US-006: Audit and fix focus-visible ring states
**Description:** As a developer, I want all interactive elements to have consistent, visible focus rings for keyboard accessibility.

**Acceptance Criteria:**
- [ ] Add a global focus-visible utility in `app/globals.css`:
  - Default focus-visible ring: `ring-2 ring-accent ring-offset-2 ring-offset-background`
  - Applied to: buttons, links, inputs, selects, textareas, checkboxes, switches, tabs
- [ ] Audit all custom interactive components for proper focus-visible states:
  - `components/ui/button.tsx` — verify focus ring
  - `components/ui/input.tsx` — verify focus ring
  - `components/ui/select.tsx` — verify focus ring
  - `components/ui/switch.tsx` — verify focus ring
  - `components/ui/dialog.tsx` — verify focus trap works
  - Nav items (sidebar links) — verify focus ring
  - Speed-dial FAB buttons — verify focus ring
  - Filter tabs — verify focus ring
  - Table rows (clickable) — verify focus ring
- [ ] Focus ring must not clip or be hidden by `overflow: hidden` containers
- [ ] Focus ring colour uses `--accent` token for consistency with the design system
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Audit and add ARIA labels
**Description:** As a developer, I want all interactive elements to have appropriate ARIA labels for screen reader accessibility.

**Acceptance Criteria:**
- [ ] Audit all interactive elements and add missing ARIA attributes:
  - Icon-only buttons: `aria-label` describing the action (e.g., refresh button → `aria-label="Refresh prices"`)
  - Toggle buttons: `aria-pressed` state (e.g., dormant toggle, native currency toggle)
  - Expandable sections: `aria-expanded` state on trigger, `aria-controls` linking to content
  - Filter tabs: `role="tablist"` on container, `role="tab"` on each tab, `aria-selected` on active tab
  - Dialogs/modals: verify `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on title
  - Progress bars: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - Loading states: `aria-busy="true"` on containers loading data
  - Toast notifications: verify `role="status"` or `role="alert"`
  - Charts: `aria-label` describing the chart content (e.g., "Net worth growth over time")
- [ ] No interactive element should be missing an accessible name
- [ ] Typecheck passes (`npm run build`)

### US-008: Verify and fix touch targets
**Description:** As a mobile user, I want all buttons and interactive elements to be large enough to tap accurately.

**Acceptance Criteria:**
- [ ] Audit all interactive elements for minimum 44×44px touch target size:
  - Buttons: verify min height 44px on mobile (add `min-h-[44px]` where needed)
  - Icon buttons: verify min 44×44px (add padding if icon is smaller)
  - Table row action buttons (Edit/Delete): verify touch target size
  - Filter tabs: verify each tab has adequate tap area
  - Toggle switches: verify adequate tap area
  - Nav items (mobile drawer): verify adequate tap area
  - Speed-dial action buttons: verify tap area (currently w-11 h-11 = 44px, good)
  - Dropdown triggers: verify height
- [ ] Touch targets must not overlap — adequate spacing between adjacent interactive elements
- [ ] Small buttons on desktop can use responsive sizing: `min-h-[44px] sm:min-h-0` to enforce mobile minimum only
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Verify keyboard navigation across all pages
**Description:** As a keyboard user, I want to navigate the entire app using only my keyboard.

**Acceptance Criteria:**
- [ ] Verify keyboard navigation works on each page:
  - **Dashboard**: Tab through all sections, enter on clickable cards, Escape on modals
  - **Holdings**: Tab through filter tabs (arrow keys to switch), Tab to table rows, Enter to navigate to detail
  - **Holding detail**: Tab through action buttons, edit/delete triggers
  - **Transactions**: Tab through filters, summary cards, table rows
  - **Snapshots**: Tab through table, edit/delete triggers
  - **Import**: Tab through file upload, preview, import button
  - **Export**: Tab through export cards and buttons
  - **Settings**: Tab through sections, toggles, selectors
- [ ] Arrow key navigation on tab components (filter tabs, type selector, time range selector, currency toggle)
- [ ] Escape key closes all modals and dialogs
- [ ] Enter key triggers the primary action in modals (Save, Confirm, etc.)
- [ ] Tab order follows visual layout (no unexpected jumps)
- [ ] Focus is restored to the trigger element when modals/dialogs close
- [ ] Focus is trapped within open modals (Tab doesn't escape to background content)
- [ ] Typecheck passes (`npm run build`)

### US-010: Verify colour contrast meets WCAG AA
**Description:** As a developer, I want to verify that all text and UI elements meet WCAG AA colour contrast ratios.

**Acceptance Criteria:**
- [ ] Verify contrast ratios for key colour combinations used across the app:
  - `text-foreground` on `bg-background`: must be >= 4.5:1 for body text
  - `text-foreground` on `bg-card`: must be >= 4.5:1 for body text
  - `text-muted-foreground` on `bg-background`: must be >= 4.5:1 for body text (or >= 3:1 for large text)
  - `text-muted-foreground` on `bg-card`: must be >= 4.5:1 for body text
  - `text-positive` on `bg-background`: must be >= 4.5:1
  - `text-destructive` on `bg-background`: must be >= 4.5:1
  - `text-warning` on `bg-background`: must be >= 4.5:1
  - `text-accent` on `bg-background`: must be >= 4.5:1
  - Badge text on badge backgrounds (e.g., `text-positive` on `bg-positive/10`): must be >= 4.5:1
- [ ] If any combination fails, adjust the design token value to meet the ratio while preserving the colour intent
- [ ] Document verified contrast ratios in a comment block in `app/globals.css` near the token definitions
- [ ] Typecheck passes (`npm run build`)

### US-011: Integrate axe-core for automated accessibility testing
**Description:** As a developer, I want automated accessibility testing so we catch regressions before they reach production.

**Acceptance Criteria:**
- [ ] Install `@axe-core/react` as a dev dependency
- [ ] Configure axe-core to run in development mode only:
  - Add to `app/layout.tsx` (or a dev-only provider): conditionally import and initialise axe-core when `process.env.NODE_ENV === "development"`
  - Axe violations logged to the browser console as warnings
- [ ] Alternatively, if `@axe-core/react` causes issues with Next.js App Router, use `axe-core` directly with a `useEffect` that runs `axe.run()` on the document body after mount
- [ ] Verify no critical or serious axe violations on:
  - Dashboard page
  - Holdings list page
  - Transactions page
  - Settings page
- [ ] Document the axe-core setup in a brief comment in the integration file
- [ ] Typecheck passes (`npm run build`)

### US-012: Add favicon, Open Graph meta tags, and manifest
**Description:** As a user, I want the app to have proper branding in browser tabs, social shares, and when added to my home screen.

**Acceptance Criteria:**
- [ ] Create app icon:
  - `app/icon.svg` — SVG favicon (purple hammer/lightning bolt on dark background, matching Mjolnir branding)
  - `app/apple-icon.png` — 180×180px Apple touch icon
  - `public/icon-192.png` — 192×192px for PWA
  - `public/icon-512.png` — 512×512px for PWA splash
- [ ] Update `app/layout.tsx` metadata:
  - `title`: "Mjolnir — Net Worth Tracker"
  - `description`: "Personal net worth tracking dashboard"
  - `themeColor`: "#09090b" (background colour for browser chrome)
  - `openGraph`: title, description, type ("website"), images (use icon)
  - `twitter`: card ("summary"), title, description
  - `manifest`: link to `/manifest.json`
- [ ] Create `public/manifest.json`:
  - `name`: "Mjolnir"
  - `short_name`: "Mjolnir"
  - `start_url`: "/"
  - `display`: "standalone"
  - `background_color`: "#09090b"
  - `theme_color`: "#8b5cf6"
  - `icons`: 192px and 512px variants
- [ ] Verify favicon appears in browser tab
- [ ] Verify Open Graph tags render in social media preview (use a preview tool or browser dev tools)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-013: Final cross-page consistency check
**Description:** As a developer, I want to verify that all pages and components are cohesive after all 12 UX epics.

**Acceptance Criteria:**
- [ ] Visual consistency audit across all pages:
  - All cards use `rounded-2xl` consistently
  - All cards use `bg-card border border-border` consistently
  - All section titles use `text-label` typography consistently
  - All body text uses `text-body-sm` or `text-body-md` consistently
  - All muted text uses `text-muted-foreground` consistently
  - All positive values use `text-positive` consistently
  - All negative values use `text-destructive` consistently
  - All warning indicators use `text-warning` consistently
- [ ] Animation consistency:
  - All page transitions use the same pattern (fade, 200ms)
  - All card entrances use `fadeIn` or `staggerItem` presets
  - All expand/collapse uses the same easing (ease-out, 200ms)
  - All modals use `AnimatedDialog` with consistent enter/exit
  - `prefers-reduced-motion` disables all animations consistently
- [ ] Spacing consistency:
  - `gap-6` between major sections
  - `p-4 sm:p-6` padding on cards
  - Consistent margin between page title and content
- [ ] Document any remaining inconsistencies found and fix them
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The animated gradient background must not increase page load time by more than 50ms — use CSS animations, not JavaScript-driven frame loops
- FR-2: The hero beam effect must be GPU-accelerated (use `transform` and `opacity` only, avoid `width`/`height`/`top`/`left` animations)
- FR-3: The skip-to-content link must work with screen readers — it must be the first focusable element in the DOM
- FR-4: Focus-visible rings must only appear on keyboard navigation (`:focus-visible`), not on mouse click (`:focus`)
- FR-5: ARIA labels must be descriptive and unique — two buttons on the same page must not have the same `aria-label`
- FR-6: Touch target audit applies to mobile viewport only — desktop can have smaller targets
- FR-7: Axe-core must only run in development mode — no impact on production bundle size or performance
- FR-8: The manifest.json must include both 192px and 512px icon sizes for PWA compatibility
- FR-9: The animated gradient on auth pages must not interfere with Clerk's embedded components
- FR-10: The error page must preserve the `reset()` function behaviour — clicking "Try Again" must re-attempt the failed operation

## Non-Goals

- No full PWA with offline support (manifest is for home screen icon only)
- No service worker registration
- No automated Lighthouse CI pipeline (manual audit only)
- No i18n/localisation (English only)
- No right-to-left (RTL) layout support
- No high-contrast mode beyond WCAG AA compliance
- No animated illustrations or Lottie files
- No sound effects or haptic feedback
- No dark/light mode toggle (dark mode only, as per project constraints)

## Design Considerations

- **Auth gradient**: Slow-moving, dreamlike. Think of a night sky with barely visible aurora. The gradient should feel like ambience, not a screensaver. Purple (#8b5cf6) and blue (#3b82f6) at very low opacity on the #09090b background.
- **Hero beams**: Extremely subtle. Thin vertical lines of purple light that slowly drift upward, like light streaming through gaps. They should be visible only on close inspection — the hero card's glow effect (from UX-6) is the primary visual, beams are secondary.
- **Error page gradient**: Uses red/destructive tints instead of purple — creates a "warning" atmosphere while still feeling branded. Muted enough to not be alarming.
- **404 page**: The large "404" text is decorative — very low opacity, fills the background as a visual anchor. The actual helpful content sits in a card above it.
- **Focus rings**: Ring offset creates separation from the element, making the ring clearly visible on dark backgrounds. Using `ring-accent` ties focus states to the brand colour.

## Technical Considerations

- **CSS animated gradient**: Use `background: linear-gradient(...)` with `background-size: 400% 400%` and `@keyframes gradient { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }` with `animation: gradient 15s ease infinite`. This is pure CSS, zero JavaScript, and GPU-accelerated.
- **Hero beams**: If using CSS pseudo-elements, create 3-5 `::before` / `::after` elements with `height: 100%`, `width: 1px`, thin gradient fills, and slow `translateY` animation. If CSS pseudo-element count is limiting, use a single `<div>` with SVG background pattern.
- **Axe-core integration**: `@axe-core/react` wraps React's `createElement` to audit components. For Next.js App Router, this may need to be loaded dynamically. Alternative: use `axe-core` directly in a `useEffect` that calls `axe.run(document.body)` and logs results.
- **Focus-visible**: Modern browsers support `:focus-visible` natively. Tailwind's `focus-visible:ring-*` utilities work out of the box. Ensure the Tailwind config includes `ringColor` and `ringOffsetColor` tokens.
- **Touch target audit**: Use browser DevTools device emulation to verify touch targets. The Chrome DevTools "Rendering" panel has a "Show hit test regions" option that helps visualise tap areas.
- **Manifest**: Next.js App Router supports `app/manifest.ts` or `app/manifest.json` as a convention. Using the TypeScript version allows type-safe manifest generation.
- **Icon generation**: Create the base SVG icon, then use an online tool or sharp/jimp to generate PNG variants at 180px, 192px, and 512px.

## Success Metrics

- Auth pages have a premium animated gradient background
- Dashboard hero card has a subtle ambient beam effect
- Error and 404 pages are branded, helpful, and animated
- Skip-to-content link works for keyboard users
- All interactive elements have visible focus rings on keyboard navigation
- All interactive elements have appropriate ARIA labels
- All interactive elements meet 44×44px touch target on mobile
- Full keyboard navigation works across all pages without issues
- All colour combinations meet WCAG AA contrast ratios
- Axe-core runs in development with no critical violations
- Favicon appears in browser tab, social previews show correct metadata
- App can be added to mobile home screen via manifest
- `npm run build` and `npm run lint` pass cleanly
- Visual consistency across all pages after all 12 UX epics

## Open Questions

- None — scope is well-defined.
