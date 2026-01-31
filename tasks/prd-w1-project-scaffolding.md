# PRD: W-1 Project Scaffolding

## Introduction

Set up the foundational codebase structure and configuration for Project Mjölnir. This epic establishes the Next.js application with TypeScript, Tailwind CSS, shadcn/ui components, and Drizzle ORM schema definition. The goal is to create a development-ready environment where the project runs locally and all tooling is configured, without connecting to external services (database, authentication) which require environment variables not yet available.

## Goals

- Create a working Next.js 14+ application using App Router
- Configure TypeScript with strict type checking
- Set up Tailwind CSS with custom configuration for dark mode
- Install and configure shadcn/ui component library
- Define Drizzle ORM schema for all database tables (holdings, transactions, snapshots, contributions, price_cache)
- Establish project directory structure following Next.js App Router conventions
- Create base layout component with header placeholder
- Ensure the application runs locally without errors

## User Stories

### US-001: Initialize Next.js 14+ project with TypeScript
**Description:** As a developer, I need a Next.js project with App Router and TypeScript so I can build a type-safe modern web application.

**Acceptance Criteria:**
- [ ] Next.js 14+ installed with App Router enabled
- [ ] TypeScript configured with strict mode
- [ ] `tsconfig.json` includes appropriate compiler options
- [ ] Project runs with `npm run dev` on localhost
- [ ] No TypeScript compilation errors
- [ ] `package.json` includes all necessary Next.js dependencies

### US-002: Configure Tailwind CSS
**Description:** As a developer, I need Tailwind CSS configured so I can use utility-first styling throughout the application.

**Acceptance Criteria:**
- [ ] Tailwind CSS installed and configured
- [ ] `tailwind.config.ts` includes dark mode configuration (`class` strategy)
- [ ] Global CSS file imports Tailwind directives
- [ ] Tailwind styles apply correctly to test elements
- [ ] CSS utilities work in components (verify with test div using Tailwind classes)
- [ ] Verify in browser using dev-browser skill

### US-003: Install and configure shadcn/ui
**Description:** As a developer, I need shadcn/ui installed so I can use consistent, accessible UI components.

**Acceptance Criteria:**
- [ ] shadcn/ui CLI initialized with appropriate configuration
- [ ] `components.json` created with correct paths
- [ ] Base components installed: Button, Card, Dialog, Input, Label, Form, Select, Tabs
- [ ] `lib/utils.ts` exists with `cn()` helper function
- [ ] Button component renders without errors
- [ ] Verify Button component in browser using dev-browser skill

### US-004: Define Drizzle ORM schema
**Description:** As a developer, I need the complete database schema defined so the data model is documented in code, ready for migration when database connection is available.

**Acceptance Criteria:**
- [ ] Drizzle ORM installed (`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`)
- [ ] `drizzle.config.ts` created with placeholder connection string
- [ ] Schema file created at `lib/db/schema.ts`
- [ ] `users` table schema defined (references Clerk user ID)
- [ ] `holdings` table schema defined with all fields from data model
- [ ] `transactions` table schema defined with foreign key to holdings
- [ ] `snapshots` table schema defined with unique constraint (holding_id + date)
- [ ] `contributions` table schema defined with foreign key to holdings
- [ ] `price_cache` table schema defined
- [ ] All enums defined (HoldingType, Currency, TransactionAction, Exchange)
- [ ] TypeScript types exported from schema
- [ ] No migration generated yet (out of scope)

### US-005: Establish project directory structure
**Description:** As a developer, I need the project organized with clear separation of concerns so code is maintainable as the application grows.

**Acceptance Criteria:**
- [ ] `app/` directory follows App Router conventions
- [ ] `app/(auth)/` directory created for future authentication routes
- [ ] `app/(dashboard)/` directory created for future protected routes
- [ ] `app/api/` directory created for future API routes
- [ ] `lib/db/` directory created for database code
- [ ] `lib/queries/` directory created for future reusable queries
- [ ] `lib/calculations/` directory created for future business logic
- [ ] `lib/services/` directory created for future external API integrations
- [ ] `components/ui/` directory exists (from shadcn/ui)
- [ ] `components/dashboard/` directory created for future dashboard components
- [ ] `components/forms/` directory created for future form components
- [ ] `components/charts/` directory created for future chart components

### US-006: Create base layout component
**Description:** As a developer, I need a root layout with header placeholder so the application shell is ready for content.

**Acceptance Criteria:**
- [ ] `app/layout.tsx` exists as root layout
- [ ] Layout includes proper HTML structure (html, body tags)
- [ ] Tailwind CSS imported in layout or global CSS
- [ ] Dark mode class applied to html element
- [ ] Header component created with "Mjölnir" app name placeholder
- [ ] Header styled with Tailwind (dark background, centered or left-aligned)
- [ ] Main content area uses `{children}` slot
- [ ] Layout renders without errors
- [ ] Verify layout in browser using dev-browser skill

### US-007: Create placeholder homepage
**Description:** As a developer, I need a simple homepage to verify the entire setup works end-to-end.

**Acceptance Criteria:**
- [ ] `app/page.tsx` created with basic content
- [ ] Page displays "Mjölnir" heading
- [ ] Page includes a shadcn/ui Button component to verify integration
- [ ] Page uses Tailwind classes for styling
- [ ] No console errors when viewing page
- [ ] TypeScript compiles without errors
- [ ] Verify page in browser using dev-browser skill

### US-008: Configure development tooling
**Description:** As a developer, I need ESLint and development scripts configured so code quality is maintained.

**Acceptance Criteria:**
- [ ] ESLint configured (comes with Next.js)
- [ ] `npm run lint` executes without errors on scaffolded code
- [ ] `npm run build` completes successfully
- [ ] `.gitignore` includes `node_modules`, `.next`, `.env*.local`, `drizzle` output
- [ ] `package.json` scripts include: `dev`, `build`, `start`, `lint`
- [ ] Optional: Add `db:generate`, `db:migrate`, `db:push`, `db:studio` scripts (won't work yet but documented for future)

## Functional Requirements

- FR-1: The application must run locally on `localhost:3000` with `npm run dev`
- FR-2: TypeScript must compile without errors using `npm run build`
- FR-3: Tailwind CSS utilities must apply styling to components
- FR-4: shadcn/ui Button component must render with correct styling
- FR-5: Drizzle schema must define all five core tables: users, holdings, transactions, snapshots, contributions, price_cache
- FR-6: Drizzle schema must include all enums: HoldingType, Currency, TransactionAction, Exchange
- FR-7: The project structure must separate app routes, lib utilities, and components
- FR-8: The root layout must include a header with "Mjölnir" branding
- FR-9: The homepage must display test content using shadcn/ui and Tailwind
- FR-10: ESLint must run without errors on the scaffolded codebase

## Non-Goals (Out of Scope for W-1)

- Database connection (requires `DATABASE_URL` from R-3)
- Running Drizzle migrations (requires database connection)
- Authentication setup (requires Clerk credentials from R-2)
- Any feature implementation (holdings, transactions, snapshots)
- API routes implementation
- TanStack Query setup
- Zustand state management setup
- Chart library installation (Tremor/Recharts)
- Testing infrastructure (Jest/Vitest/Testing Library)
- Prettier configuration (optional)
- Git hooks (optional)
- VS Code settings (optional)
- Deployment to Vercel (handled in W-2)

## Design Considerations

- **Dark mode first:** Configure Tailwind with `darkMode: 'class'` and apply dark classes by default
- **shadcn/ui theme:** Use default shadcn/ui theme initially; can be customized later
- **Component installation:** Install base components that will be needed across the app (Button, Card, Dialog, Input, Label, Form, Select, Tabs)
- **Header placeholder:** Simple header with app name; will be enhanced with navigation, user menu, and check-in button in later epics

## Technical Considerations

- **Next.js version:** Use Next.js 14 or later for stable App Router
- **TypeScript strict mode:** Enable for maximum type safety
- **Drizzle schema location:** `lib/db/schema.ts` centralizes all table definitions
- **Drizzle config:** Use placeholder connection string in `drizzle.config.ts`; actual connection will be in `lib/db/index.ts` (created in W-2)
- **App Router structure:** Use route groups `(auth)` and `(dashboard)` to organize routes without affecting URL structure
- **Enum vs Union Types:** Use Drizzle's enum capabilities for database enums
- **Foreign keys:** Define relationships between tables (holdings ← transactions, holdings ← snapshots, etc.)
- **Unique constraints:** Snapshots table needs unique constraint on (holding_id, date)

## Success Metrics

- `npm run dev` starts the application without errors
- `npm run build` completes successfully
- `npm run lint` passes without errors
- Visiting `localhost:3000` shows the homepage with Mjölnir branding
- Button component from shadcn/ui renders correctly
- TypeScript provides autocomplete for Drizzle schema types
- All directories exist per project structure requirements

## Open Questions

- Should we include Prettier configuration in this epic or defer to later? (Deferring based on scope)
- Should we add any VS Code workspace settings for recommended extensions? (Deferring based on scope)
- Should we install Tremor or Recharts now even if not used? (No - defer to W-9 Charts epic)

## Implementation Notes

### Drizzle Schema Structure

The schema should define these tables based on the data model:

**users:** Minimal reference table for Clerk user IDs
- id (string, primary key) - Clerk user ID
- email (string)
- name (string, nullable)
- created_at (timestamp)

**holdings:** Central registry
- id (UUID, primary key)
- user_id (string, foreign key to users)
- type (enum: stock, etf, crypto, super, cash, debt)
- symbol (string, nullable)
- name (string)
- currency (enum: AUD, NZD, USD)
- exchange (string, nullable)
- is_dormant (boolean, default false)
- is_active (boolean, default true)
- notes (text, nullable)
- created_at, updated_at, deleted_at (timestamps)

**transactions:** Buy/sell events
- id (UUID, primary key)
- holding_id (UUID, foreign key to holdings)
- date (date)
- action (enum: BUY, SELL)
- quantity (decimal)
- unit_price (decimal)
- fees (decimal)
- currency (enum: AUD, NZD, USD)
- notes (text, nullable)
- created_at (timestamp)

**snapshots:** Point-in-time balances
- id (UUID, primary key)
- holding_id (UUID, foreign key to holdings)
- date (date)
- balance (decimal)
- currency (enum: AUD, NZD, USD)
- notes (text, nullable)
- created_at (timestamp)
- **Unique constraint:** (holding_id, date)

**contributions:** Super-specific
- id (UUID, primary key)
- holding_id (UUID, foreign key to holdings)
- date (date)
- employer_contrib (decimal)
- employee_contrib (decimal)
- notes (text, nullable)
- created_at (timestamp)

**price_cache:** Cached live prices
- id (UUID, primary key)
- symbol (string)
- price (decimal)
- currency (enum: AUD, NZD, USD)
- fetched_at (timestamp)

### Package Dependencies

Core dependencies to install:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "drizzle-orm": "latest",
    "@neondatabase/serverless": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest",
    "tailwindcss": "latest",
    "postcss": "latest",
    "autoprefixer": "latest",
    "drizzle-kit": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest"
  }
}
```

Plus shadcn/ui will add: `@radix-ui/*` packages for each component installed.

---

**Epic:** W-1 Project Scaffolding
**Prerequisites:** R-1 (GitHub repository exists)
**Depends On:** None
**Blocks:** W-2 Infrastructure Integration
**Estimated Effort:** 2-3 hours
**Status:** Not Started
