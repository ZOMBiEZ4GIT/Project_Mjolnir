# PRD: UX-9 — Multi-Currency Display

## Introduction

Polish the multi-currency experience across the entire app so switching currencies feels instantaneous and delightful. The dashboard header gets animated toggle pills (AUD | NZD | USD) with a sliding indicator for quick switching, while the settings page retains a polished dropdown with flag icons. All currency values animate via NumberTicker when the display currency changes, accompanied by a brief flash across affected values. The FX rates display gets design token treatment with a relative timestamp. The currency exposure section gets animated progress bars, stagger animations, and hover effects. Native currency display is enhanced with clear tooltips showing both converted and original values.

## Goals

- Replace the dashboard currency selector with animated toggle pills (sliding indicator)
- Polish the settings page currency selector with flag icons and design tokens
- Animate all currency values with NumberTicker when display currency changes
- Add a brief flash on currency values when they update from a currency switch
- Polish FX rates display with design tokens and relative timestamp
- Animate the currency exposure section (progress bars, stagger, hover)
- Enhance native currency display with clear tooltips
- Polish the native currency toggle with design tokens
- Apply design tokens to all currency-related components

## User Stories

### US-001: Create animated currency toggle pills for dashboard header
**Description:** As a user, I want a quick, visual currency switcher in the dashboard header so I can toggle between AUD, NZD, and USD with one click.

**Acceptance Criteria:**
- [ ] Create `components/ui/currency-toggle.tsx` — horizontal pill toggle with options: AUD, NZD, USD
- [ ] Active pill has a sliding background indicator using Framer Motion `layoutId="currency-indicator"`
- [ ] Active pill: `bg-accent/20 text-foreground` with sliding pill background
- [ ] Inactive pills: `text-muted-foreground` with `hover:text-foreground`
- [ ] Each pill shows flag emoji + currency code: 🇦🇺 AUD, 🇳🇿 NZD, 🇺🇸 USD
- [ ] Indicator slides smoothly between options (200ms, ease-in-out)
- [ ] Compact size to fit in the dashboard header alongside FX rates and refresh button
- [ ] On selection: calls `setDisplayCurrency()` from `useCurrency()` context (optimistic update)
- [ ] Replace the existing `CurrencySelector` dropdown in `components/dashboard/dashboard-header.tsx` with this component
- [ ] Respects `prefers-reduced-motion` — instant switch, no slide
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-002: Polish settings page currency selector
**Description:** As a user, I want a polished currency dropdown on the settings page with flag icons and clear labels.

**Acceptance Criteria:**
- [ ] Update `CurrencySelector` component (`components/ui/currency-selector.tsx`) for use on settings page
- [ ] Each option shows: flag emoji + currency code + full name (e.g., "🇦🇺 AUD — Australian Dollar")
- [ ] Selected value in the trigger shows: flag emoji + currency code (e.g., "🇦🇺 AUD")
- [ ] Dropdown uses design tokens: `bg-card`, `border-border`, `text-foreground`
- [ ] Selected item has accent highlight: `bg-accent/10`
- [ ] Dropdown opens with a subtle scale animation (scale 0.95 → 1.0, 150ms)
- [ ] Replace any hardcoded `bg-gray-*`, `border-gray-*`, `text-gray-*` with design tokens
- [ ] Keep the `compact` prop — compact mode shows just the code (for any other usage), full mode shows the enhanced display
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-003: Animate currency values on display currency change
**Description:** As a user, I want to see values animate when I switch currencies so the update feels responsive and I can see numbers adjusting.

**Acceptance Criteria:**
- [ ] When `displayCurrency` changes via the toggle or selector:
  - All `CurrencyDisplay` components re-render with the new converted values
  - Values animate using `NumberTicker` (morphing from old value to new, 400ms)
  - A brief flash highlights each updated value (same flash component from UX-8 US-001)
  - Flash colour: `bg-accent/15` (neutral purple, since it's neither gain nor loss — just a conversion)
- [ ] Update `CurrencyDisplay` (`components/ui/currency-display.tsx`) to use `NumberTicker` for the amount
- [ ] NumberTicker only activates on value changes, not on initial render (initial render shows value instantly)
- [ ] Currency symbol prefix (A$, NZ$, US$) crossfades when it changes (150ms, `AnimatePresence`)
- [ ] Performance: `CurrencyDisplay` is used across many components — ensure NumberTicker uses the lightweight spring approach (not per-digit)
- [ ] Flash animation on currency change is coordinated — all visible values flash simultaneously
- [ ] Respects `prefers-reduced-motion` — values update instantly, no flash or animation
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-004: Enhance native currency tooltip display
**Description:** As a user, I want clear tooltips showing both the converted and native currency values so I understand the conversion.

**Acceptance Criteria:**
- [ ] Update `CurrencyDisplay` component to show an enhanced tooltip when `showNative` is true and currencies differ:
  - Tooltip content: "Converted from [native amount] [native currency]" (e.g., "Converted from US$1,234.56 USD")
  - Tooltip also shows the exchange rate used: "Rate: 1 USD = 1.5320 AUD"
  - Tooltip styled with design tokens: `bg-card border border-border rounded-lg p-2 shadow-lg`
- [ ] Native currency indicator in parentheses: `text-muted-foreground text-body-sm`
- [ ] When `showNativeCurrency` is OFF (from context): no parenthetical, no tooltip — just the converted value
- [ ] When `showNativeCurrency` is ON and currencies are the same: no parenthetical, no tooltip (no conversion occurred)
- [ ] Uses shadcn/ui `Tooltip` component
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-005: Polish native currency toggle
**Description:** As a user, I want the native currency toggle to feel polished and clearly communicate what it does.

**Acceptance Criteria:**
- [ ] Update `NativeCurrencyToggle` (`components/ui/native-currency-toggle.tsx`):
  - Switch uses design tokens for track and thumb colours
  - Active state: accent-coloured track (`bg-accent`)
  - Inactive state: muted track (`bg-muted`)
  - Label: "Show native currencies" in `text-body-sm text-muted-foreground`
  - Optional description text below: "Display original currency values alongside converted amounts"
- [ ] When toggled ON: all `CurrencyDisplay` components with different native currencies show parenthetical values
- [ ] Toggle change triggers a brief flash on affected values (same as currency switch, `bg-accent/15`, 400ms)
- [ ] Replace any hardcoded colour classes with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-006: Polish FX rates display with design tokens
**Description:** As a user, I want the FX rates display to look polished and show me when rates were last updated.

**Acceptance Criteria:**
- [ ] Update `FxRatesDisplay` (`components/ui/fx-rates-display.tsx`):
  - Compact mode (header): icon uses `text-muted-foreground`, tooltip shows rates with design token styling
  - Tooltip content: two rate rows ("1 USD = X.XXXX AUD", "1 NZD = X.XXXX AUD") + relative timestamp ("Updated 5 min ago")
  - Tooltip styled with: `bg-card border border-border rounded-lg p-3 shadow-lg`
  - Rate values use `text-foreground`, labels use `text-muted-foreground`
  - Relative timestamp: `text-body-sm text-muted-foreground` with `Clock` icon
- [ ] Stale rates indicator: if rates are stale (>TTL), icon changes to amber (`text-warning`) and tooltip shows "Rates may be outdated" message
- [ ] Inline mode (if used elsewhere): full card display with design tokens
- [ ] Add relative timestamp that auto-updates every 30 seconds (same pattern as `PriceTimestamp` from UX-8)
- [ ] Replace all hardcoded `text-gray-*`, `bg-gray-*`, `border-gray-*` with design tokens
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-007: Animate currency exposure progress bars
**Description:** As a user, I want the currency exposure section to animate smoothly so it feels premium.

**Acceptance Criteria:**
- [ ] Update `CurrencyExposure` (`components/dashboard/currency-exposure.tsx`):
  - Progress bars animate from 0% width to target percentage on mount (400ms, ease-out)
  - Progress bar fill uses Framer Motion `animate` with `width` property
  - Rows stagger in on mount (50ms delay per row)
  - Each row fades in using `staggerItem` preset
- [ ] Row hover effect: `bg-accent/5` background with 150ms transition
- [ ] Progress bar colours use design tokens or named constants (not hardcoded hex):
  - AUD: `text-positive` / green
  - NZD: blue (`text-blue-400` or info token)
  - USD: amber (`text-warning`)
- [ ] Percentage labels animate with NumberTicker on currency change (values recalculate)
- [ ] Value amounts animate with NumberTicker on currency change
- [ ] Entrance animation: `fadeIn` preset on the entire card
- [ ] Respects `prefers-reduced-motion`
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-008: Polish currency exposure card with design tokens
**Description:** As a developer, I want the currency exposure card using design system tokens throughout.

**Acceptance Criteria:**
- [ ] Update `CurrencyExposure` card styling:
  - Card container: `bg-card border border-border rounded-2xl p-4 sm:p-6`
  - Section title: `text-label` typography
  - Currency name: `text-foreground text-body-sm font-medium`
  - Holdings count: `text-muted-foreground text-body-sm`
  - Value: `text-foreground`
  - Percentage: `text-muted-foreground text-body-sm`
  - Progress bar track: `bg-muted rounded-full`
  - Flag emojis preserved as-is
- [ ] Replace all hardcoded `bg-gray-*`, `text-gray-*`, `border-gray-*` classes
- [ ] Skeleton loading state uses `bg-muted animate-pulse` (not hardcoded gray)
- [ ] Error state uses design tokens
- [ ] Visual appearance preserved or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-009: Polish currency filter dropdown on holdings page
**Description:** As a developer, I want the holdings currency filter using design tokens.

**Acceptance Criteria:**
- [ ] Update `CurrencyFilter` (`components/holdings/currency-filter.tsx`):
  - Dropdown trigger: `bg-card border border-border text-foreground`
  - Options: `bg-card hover:bg-accent/10 text-foreground`
  - Selected option: `bg-accent/10 text-foreground`
  - Add flag emojis to each option: "🇦🇺 AUD", "🇳🇿 NZD", "🇺🇸 USD", "All Currencies"
  - Filter icon uses `text-muted-foreground`
- [ ] Replace all hardcoded `bg-gray-900`, `text-gray-*`, `border-gray-*` with design tokens
- [ ] Dropdown opens with subtle scale animation (same as settings selector, 150ms)
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

### US-010: Replace hardcoded colours across all currency components
**Description:** As a developer, I want all currency-related components using design system tokens.

**Acceptance Criteria:**
- [ ] Audit and update all currency-related UI:
  - `components/providers/currency-provider.tsx` (no visual, but verify toast messages use correct styling)
  - `components/ui/currency-selector.tsx`
  - `components/ui/currency-display.tsx`
  - `components/ui/native-currency-toggle.tsx`
  - `components/ui/fx-rates-display.tsx`
  - `components/holdings/currency-filter.tsx`
  - `components/dashboard/currency-exposure.tsx`
  - `app/(dashboard)/settings/page.tsx` (currency preferences section)
- [ ] Replace:
  - `text-white` → `text-foreground`
  - `text-gray-*` → `text-muted-foreground`
  - `bg-gray-*` → `bg-card`, `bg-muted`, or `bg-background`
  - `border-gray-*` → `border-border`
  - `text-green-*` → `text-positive`
  - `text-amber-*` / `text-yellow-*` → `text-warning`
- [ ] Visual appearance preserved or improved
- [ ] Typecheck passes (`npm run build`)
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The currency toggle pills must call `setDisplayCurrency()` which triggers an optimistic UI update — values change immediately before the API confirms
- FR-2: The `CurrencyDisplay` NumberTicker must only animate on value changes caused by currency switching or data refresh, not on unrelated re-renders
- FR-3: The currency symbol prefix (A$, NZ$, US$) must crossfade cleanly when switching — not flash or jump
- FR-4: The FX rates relative timestamp must auto-update every 30 seconds without causing re-renders in parent components
- FR-5: The native currency tooltip must show the actual exchange rate used for conversion, pulled from the currency context
- FR-6: Currency exposure progress bar animations must not cause layout shift — bar container has fixed height
- FR-7: The currency toggle pills and currency selector dropdown must stay in sync — changing one updates the other (both read from the same context)
- FR-8: The flash animation on currency change must coordinate across all visible `CurrencyDisplay` instances — all flash simultaneously, not sequentially
- FR-9: All currency components must handle the loading state gracefully (skeleton or placeholder while preferences/rates load)

## Non-Goals

- No historical exchange rate display or chart
- No currency conversion calculator tool
- No additional currencies beyond AUD, NZD, USD
- No per-holding currency override (holdings use their native currency)
- No changes to the exchange rate API or caching logic
- No changes to the preferences API
- No real-time FX rate streaming
- No currency-specific formatting locale changes (all use en-AU locale)

## Design Considerations

- **Currency toggle pills**: Same visual style as the time range selector (UX-7) and holdings filter tabs (UX-3) — horizontal pills with a sliding background indicator. Compact enough to fit in the dashboard header alongside the FX rates icon and refresh button. Flags add visual recognition without cluttering.
- **Value flash on currency change**: The flash uses accent purple (`bg-accent/15`) rather than green/red because a currency conversion is neither a gain nor a loss — it's a unit change. The flash is brief (400ms) and subtle (15% opacity).
- **Currency exposure bars**: Progress bars fill from left to right on mount, creating a satisfying "loading" effect. The stagger between rows (50ms) makes the section feel like it's revealing data sequentially.
- **Tooltips**: All tooltips use the same styling pattern — `bg-card border border-border rounded-lg shadow-lg` — for consistency across the app.
- **Settings vs dashboard**: The dashboard toggle pills are optimised for speed (one-click switching), while the settings dropdown is optimised for clarity (full labels, descriptions). Both control the same preference.

## Technical Considerations

- **Coordinated flash**: When `displayCurrency` changes in the context, all `CurrencyDisplay` components re-render. The flash can be triggered by detecting a `displayCurrency` change in the component (compare current vs previous via `useRef`). Since all components re-render from the same context change, flashes will naturally synchronise.
- **NumberTicker in CurrencyDisplay**: Use the lightweight spring approach (Framer Motion `useSpring` + `useTransform`). The `CurrencyDisplay` component is used extensively — it must not introduce performance issues. The spring animates the raw number, and `useTransform` formats it through `formatCurrency()`.
- **Currency symbol crossfade**: Wrap the currency symbol in `AnimatePresence` keyed by the currency code. When the key changes (e.g., "AUD" → "USD"), the old symbol fades out and the new one fades in. This is a tiny element, so the transition should be very fast (150ms).
- **Toggle pills in header**: The dashboard header already contains the refresh button and FX rates icon. The toggle pills replace the existing `CurrencySelector` dropdown, so total width should be similar or slightly larger. On mobile, the pills may need to be more compact (flags only, no text) or hidden behind a dropdown.
- **Context re-render optimisation**: The `CurrencyProvider` context change triggers re-renders in all consumers. This is acceptable since currency changes are infrequent (user-initiated). No `useMemo` optimisation needed unless performance profiling reveals issues.

## Success Metrics

- Currency toggle pills animate smoothly between AUD, NZD, USD
- All visible currency values animate with NumberTicker when currency changes
- Brief accent flash highlights updated values during currency switch
- FX rates tooltip shows rates with relative timestamp
- Currency exposure bars animate from 0% to target on mount
- Native currency tooltips show conversion details including rate used
- All hardcoded colours replaced with design tokens
- `npm run build` and `npm run lint` pass cleanly
- No performance degradation from NumberTicker in CurrencyDisplay components

## Open Questions

- None — scope is well-defined.
