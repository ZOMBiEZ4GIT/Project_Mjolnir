# PRD: UX-1 — Design System Foundation

## Introduction

Establish the visual foundation for Mjolnir — colours, typography, spacing, shadows, and animation primitives that all subsequent UI work builds upon. The app currently uses the default shadcn/ui CSS variable pattern with generic zinc/grey values hardcoded across layouts. This epic replaces those defaults with a purposeful Mjolnir design system: deep blacks, purple accents, semantic colour tokens, and reusable animation presets.

The design system must coexist with the existing shadcn/ui component library (which reads from CSS variables) while adding Mjolnir-specific tokens for glows, semantic colours (positive/negative), and extended typography.

## Goals

- Replace all default/hardcoded colour values with Mjolnir design tokens
- Establish a consistent typography scale (display, heading, body, label)
- Define spacing rhythm on an 8pt grid
- Create shadow and glow effect utilities for the premium fintech aesthetic
- Install Framer Motion and create core animation presets
- Ensure all animations respect `prefers-reduced-motion`
- Create a demo page that visually verifies the design system works end-to-end
- Provide a foundation that subsequent UX epics (UX-2 through UX-12) can build on without ad-hoc styling decisions

## User Stories

### US-001: Configure Mjolnir colour palette in CSS variables
**Description:** As a developer, I want all Mjolnir colours defined as CSS variables so that shadcn/ui components and custom components both pull from the same source of truth.

**Acceptance Criteria:**
- [ ] Update `app/globals.css` to replace default `.dark` CSS variable values with Mjolnir palette
- [ ] Background: `#09090b` (zinc-950) as `--background`
- [ ] Card surface: `#18181b` (zinc-900) as `--card`
- [ ] Elevated surface: `#27272a` (zinc-800) — used for hover states, borders
- [ ] Primary/accent mapped to violet-500 (`#8b5cf6`)
- [ ] Destructive mapped to red-500 (`#ef4444`)
- [ ] Add new Mjolnir-specific CSS variables: `--positive` (green-500 `#22c55e`), `--negative` (red-500 `#ef4444`), `--accent-glow` (rgba violet for box-shadows)
- [ ] Remove the `:root` (light mode) block or make it identical to `.dark` — this app is dark-mode only
- [ ] All existing shadcn/ui components continue to render correctly with new values
- [ ] Typecheck passes (`npm run build`)

### US-002: Extend Tailwind theme with Mjolnir tokens
**Description:** As a developer, I want Tailwind classes that map to the Mjolnir design tokens so I can use `bg-background`, `text-positive`, `shadow-glow-md`, etc. without raw hex values.

**Acceptance Criteria:**
- [ ] Update `tailwind.config.ts` to add semantic colour mappings: `positive`, `positive-foreground`, `negative`, `negative-foreground` — all referencing CSS variables
- [ ] Add glow box-shadow utilities: `shadow-glow-sm`, `shadow-glow-md`, `shadow-glow-lg`, `shadow-glow-positive`, `shadow-glow-negative`
- [ ] Add card shadow utilities: `shadow-card`, `shadow-card-hover`
- [ ] No raw hex values in tailwind.config.ts — all reference CSS variables or rgba values
- [ ] Typecheck passes (`npm run build`)

### US-003: Set up typography scale
**Description:** As a developer, I want a defined typography scale so all text across the app is consistent and hierarchical.

**Acceptance Criteria:**
- [ ] Add custom font sizes in `tailwind.config.ts` under `theme.extend.fontSize`:
  - `display-xl`: 4rem/1, weight 700, tracking -0.02em (net worth hero number)
  - `display-lg`: 3rem/1.1, weight 700, tracking -0.02em
  - `display-md`: 2.25rem/1.2, weight 600, tracking -0.01em
  - `heading-lg`: 1.5rem/1.3, weight 600
  - `heading-md`: 1.25rem/1.4, weight 600
  - `heading-sm`: 1rem/1.5, weight 600
  - `body-lg`: 1rem/1.6, weight 400
  - `body-md`: 0.875rem/1.5, weight 400
  - `body-sm`: 0.75rem/1.5, weight 400
  - `label`: 0.75rem/1, weight 500, tracking 0.05em
- [ ] Verify Inter font is loaded (already in Next.js via `next/font`)
- [ ] Typecheck passes (`npm run build`)

### US-004: Define spacing rhythm and layout constants
**Description:** As a developer, I want consistent spacing and layout constants so the app follows an 8pt grid system.

**Acceptance Criteria:**
- [ ] Create `lib/theme.ts` exporting layout constants:
  - `sidebarWidth`: 240px
  - `rightPanelWidth`: 320px
  - `maxContentWidth`: 1400px
  - `cardRadius`: 16px (rounded-2xl)
  - `buttonRadius`: 8px (rounded-lg)
  - `inputRadius`: 8px (rounded-lg)
- [ ] Export spacing constants: `xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`, `2xl: 48px`
- [ ] Constants are typed and exported for use in both Tailwind classes and inline styles
- [ ] Typecheck passes (`npm run build`)

### US-005: Install Framer Motion and create animation presets
**Description:** As a developer, I want reusable animation presets so animations are consistent and easy to apply across components.

**Acceptance Criteria:**
- [ ] Install `framer-motion` as a dependency
- [ ] Create `lib/animations.ts` exporting the following presets:
  - `fadeIn`: opacity 0→1, duration 0.2s
  - `slideUp`: opacity 0→1, y 20→0, duration 0.3s, easeOut
  - `scaleIn`: opacity 0→1, scale 0.95→1, duration 0.2s
  - `staggerContainer`: staggerChildren 0.05s
  - `staggerItem`: opacity 0→1, y 10→0
  - `numberSpring`: spring config (stiffness 100, damping 15)
- [ ] Each preset exports `initial`, `animate`, `exit`, and `transition` properties as needed
- [ ] Presets are typed with Framer Motion types (`Variants`, `Transition`, etc.)
- [ ] Typecheck passes (`npm run build`)

### US-006: Create reduced motion hook
**Description:** As a user with motion sensitivity, I want animations disabled or reduced when I've enabled that preference in my OS.

**Acceptance Criteria:**
- [ ] Create `hooks/use-reduced-motion.ts` that re-exports Framer Motion's `useReducedMotion`
- [ ] Create `hooks/use-animation-config.ts` that returns animation props conditionally:
  - When `prefers-reduced-motion` is enabled: `initial: false`, `transition: { duration: 0 }`
  - When disabled: returns standard animation props (e.g., slideUp)
- [ ] Hook accepts an optional animation preset parameter to customize which preset is used
- [ ] Typecheck passes (`npm run build`)

### US-007: Remove hardcoded colour values from existing layouts
**Description:** As a developer, I want all existing layout files to use design tokens instead of hardcoded Tailwind colour classes so the design system is the single source of truth.

**Acceptance Criteria:**
- [ ] Update `app/layout.tsx`: replace `bg-gray-950` with `bg-background`, replace `text-white` with `text-foreground`
- [ ] Update `app/(dashboard)/layout.tsx`: replace all `bg-gray-900`, `border-gray-800`, `text-gray-*` etc. with semantic token classes (`bg-card`, `border-border`, `text-muted-foreground`, etc.)
- [ ] Scan all files in `components/` for hardcoded colour classes (`gray-*`, `zinc-*`, `violet-*`, etc.) and replace with design token equivalents
- [ ] No hardcoded colour classes remain outside of `tailwind.config.ts` and `globals.css`
- [ ] Visual appearance remains unchanged (colours should map to the same or very similar values)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Create design system demo page
**Description:** As a developer, I want a demo page that showcases all design tokens so I can verify the system works and use it as a reference.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/design-system/page.tsx` (protected route)
- [ ] Demo page displays:
  - Colour palette: all background, accent, positive, negative, and text colours as swatches with labels
  - Typography scale: each size rendered with its name and specs
  - Shadow/glow effects: cards showing each shadow variant
  - Animation presets: buttons or cards that trigger each animation on click
  - Spacing: visual representation of the 8pt grid spacings
- [ ] Page uses only design token classes (no hardcoded values)
- [ ] Page is wrapped in a Framer Motion stagger container so elements animate in on load
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: All colours must be defined as CSS custom properties in `app/globals.css` and consumed via Tailwind's `hsl(var(--name))` pattern
- FR-2: The Tailwind config must extend (not replace) the existing shadcn/ui colour structure to maintain backward compatibility
- FR-3: Glow effects must use `rgba()` values in `boxShadow` since CSS variables in HSL format cannot express alpha in box-shadow
- FR-4: Typography scale must use Tailwind's array syntax for fontSize: `['size', { lineHeight, fontWeight, letterSpacing }]`
- FR-5: Animation presets must be importable as plain objects, not React components, so they can be spread onto `motion.div` elements
- FR-6: The `useAnimationConfig` hook must check `prefers-reduced-motion` on every render (not just initial mount) to respond to OS setting changes
- FR-7: The demo page must be accessible at `/design-system` within the dashboard layout

## Non-Goals

- No component library installation in this epic (Aceternity, Magic UI, Hover.dev, etc. — installed when needed in later epics)
- No redesign of existing components — only replace hardcoded colour classes with tokens
- No extended animation presets (modal animations, page transitions — added in UX-10)
- No new UI components beyond the demo page
- No light mode support — dark mode only

## Design Considerations

- **Existing pattern**: The app already uses shadcn/ui's CSS variable approach (`hsl(var(--background))`). The design system extends this rather than replacing it.
- **Colour format**: CSS variables store HSL values without the `hsl()` wrapper (e.g., `--background: 240 10% 3.9%`). Tailwind config wraps them: `hsl(var(--background))`. Glow shadows use direct rgba since HSL variables can't express box-shadow alpha cleanly.
- **Font**: Inter is already available via `next/font/google`. The typography scale just defines sizes/weights.

## Technical Considerations

- **Framer Motion**: Install version 11.x (latest stable). It supports React 18+ and Next.js App Router. Use `"use client"` directive on any component using Framer Motion hooks or `motion` components.
- **CSS variable naming**: Follow shadcn/ui convention — `--background`, `--foreground`, `--card`, `--primary`, etc. Add custom ones with clear naming: `--positive`, `--negative`, `--accent-glow`.
- **Bundle impact**: Framer Motion adds ~30-40KB gzipped. Tree-shaking is effective — only import `motion`, `AnimatePresence`, and `useReducedMotion`.
- **Backward compatibility**: Existing components using `bg-primary`, `text-muted-foreground`, etc. must continue working. The CSS variable values change, but the class names stay the same.

## Success Metrics

- Zero hardcoded colour classes in layout and component files
- All design token classes resolve to correct Mjolnir palette values
- Demo page renders all tokens correctly
- `prefers-reduced-motion: reduce` disables all animations on the demo page
- `npm run build` and `npm run lint` pass cleanly

## Open Questions

- None — scope is well-defined based on the UI/UX plan and clarifying answers.
