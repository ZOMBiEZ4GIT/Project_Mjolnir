# Project Mjölnir — UI/UX Enhancement Plan

> **Phase**: Post-MVP Polish  
> **Prerequisite**: Core epics complete (data model, API, basic CRUD, authentication)  
> **Goal**: Transform functional dashboard into premium fintech experience using free animated component libraries

---

## 📋 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Free Resource Inventory](#free-resource-inventory)
3. [Design Tokens & Theming](#design-tokens--theming)
4. [Component Mapping](#component-mapping)
5. [Screen-by-Screen Implementation](#screen-by-screen-implementation)
6. [Animation Guidelines](#animation-guidelines)
7. [Implementation Phases](#implementation-phases)
8. [Performance Considerations](#performance-considerations)
9. [Accessibility Requirements](#accessibility-requirements)
10. [Quality Checklist](#quality-checklist)

---

## Design Philosophy

### Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Dark-first** | Deep blacks (#09090b) with subtle elevation via lighter greys |
| **Purple accent** | Violet (#8b5cf6) for interactive elements, glows, and highlights |
| **Motion with purpose** | Animations guide attention, not distract |
| **Data density** | Maximum information, minimum cognitive load |
| **Premium feel** | Subtle glows, smooth transitions, polished micro-interactions |

### Visual References

- **Layout**: Three-column dashboard (sidebar, main content, right panel)
- **Aesthetic**: Modern fintech/crypto trading platform
- **Inspiration**: Linear, Vercel, high-end trading dashboards

---

## Free Resource Inventory

### Animated Component Libraries (All FREE)

| Library | Components | Best For | URL |
|---------|------------|----------|-----|
| **Aceternity UI** | 100+ | Hero sections, backgrounds, glowing effects | [ui.aceternity.com](https://ui.aceternity.com) |
| **Magic UI** | 50+ | Subtle animations, shadcn companion | [magicui.design](https://magicui.design) |
| **Hover.dev** | 30+ free | Interactive cards, buttons, lists | [hover.dev/components](https://hover.dev/components) |
| **Animata** | 50+ | Micro-interactions, effects | [animata.design](https://animata.design) |
| **Eldora UI** | 40+ | Clean animated components | [eldoraui.site](https://eldoraui.site) |
| **UI Layout** | 30+ | Complex layouts, GSAP + Framer | [ui-layout.com](https://ui-layout.com) |
| **Cult UI** | 25+ | Multi-framework support | [cult-ui.com](https://cult-ui.com) |
| **Motion Primitives** | 20+ | Low-level animation blocks | [motion-primitives.com](https://motion-primitives.com) |
| **Lukacho UI** | 15+ | Minimal essentials | [ui.lukacho.com](https://ui.lukacho.com) |

### Data Visualisation (FREE)

| Library | Use Case | URL |
|---------|----------|-----|
| **Tremor** | KPI cards, donut charts, progress bars, bar lists | [tremor.so](https://tremor.so) |
| **TradingView Lightweight** | Net worth growth chart (area/line) | [tradingview.github.io/lightweight-charts](https://tradingview.github.io/lightweight-charts/) |
| **Recharts** | Backup/additional charts | [recharts.org](https://recharts.org) |

### Design Resources (FREE)

| Resource | What You Get | URL |
|----------|--------------|-----|
| **Figma Community** | Dark finance dashboard kits | [figma.com/community](https://figma.com/community) |
| **Lucide React** | Consistent icon set | [lucide.dev](https://lucide.dev) |
| **Google Fonts (Inter)** | Primary typeface | [fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter) |

### Recommended Figma Kits (FREE)

- [Dark Finance & Crypto Dashboard](https://www.figma.com/community/file/1522238618706669989)
- [Foxstocks Finance Dashboard (Dark)](https://www.figma.com/community/file/1369359008216990725)
- [Free Crypto Dashboard UI Kit](https://www.figma.com/community/file/1553868859015156218)

---

## Design Tokens & Theming

### Colour Palette

```typescript
// tailwind.config.ts - extend theme.colors

const mjolnirColors = {
  // Backgrounds
  background: {
    DEFAULT: '#09090b',      // Page background (zinc-950)
    card: '#18181b',         // Card surfaces (zinc-900)
    elevated: '#27272a',     // Hover states, borders (zinc-800)
    subtle: '#3f3f46',       // Disabled states (zinc-700)
  },
  
  // Purple accent (primary)
  accent: {
    DEFAULT: '#8b5cf6',      // Primary purple (violet-500)
    light: '#a78bfa',        // Hover state (violet-400)
    dark: '#7c3aed',         // Active state (violet-600)
    muted: '#8b5cf6/20',     // Backgrounds, glows
    glow: 'rgba(139, 92, 246, 0.3)', // Box shadows
  },
  
  // Semantic colours
  positive: {
    DEFAULT: '#22c55e',      // Gains (green-500)
    light: '#4ade80',        // Light variant (green-400)
    muted: '#22c55e/20',     // Backgrounds
  },
  negative: {
    DEFAULT: '#ef4444',      // Losses (red-500)
    light: '#f87171',        // Light variant (red-400)
    muted: '#ef4444/20',     // Backgrounds
  },
  
  // Text hierarchy
  text: {
    primary: '#fafafa',      // Main text (zinc-50)
    secondary: '#a1a1aa',    // Supporting text (zinc-400)
    muted: '#71717a',        // Disabled, hints (zinc-500)
    inverted: '#09090b',     // On light backgrounds
  },
  
  // Borders
  border: {
    DEFAULT: '#27272a',      // Standard borders (zinc-800)
    subtle: '#3f3f46',       // Subtle dividers (zinc-700)
    accent: '#8b5cf6/30',    // Accent borders
  },
};
```

### Typography Scale

```typescript
// tailwind.config.ts - extend theme.fontSize

const mjolnirTypography = {
  // Display (hero numbers)
  'display-xl': ['4rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],    // 64px - Net worth
  'display-lg': ['3rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],  // 48px
  'display-md': ['2.25rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }], // 36px
  
  // Headings
  'heading-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],   // 24px - Section titles
  'heading-md': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],  // 20px - Card titles
  'heading-sm': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],     // 16px - Subsections
  
  // Body
  'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],        // 16px - Primary content
  'body-md': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],    // 14px - Secondary content
  'body-sm': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],     // 12px - Captions, labels
  
  // UI elements
  'label': ['0.75rem', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.05em' }], // 12px - Overlines
};
```

### Spacing & Layout

```typescript
// Layout constants
const layout = {
  sidebarWidth: '240px',
  rightPanelWidth: '320px',
  maxContentWidth: '1400px',
  cardRadius: '16px',       // rounded-2xl
  buttonRadius: '8px',      // rounded-lg
  inputRadius: '8px',       // rounded-lg
  
  // Spacing rhythm (8pt grid)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
};
```

### Shadow & Glow Effects

```typescript
// tailwind.config.ts - extend theme.boxShadow

const mjolnirShadows = {
  'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
  'glow-sm': '0 0 15px rgba(139, 92, 246, 0.2)',
  'glow-md': '0 0 30px rgba(139, 92, 246, 0.3)',
  'glow-lg': '0 0 45px rgba(139, 92, 246, 0.4)',
  'glow-positive': '0 0 20px rgba(34, 197, 94, 0.3)',
  'glow-negative': '0 0 20px rgba(239, 68, 68, 0.3)',
};
```

---

## Component Mapping

### Source Priority

When implementing each component, check sources in this order:

1. **Aceternity UI** — For hero elements, backgrounds, special effects
2. **Magic UI** — For subtle, polished animations
3. **Hover.dev** — For interactive elements (cards, buttons, lists)
4. **Tremor** — For data visualisation components
5. **shadcn/ui** — For form elements, modals, base components
6. **Custom** — Only when no suitable free option exists

### Component Source Matrix

| Component | Primary Source | Fallback | Notes |
|-----------|---------------|----------|-------|
| **Sidebar Navigation** | Aceternity "Sidebar" | shadcn/ui | Animated active indicator |
| **Hero Net Worth Card** | Aceternity "Glowing Card" | Custom | Purple glow effect |
| **Percentage Badge** | Magic UI "Number Ticker" | Custom | Animated value changes |
| **Area Chart** | TradingView Lightweight | Tremor AreaChart | Real financial data viz |
| **Period Selector Pills** | Hover.dev "Shift Tabs" | shadcn/ui Tabs | Smooth indicator slide |
| **Holdings Table** | Hover.dev "Animated List" | Tremor Table | Stagger reveal animation |
| **Table Row Hover** | Aceternity "Hover Effect" | Custom | Subtle highlight |
| **Sparkline Trends** | TradingView mini | Recharts | Inline mini charts |
| **Donut Chart** | Tremor DonutChart | Recharts | Allocation breakdown |
| **Progress Bars** | Tremor ProgressBar | Magic UI | Liabilities display |
| **Action Buttons** | Aceternity "Shimmer Button" | Hover.dev | CTA buttons |
| **Form Inputs** | shadcn/ui | — | Consistent form elements |
| **Modals/Dialogs** | shadcn/ui + Framer | — | Animated entry/exit |
| **Toast Notifications** | Magic UI "Toast" | shadcn/ui | Success/error feedback |
| **Loading States** | Aceternity "Skeleton" | shadcn/ui | Shimmer loading |
| **Background Effects** | Aceternity "Beams" | Aceternity "Aurora" | Subtle ambient motion |
| **Empty States** | Custom + Lucide | — | Friendly illustrations |

---

## Screen-by-Screen Implementation

### 1. Main Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAIN DASHBOARD                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────────────────────────────────┐  ┌─────────────────┐ │
│  │         │  │                                     │  │                 │ │
│  │ SIDEBAR │  │  HERO NET WORTH CARD               │  │  ALLOCATION     │ │
│  │         │  │  [Aceternity Glowing Card]          │  │  DONUT          │ │
│  │ [Acet.] │  │  [Magic UI Number Ticker]           │  │  [Tremor]       │ │
│  │         │  │                                     │  │                 │ │
│  │         │  ├─────────────────────────────────────┤  ├─────────────────┤ │
│  │         │  │                                     │  │                 │ │
│  │         │  │  GROWTH CHART                       │  │  LIABILITIES    │ │
│  │         │  │  [TradingView Lightweight]          │  │  SUMMARY        │ │
│  │         │  │  [Hover.dev Shift Tabs]             │  │  [Tremor]       │ │
│  │         │  │                                     │  │                 │ │
│  │         │  ├─────────────────────────────────────┤  ├─────────────────┤ │
│  │         │  │                                     │  │                 │ │
│  │         │  │  TOP HOLDINGS TABLE                 │  │  QUICK ACTIONS  │ │
│  │         │  │  [Hover.dev Animated List]          │  │  [Aceternity    │ │
│  │         │  │  [TradingView Sparklines]           │  │   Shimmer Btn]  │ │
│  │         │  │                                     │  │                 │ │
│  └─────────┘  └─────────────────────────────────────┘  └─────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Specifications

**Hero Net Worth Card**
- Source: Aceternity "Glowing Card" + Magic UI "Number Ticker"
- Animation: Fade in on load, number ticker on value updates
- Glow: `shadow-glow-md` on card, pulsing glow on percentage badge
- Typography: `display-xl` for main value, `body-md` for label

**Growth Analysis Chart**
- Source: TradingView Lightweight Charts
- Wrapper: Custom Framer Motion container for entry animation
- Period Selector: Hover.dev "Shift Tabs" component
- Styling: Purple gradient fill (#8b5cf6 → transparent)

**Holdings Table**
- Source: Hover.dev "Animated List"
- Entry: Stagger children animation (0.05s delay per row)
- Hover: Aceternity subtle highlight effect
- Sparklines: TradingView mini charts or Recharts

**Sidebar Navigation**
- Source: Aceternity animated sidebar
- Active indicator: Animated pill that slides between items
- Glow: Active item has subtle purple glow
- Icons: Lucide React

---

### 2. Holdings Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HOLDINGS VIEW                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │         │  │  FILTER BAR                                             │  │
│  │ SIDEBAR │  │  [shadcn/ui Select + Hover.dev Shift Tabs]              │  │
│  │         │  ├─────────────────────────────────────────────────────────┤  │
│  │         │  │                                                         │  │
│  │         │  │  HOLDINGS DATA TABLE                                    │  │
│  │         │  │  [Tremor Table + Hover.dev row animations]              │  │
│  │         │  │                                                         │  │
│  │         │  │  ┌─────────────────────────────────────────────────┐   │  │
│  │         │  │  │ Asset    │ Type   │ Value    │ Change │ Trend  │   │  │
│  │         │  │  ├─────────────────────────────────────────────────┤   │  │
│  │         │  │  │ BTC      │ Crypto │ $45,210  │ +5.2%  │ ~~~~   │   │  │
│  │         │  │  │ ETH      │ Crypto │ $21,050  │ -1.1%  │ ~~~~   │   │  │
│  │         │  │  │ NVDA     │ Stock  │ $15,830  │ +12.4% │ ~~~~   │   │  │
│  │         │  │  └─────────────────────────────────────────────────┘   │  │
│  │         │  │                                                         │  │
│  │         │  ├─────────────────────────────────────────────────────────┤  │
│  │         │  │  [Floating Action Button - Aceternity]                  │  │
│  └─────────┘  └─────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Specifications

**Filter Bar**
- Category tabs: Hover.dev "Shift Tabs" (All, Crypto, Stocks, Super, Cash)
- Search: shadcn/ui Input with Lucide search icon
- Sort dropdown: shadcn/ui Select

**Data Table**
- Base: Tremor Table component
- Row animation: Framer Motion stagger on filter change
- Hover state: Subtle background shift + slight scale
- Expandable rows: AnimatePresence for smooth expand/collapse

**Floating Action Button**
- Source: Aceternity "Shimmer Button"
- Position: Fixed bottom-right
- Action: Opens "Add Entry" modal

---

### 3. Super Check-in Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPER CHECK-IN                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │         │  │                                                         │  │
│  │ SIDEBAR │  │  PROGRESS STEPPER                                       │  │
│  │         │  │  [Magic UI or custom Framer]                            │  │
│  │         │  │  ○─────●─────○─────○                                    │  │
│  │         │  │  Fund   Contrib  Review  Done                           │  │
│  │         │  │                                                         │  │
│  │         │  ├─────────────────────────────────────────────────────────┤  │
│  │         │  │                                                         │  │
│  │         │  │  STEP CONTENT CARD                                      │  │
│  │         │  │  [AnimatePresence for step transitions]                 │  │
│  │         │  │                                                         │  │
│  │         │  │  ┌─────────────────────────────────────────────────┐   │  │
│  │         │  │  │  Employer Contribution    $______              │   │  │
│  │         │  │  │  Salary Sacrifice         $______              │   │  │
│  │         │  │  │  Personal Contribution    $______              │   │  │
│  │         │  │  │  Government Co-contrib    $______              │   │  │
│  │         │  │  │  ─────────────────────────────────             │   │  │
│  │         │  │  │  Total This Period        $X,XXX               │   │  │
│  │         │  │  └─────────────────────────────────────────────────┘   │  │
│  │         │  │                                                         │  │
│  │         │  │  [Back] [Continue →]                                    │  │
│  │         │  │                                                         │  │
│  └─────────┘  └─────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Specifications

**Progress Stepper**
- Source: Magic UI or custom implementation
- Animation: Beam follows progress, completed steps glow
- Typography: Step labels with completion state

**Step Transitions**
- Framer Motion AnimatePresence
- Direction-aware: slide left/right based on navigation
- Exit: fade + slide out
- Enter: fade + slide in

**Form Inputs**
- Source: shadcn/ui
- Validation: Real-time with subtle shake on error
- Success: Green checkmark animation on valid input

---

### 4. Add Entry Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADD ENTRY MODAL                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│         ┌───────────────────────────────────────────────────┐               │
│         │                                                   │               │
│         │  Add New Entry                              [×]   │               │
│         │                                                   │               │
│         │  ┌───────────────────────────────────────────┐   │               │
│         │  │  Holding Type    [Crypto ▼]               │   │               │
│         │  └───────────────────────────────────────────┘   │               │
│         │  ┌───────────────────────────────────────────┐   │               │
│         │  │  Asset           [Select or search...]    │   │               │
│         │  └───────────────────────────────────────────┘   │               │
│         │  ┌─────────────────┐  ┌─────────────────────┐   │               │
│         │  │  Quantity       │  │  Unit Price (AUD)   │   │               │
│         │  │  [___________]  │  │  [___________]      │   │               │
│         │  └─────────────────┘  └─────────────────────┘   │               │
│         │  ┌───────────────────────────────────────────┐   │               │
│         │  │  Date           [📅 31 Jan 2026]          │   │               │
│         │  └───────────────────────────────────────────┘   │               │
│         │                                                   │               │
│         │  Total Value: $X,XXX.XX                          │               │
│         │                                                   │               │
│         │        [Cancel]  [Save Entry]                     │               │
│         │                                                   │               │
│         └───────────────────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Specifications

**Modal Container**
- Source: shadcn/ui Dialog
- Animation: Framer Motion scale + fade
- Backdrop: Blur + dark overlay

**Form Elements**
- Selects: shadcn/ui with search (Combobox)
- Inputs: shadcn/ui with currency formatting
- Date picker: shadcn/ui Calendar
- All with subtle focus animations

**Buttons**
- Cancel: Ghost variant
- Save: Aceternity "Shimmer Button" or solid accent

---

### 5. Settings Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │         │  │                                                         │  │
│  │ SIDEBAR │  │  SETTINGS SECTIONS                                      │  │
│  │         │  │  [Accordion with Framer Motion]                         │  │
│  │         │  │                                                         │  │
│  │         │  │  ▼ Profile                                              │  │
│  │         │  │    ┌─────────────────────────────────────────────┐     │  │
│  │         │  │    │  Display Name    [_______________]          │     │  │
│  │         │  │    │  Email           user@example.com           │     │  │
│  │         │  │    └─────────────────────────────────────────────┘     │  │
│  │         │  │                                                         │  │
│  │         │  │  ▶ Display Preferences                                  │  │
│  │         │  │                                                         │  │
│  │         │  │  ▶ Data Management                                      │  │
│  │         │  │                                                         │  │
│  │         │  │  ▶ About                                                │  │
│  │         │  │                                                         │  │
│  └─────────┘  └─────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Specifications

**Accordion Sections**
- Source: shadcn/ui Accordion + Framer Motion
- Animation: Smooth height transition, icon rotation
- Nested content: Fade in after expand

---

## Animation Guidelines

### Timing Standards

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Micro-interactions (buttons, toggles) | 150-200ms | `ease-out` |
| Component transitions (modals, panels) | 200-300ms | `ease-in-out` |
| Page transitions | 300-400ms | `ease-in-out` |
| Data updates (charts, numbers) | 400-600ms | `spring` |
| Stagger delays | 30-50ms | — |
| Background effects | 2000-4000ms | `linear` (loop) |

### Framer Motion Presets

```typescript
// lib/animations.ts

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Spring presets for data animations
export const numberSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};
```

### When to Animate

| Scenario | Animation | Rationale |
|----------|-----------|-----------|
| Page load | Stagger fade-in | Guide eye through hierarchy |
| Data update | Number ticker/morph | Draw attention to changes |
| Navigation | Slide/crossfade | Maintain spatial awareness |
| Modal open | Scale + fade | Focus attention |
| Hover state | Subtle lift/glow | Indicate interactivity |
| Success action | Checkmark + bounce | Confirm completion |
| Error state | Shake + highlight | Draw attention to issue |
| Loading | Skeleton shimmer | Indicate progress |

### When NOT to Animate

- Repeated rapid actions (typing, scrolling)
- User has `prefers-reduced-motion` enabled
- Critical error states (keep static for clarity)
- Dense data tables (performance concern)

---

## Epics

### Epic Overview

| Epic | Name | Dependency | Estimated Effort |
|------|------|------------|------------------|
| **UX-1** | Design System Foundation | W-2 (Auth complete) | 1 week |
| **UX-2** | Layout & Navigation | UX-1 | 0.5 week |
| **UX-3** | Holdings UI Enhancement | UX-2, W-3 | 1 week |
| **UX-4** | Transaction UI Enhancement | UX-3, W-4 | 0.5 week |
| **UX-5** | Snapshot & Check-in Polish | UX-2, W-5 | 1 week |
| **UX-6** | Dashboard Transformation | UX-1, W-7 | 1.5 weeks |
| **UX-7** | Charts & Data Visualisation | UX-6, W-9 | 1 week |
| **UX-8** | Live Price UI | UX-6, W-6 | 0.5 week |
| **UX-9** | Multi-Currency Display | UX-6, W-8 | 0.5 week |
| **UX-10** | Forms & Modal Polish | UX-2 | 1 week |
| **UX-11** | Import/Export UI | UX-10, W-11, W-13 | 0.5 week |
| **UX-12** | Ambient Effects & Final Polish | All UX epics | 1 week |

**Total Estimated Effort**: ~9 weeks (can run in parallel with core epics after UX-1)

---

### UX-1: Design System Foundation

**Objective**: Establish the visual foundation — colours, typography, spacing, and animation primitives that all other UI work builds upon.

**Dependencies**: W-2 (basic app shell exists)

**User Stories**:

> As a developer, I want a centralised theme configuration so all components use consistent colours and spacing.

> As a user, I want smooth, consistent animations throughout the app so it feels polished and premium.

> As a user with motion sensitivity, I want reduced animations when I've enabled that preference in my OS.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Configure Tailwind theme with Mjölnir colour palette | Custom | P0 |
| Set up typography scale (display, heading, body, label) | Custom | P0 |
| Define spacing rhythm (8pt grid) | Custom | P0 |
| Create shadow and glow effect utilities | Custom | P0 |
| Set up Framer Motion animation presets | Custom | P0 |
| Create `useReducedMotion` hook | Framer Motion | P0 |
| Install and configure component libraries | Aceternity, Magic UI, Hover.dev | P1 |

**Deliverables**:
- [ ] `tailwind.config.ts` — Full Mjölnir theme extension
- [ ] `lib/animations.ts` — Framer Motion presets (fadeIn, slideUp, scaleIn, stagger)
- [ ] `lib/theme.ts` — Theme constants and CSS variables
- [ ] `hooks/use-reduced-motion.ts` — Accessibility hook
- [ ] `hooks/use-animation-config.ts` — Conditional animation helper
- [ ] Component library dependencies installed and configured

**Acceptance Criteria**:
- [ ] All colour tokens match design spec (#09090b background, #8b5cf6 accent, etc.)
- [ ] Typography scale renders correctly at all sizes
- [ ] Glow effects (`shadow-glow-sm/md/lg`) work as expected
- [ ] Animation presets can be imported and used in any component
- [ ] `prefers-reduced-motion` disables/reduces all animations
- [ ] No Tailwind classes use raw colour values (all use theme tokens)

---

### UX-2: Layout & Navigation

**Objective**: Implement the core app shell with animated sidebar navigation and page transitions.

**Dependencies**: UX-1

**User Stories**:

> As a user, I want a persistent sidebar so I can navigate between sections easily.

> As a user, I want visual feedback on which page I'm on so I don't lose context.

> As a user, I want smooth transitions between pages so the app feels cohesive.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Animated sidebar with active indicator | Aceternity Sidebar | P0 |
| Sidebar navigation items with icons | Lucide React | P0 |
| Mobile responsive sidebar (drawer) | shadcn/ui Sheet + Framer | P0 |
| Page transition wrapper | Framer Motion | P1 |
| Header with user menu | shadcn/ui DropdownMenu | P1 |
| Breadcrumb navigation (optional) | shadcn/ui | P2 |

**Deliverables**:
- [ ] `components/layout/sidebar.tsx` — Animated sidebar
- [ ] `components/layout/nav-item.tsx` — Individual nav items with active state
- [ ] `components/layout/mobile-nav.tsx` — Mobile drawer navigation
- [ ] `components/layout/page-wrapper.tsx` — Page transition container
- [ ] `components/layout/header.tsx` — Top header with user menu
- [ ] `components/layout/app-shell.tsx` — Combined layout component

**Acceptance Criteria**:
- [ ] Active nav item has animated indicator (sliding pill)
- [ ] Active item has subtle purple glow
- [ ] Hover states on all nav items
- [ ] Sidebar collapses to icons on tablet
- [ ] Sidebar becomes drawer on mobile (<768px)
- [ ] Page transitions animate smoothly (no layout shift)
- [ ] Keyboard navigation works (Tab, Enter, Escape)

---

### UX-3: Holdings UI Enhancement

**Objective**: Transform the holdings list from functional to premium with animations, grouping, and visual polish.

**Dependencies**: UX-2, W-3 (Holdings Management complete)

**User Stories**:

> As a user, I want my holdings visually grouped by type so I can scan my portfolio quickly.

> As a user, I want smooth animations when filtering holdings so changes feel intentional.

> As a user, I want clear visual distinction between assets and liabilities.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Holdings table with type grouping | Tremor Table + Custom | P0 |
| Animated filter tabs (All, Crypto, Stocks, Super, etc.) | Hover.dev Shift Tabs | P0 |
| Table row hover effects | Aceternity Hover Effect | P1 |
| Stagger animation on filter change | Framer Motion | P1 |
| Summary stats per group (count, total value) | Tremor | P1 |
| Empty state component | Custom + Lucide | P1 |
| Floating action button for "Add Holding" | Aceternity | P2 |
| Dormant holdings toggle with visual treatment | shadcn/ui Switch | P2 |

**Deliverables**:
- [ ] `components/holdings/holdings-table.tsx` — Main table with grouping
- [ ] `components/holdings/filter-tabs.tsx` — Animated category filter
- [ ] `components/holdings/holdings-row.tsx` — Individual row with hover
- [ ] `components/holdings/group-header.tsx` — Collapsible group headers
- [ ] `components/holdings/holdings-summary.tsx` — Per-group stats
- [ ] `components/shared/empty-state.tsx` — Reusable empty state
- [ ] `components/shared/fab.tsx` — Floating action button

**Acceptance Criteria**:
- [ ] Holdings grouped by: Assets (by type) → Liabilities (by type)
- [ ] Filter tabs animate indicator smoothly between options
- [ ] Rows stagger in (50ms delay) when filter changes
- [ ] Hover state: subtle background shift + slight scale (1.01)
- [ ] Dormant holdings greyed out with "Dormant" badge
- [ ] Empty state shows friendly message + CTA
- [ ] FAB appears on scroll with entrance animation

---

### UX-4: Transaction UI Enhancement

**Objective**: Polish the transaction entry and history views with smooth interactions.

**Dependencies**: UX-3, W-4 (Transaction Tracking complete)

**User Stories**:

> As a user, I want quick transaction entry from the holdings page so logging is frictionless.

> As a user, I want to see my transaction history with clear visual hierarchy.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Transaction entry modal with animation | shadcn/ui Dialog + Framer | P0 |
| Transaction type selector (BUY/SELL/DIVIDEND/SPLIT) | Hover.dev Shift Tabs | P0 |
| Transaction history list with date grouping | Custom + Framer | P1 |
| Visual indicators for transaction types | Custom (colour-coded badges) | P1 |
| Confirmation animation on save | Framer Motion | P2 |

**Deliverables**:
- [ ] `components/transactions/transaction-modal.tsx` — Entry modal
- [ ] `components/transactions/type-selector.tsx` — Animated type tabs
- [ ] `components/transactions/transaction-list.tsx` — History view
- [ ] `components/transactions/transaction-item.tsx` — Individual transaction

**Acceptance Criteria**:
- [ ] Modal scales in smoothly (0.95 → 1.0)
- [ ] Type selector has sliding indicator
- [ ] BUY = green accent, SELL = red, DIVIDEND = purple, SPLIT = blue
- [ ] Transaction list groups by date with sticky headers
- [ ] Success state: checkmark animation + toast

---

### UX-5: Snapshot & Check-in Polish

**Objective**: Create a delightful monthly check-in experience with guided workflow and progress indication.

**Dependencies**: UX-2, W-5 (Snapshot Tracking complete)

**User Stories**:

> As a user, I want a dashboard prompt reminding me to do my monthly check-in so I don't forget.

> As a user, I want a guided check-in flow so I don't miss any holdings.

> As a user, I want to see my progress through the check-in so I know how much is left.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Check-in prompt card on dashboard | Custom + Framer | P0 |
| Check-in modal with stepper progress | Magic UI / Custom | P0 |
| Step-to-step transitions (slide left/right) | AnimatePresence | P0 |
| Super contribution expandable section | shadcn/ui Collapsible + Framer | P1 |
| Snapshot history chart on holding detail | Tremor / TradingView | P1 |
| Month selector with date limit logic | shadcn/ui + Custom | P1 |
| Completion celebration animation | Framer Motion (confetti optional) | P2 |

**Deliverables**:
- [ ] `components/dashboard/checkin-prompt.tsx` — Dashboard reminder card
- [ ] `components/checkin/checkin-modal.tsx` — Main check-in wizard
- [ ] `components/checkin/checkin-stepper.tsx` — Progress indicator
- [ ] `components/checkin/checkin-step.tsx` — Individual step container
- [ ] `components/checkin/super-contributions.tsx` — Expandable super section
- [ ] `components/checkin/month-selector.tsx` — Date picker with limits
- [ ] `components/holdings/snapshot-chart.tsx` — Historical balance chart

**Acceptance Criteria**:
- [ ] Prompt card appears if no check-in this month
- [ ] Prompt has dismissible "Remind me later" option
- [ ] Stepper shows completed/current/upcoming steps
- [ ] Steps transition directionally (forward = slide left, back = slide right)
- [ ] Super section expands smoothly with height animation
- [ ] Month selector only allows current and previous month
- [ ] Completion shows success animation + summary

---

### UX-6: Dashboard Transformation

**Objective**: Transform the main dashboard into the premium fintech experience with the hero net worth card, animated numbers, and polished layout.

**Dependencies**: UX-1, W-7 (Net Worth Calculation complete)

**User Stories**:

> As a user, I want my net worth displayed prominently with a premium feel so checking it feels rewarding.

> As a user, I want to see animated value changes so updates feel dynamic.

> As a user, I want to see my top performers and losers at a glance.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Hero net worth card with purple glow | Aceternity Glowing Card | P0 |
| Animated number ticker for values | Magic UI Number Ticker | P0 |
| Change percentage badge with colour | Custom | P0 |
| Asset breakdown cards (by type) | Tremor + Custom | P0 |
| Total debt card | Tremor + Custom | P1 |
| Percentage allocation badges | Custom | P1 |
| Top gainers/losers section | Custom + Framer stagger | P1 |
| Stale data indicators | Custom (warning badges) | P1 |
| Dashboard grid layout with responsive breakpoints | CSS Grid + Tailwind | P0 |

**Deliverables**:
- [ ] `components/dashboard/hero-card.tsx` — Main net worth display
- [ ] `components/dashboard/number-ticker.tsx` — Animated number component
- [ ] `components/dashboard/change-badge.tsx` — Percentage change indicator
- [ ] `components/dashboard/asset-card.tsx` — Per-type asset summary
- [ ] `components/dashboard/debt-card.tsx` — Total liabilities
- [ ] `components/dashboard/allocation-badge.tsx` — Percentage of total
- [ ] `components/dashboard/top-movers.tsx` — Gainers/losers list
- [ ] `components/dashboard/stale-indicator.tsx` — Data freshness warning
- [ ] `app/(dashboard)/page.tsx` — Updated dashboard layout

**Acceptance Criteria**:
- [ ] Hero card has subtle purple glow (`shadow-glow-md`)
- [ ] Net worth number animates on value change (spring physics)
- [ ] Positive change = green badge, negative = red
- [ ] Asset cards show: type icon, total value, count, % of portfolio
- [ ] Stale values show warning icon with "as of X ago" tooltip
- [ ] Top 5 gainers + worst performer displayed
- [ ] Responsive: 3 columns desktop, 2 tablet, 1 mobile

---

### UX-7: Charts & Data Visualisation

**Objective**: Implement beautiful, interactive charts for net worth history and asset allocation.

**Dependencies**: UX-6, W-9 (Charts complete in backend)

**User Stories**:

> As a user, I want to see my net worth trend over time so I can track my progress.

> As a user, I want to select different time ranges so I can focus on relevant periods.

> As a user, I want an interactive allocation chart so I understand my portfolio composition.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Net worth growth area chart | TradingView Lightweight | P0 |
| Time range selector (3M, 6M, 12M, YTD, All) | Hover.dev Shift Tabs | P0 |
| Chart wrapper with entry animation | Framer Motion | P0 |
| Hover tooltips with formatted values | TradingView / Custom | P1 |
| Asset allocation donut chart | Tremor DonutChart | P0 |
| Donut center total display | Custom overlay | P1 |
| Individual holding sparklines | Recharts / TradingView mini | P2 |
| Chart loading skeleton | Custom | P1 |

**Deliverables**:
- [ ] `components/charts/net-worth-chart.tsx` — Main growth chart
- [ ] `components/charts/time-range-selector.tsx` — Period tabs
- [ ] `components/charts/chart-wrapper.tsx` — Animation container
- [ ] `components/charts/allocation-donut.tsx` — Asset allocation
- [ ] `components/charts/sparkline.tsx` — Mini trend charts
- [ ] `components/charts/chart-skeleton.tsx` — Loading state

**Acceptance Criteria**:
- [ ] Growth chart uses purple gradient fill (#8b5cf6 → transparent)
- [ ] Time range tabs have smooth sliding indicator
- [ ] Chart fades in on load (no jarring appearance)
- [ ] Hover shows: date, value, change from previous
- [ ] Donut chart centre shows total net worth
- [ ] Donut segments have hover highlight
- [ ] Sparklines show last 30 days trend
- [ ] All charts respect `prefers-reduced-motion`

---

### UX-8: Live Price UI

**Objective**: Create clear visual feedback for live price updates and refresh states.

**Dependencies**: UX-6, W-6 (Live Prices complete)

**User Stories**:

> As a user, I want to know when prices were last updated so I trust the data.

> As a user, I want a manual refresh option so I can get current prices on demand.

> As a user, I want to see daily price changes for my holdings.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Last updated timestamp display | Custom | P0 |
| Refresh button with loading state | shadcn/ui Button + Framer | P0 |
| Price change indicators (% and absolute) | Custom | P0 |
| Stale price warning treatment | Custom | P1 |
| Retry button for failed fetches | Custom | P1 |
| Price update animation (flash/highlight) | Framer Motion | P2 |

**Deliverables**:
- [ ] `components/prices/last-updated.tsx` — Timestamp display
- [ ] `components/prices/refresh-button.tsx` — Manual refresh
- [ ] `components/prices/price-change.tsx` — Change indicator
- [ ] `components/prices/stale-warning.tsx` — Cached price warning
- [ ] `components/prices/price-cell.tsx` — Table cell with all features

**Acceptance Criteria**:
- [ ] "Last updated: X minutes ago" clearly visible
- [ ] Refresh button shows spinner while loading
- [ ] Daily change: green arrow up / red arrow down + percentage
- [ ] Stale prices show amber warning icon
- [ ] Failed fetches show "Retry" button
- [ ] Price updates flash briefly to draw attention

---

### UX-9: Multi-Currency Display

**Objective**: Implement clear, user-friendly currency display with conversion visibility.

**Dependencies**: UX-6, W-8 (Multi-Currency complete)

**User Stories**:

> As a user, I want to see values in my preferred currency so totals make sense.

> As a user, I want to toggle between AUD and native currency so I can see both perspectives.

> As a user, I want to understand which values are converted so I know the source.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Currency display component (symbol + hover for ISO) | Custom | P0 |
| Display currency toggle (AUD / Native) | shadcn/ui Toggle | P0 |
| Currency preference in settings | shadcn/ui Select | P1 |
| Converted value indicator | Custom (subtle styling) | P1 |
| Currency filter on holdings list | shadcn/ui + Filter tabs | P1 |
| Dashboard currency breakdown | Custom cards | P2 |

**Deliverables**:
- [ ] `components/currency/currency-display.tsx` — Formatted currency
- [ ] `components/currency/currency-toggle.tsx` — AUD/Native switch
- [ ] `components/currency/converted-indicator.tsx` — Shows original currency
- [ ] `components/settings/currency-preference.tsx` — User setting
- [ ] `components/holdings/currency-filter.tsx` — Filter by currency

**Acceptance Criteria**:
- [ ] Currency shows symbol ($, NZ$, US$) with ISO code on hover
- [ ] Toggle smoothly switches all displayed values
- [ ] Converted values show subtle indicator (e.g., "≈ $X AUD")
- [ ] User preference persists across sessions
- [ ] Dashboard shows breakdown by currency (optional)

---

### UX-10: Forms & Modal Polish

**Objective**: Ensure all forms and modals have consistent, polished interactions.

**Dependencies**: UX-2

**User Stories**:

> As a user, I want clear validation feedback so I know what to fix.

> As a user, I want smooth modal animations so the app feels premium.

> As a user, I want success confirmation so I know my action completed.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Animated modal wrapper (scale + fade) | shadcn/ui Dialog + Framer | P0 |
| Form validation with inline errors | React Hook Form + Custom | P0 |
| Input focus animations | Custom | P1 |
| Error shake animation | Framer Motion | P1 |
| Success toast with checkmark | Magic UI Toast / sonner | P0 |
| Error toast with retry option | Magic UI Toast / sonner | P0 |
| Confirmation dialog component | shadcn/ui AlertDialog + Framer | P1 |
| Settings page accordion sections | shadcn/ui Accordion + Framer | P2 |

**Deliverables**:
- [ ] `components/ui/animated-dialog.tsx` — Modal wrapper
- [ ] `components/ui/form-field.tsx` — Input with validation states
- [ ] `components/ui/toast-provider.tsx` — Toast configuration
- [ ] `components/ui/confirm-dialog.tsx` — Confirmation modal
- [ ] `components/settings/settings-section.tsx` — Accordion section

**Acceptance Criteria**:
- [ ] Modals scale from 0.95 → 1.0 on open
- [ ] Modals fade out on close (no jarring disappearance)
- [ ] Invalid inputs show red border + error message below
- [ ] Error shake animation on submit with invalid fields
- [ ] Success toast shows checkmark icon + auto-dismisses (3s)
- [ ] Error toast persists until dismissed, shows retry if applicable
- [ ] Confirmation dialogs require explicit action

---

### UX-11: Import/Export UI

**Objective**: Create intuitive interfaces for data import and export workflows.

**Dependencies**: UX-10, W-11 (Import), W-13 (Export)

**User Stories**:

> As a user, I want a clear import wizard so I can bring in my historical data.

> As a user, I want to preview imported data before committing so I can catch errors.

> As a user, I want easy export options so I can backup or analyse my data.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Import wizard modal (multi-step) | Custom + Framer | P0 |
| File upload dropzone with drag feedback | Custom | P0 |
| Column mapping interface | Custom | P0 |
| Import preview table with error highlighting | Tremor Table + Custom | P0 |
| Import progress indicator | Tremor Progress / Custom | P1 |
| Export options modal | shadcn/ui Dialog | P0 |
| Export format selector | shadcn/ui RadioGroup | P1 |
| Download progress/success feedback | Custom | P1 |

**Deliverables**:
- [ ] `components/import/import-wizard.tsx` — Multi-step import flow
- [ ] `components/import/file-dropzone.tsx` — Drag-and-drop upload
- [ ] `components/import/column-mapper.tsx` — Field mapping UI
- [ ] `components/import/import-preview.tsx` — Data preview with errors
- [ ] `components/import/import-progress.tsx` — Progress indicator
- [ ] `components/export/export-modal.tsx` — Export options
- [ ] `components/export/format-selector.tsx` — CSV/Excel/JSON choice

**Acceptance Criteria**:
- [ ] Dropzone highlights on drag-over
- [ ] Unsupported file types show clear error
- [ ] Column mapper auto-detects common field names
- [ ] Preview shows row-level errors in red
- [ ] User can fix errors before confirming import
- [ ] Export shows file size estimate
- [ ] Download triggers with success feedback

---

### UX-12: Ambient Effects & Final Polish

**Objective**: Add the finishing touches — subtle background effects, loading states, and comprehensive accessibility audit.

**Dependencies**: All previous UX epics

**User Stories**:

> As a user, I want a polished, premium feel throughout the app.

> As a user with disabilities, I want the app to be fully accessible.

> As a mobile user, I want touch-friendly interactions.

**Scope**:

| Task | Source | Priority |
|------|--------|----------|
| Subtle background beam/gradient effects | Aceternity Beams / Aurora | P2 |
| Skeleton loading components | Aceternity Skeleton | P0 |
| Progressive loading (show data as it arrives) | Custom | P1 |
| Optimistic updates for quick actions | Custom | P1 |
| Touch-friendly tap targets (44×44px minimum) | CSS | P0 |
| Swipe gestures for mobile (optional) | Framer Motion | P2 |
| Full keyboard navigation audit | Manual testing | P0 |
| ARIA labels and roles audit | Manual + axe-core | P0 |
| Focus management (skip links, focus trapping) | Custom | P0 |
| Offline state messaging | Custom | P1 |
| Performance audit (Lighthouse) | Lighthouse | P0 |
| Bundle size optimisation | Webpack analysis | P1 |

**Deliverables**:
- [ ] `components/effects/background-beams.tsx` — Ambient background
- [ ] `components/ui/skeleton.tsx` — Loading skeleton variants
- [ ] `components/ui/offline-banner.tsx` — Connection status
- [ ] Accessibility audit report
- [ ] Performance audit report
- [ ] Bundle analysis report

**Acceptance Criteria**:
- [ ] Background effects subtle and performant (no FPS drops)
- [ ] Skeleton loaders match content shape
- [ ] Data appears progressively, not all-at-once
- [ ] All interactive elements have 44×44px touch target
- [ ] Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces content changes
- [ ] Lighthouse Performance score > 90
- [ ] Lighthouse Accessibility score > 95
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s

---

## Performance Considerations

### Bundle Size Management

```typescript
// Import only what you need from Framer Motion
import { motion, AnimatePresence } from 'framer-motion';
// NOT: import * as framerMotion from 'framer-motion';

// Tree-shake Tremor components
import { AreaChart } from '@tremor/react';
// NOT: import { AreaChart, BarChart, DonutChart, ... } from '@tremor/react';
```

### Animation Performance

| Technique | Implementation |
|-----------|----------------|
| Use `transform` and `opacity` only | These are GPU-accelerated |
| Add `will-change` hint | `style={{ willChange: 'transform' }}` |
| Avoid layout animations on large elements | Use `scale` instead of `width/height` |
| Debounce scroll-triggered animations | Prevent excessive re-renders |
| Use `layout` prop sparingly | Can be expensive on complex trees |

### Lazy Loading

```typescript
// Dynamically import heavy components
const GrowthChart = dynamic(
  () => import('@/components/dashboard/growth-chart'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);
```

### Reduced Motion Support

```typescript
// hooks/use-reduced-motion.ts
import { useReducedMotion } from 'framer-motion';

export function useAnimationConfig() {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    initial: prefersReducedMotion ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: prefersReducedMotion 
      ? { duration: 0 } 
      : { duration: 0.3 },
  };
}
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Colour contrast | Minimum 4.5:1 for text, 3:1 for UI |
| Focus indicators | Visible focus ring on all interactive elements |
| Keyboard navigation | Full keyboard operability |
| Screen reader support | Proper ARIA labels and roles |
| Reduced motion | Respect `prefers-reduced-motion` |
| Touch targets | Minimum 44×44px for mobile |

### Focus States

```css
/* Consistent focus ring across all interactive elements */
.focus-ring {
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

### ARIA Labels

```tsx
// Example: Properly labelled chart
<div
  role="img"
  aria-label="Net worth growth chart showing $1,248,593 total, up 2.4% over 6 months"
>
  <GrowthChart data={chartData} />
</div>
```

---

## Quality Checklist

### Pre-Launch Review

#### Visual Polish
- [ ] Consistent colour usage across all screens
- [ ] Typography hierarchy is clear
- [ ] Spacing follows 8pt grid
- [ ] All cards have consistent border radius
- [ ] Hover states on all interactive elements
- [ ] Active/selected states are obvious
- [ ] Loading states for all async operations
- [ ] Empty states with helpful messaging

#### Animation Quality
- [ ] Animations feel smooth (60fps)
- [ ] No jarring or abrupt transitions
- [ ] Stagger timing feels natural
- [ ] Reduced motion users have good experience
- [ ] No animation loops that drain battery

#### Accessibility
- [ ] Passes axe-core audit
- [ ] Keyboard navigation works throughout
- [ ] Focus order is logical
- [ ] Colour contrast passes WCAG AA
- [ ] Screen reader announces content properly

#### Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] No layout shifts during animations
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse Performance score > 90

#### Cross-Browser/Device
- [ ] Chrome, Firefox, Safari, Edge
- [ ] iOS Safari, Android Chrome
- [ ] Responsive: 375px → 1920px
- [ ] Touch interactions work on mobile

---

## Appendix: Quick Reference Links

### Component Libraries
- Aceternity UI: https://ui.aceternity.com/components
- Magic UI: https://magicui.design/docs/components
- Hover.dev: https://hover.dev/components
- Tremor: https://tremor.so/docs/components
- shadcn/ui: https://ui.shadcn.com/docs/components

### Documentation
- Framer Motion: https://www.framer.com/motion/
- TradingView Lightweight: https://tradingview.github.io/lightweight-charts/
- Tailwind CSS: https://tailwindcss.com/docs

### Design Inspiration
- Dribbble Dark Dashboards: https://dribbble.com/tags/dark_dashboard
- Figma Community Finance: https://figma.com/community/search?resource_type=mixed&sort_by=relevancy&query=finance+dashboard+dark

---

*Document Version: 1.0*  
*Last Updated: 31 January 2026*  
*Project: Mjölnir Personal Net Worth Tracker*
