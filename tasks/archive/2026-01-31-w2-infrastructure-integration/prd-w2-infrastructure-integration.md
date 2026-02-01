# PRD: W-2 Infrastructure Integration

## Introduction

Set up the core infrastructure for Mjolnir: database connectivity with Neon PostgreSQL via Drizzle ORM, authentication with Clerk (supporting passkeys, social logins, and email), and deployment to Vercel with auto-deploy from main. This epic establishes the foundational plumbing that all subsequent features depend on.

## Goals

- Establish reliable database connection to Neon PostgreSQL with Drizzle ORM
- Implement Clerk authentication with full sign-in/sign-out flow
- Protect dashboard routes requiring authentication
- Deploy to Vercel with automatic deployments from main branch
- Verify all integrations work end-to-end in production

## User Stories

### US-001: Create Drizzle database connection module
**Description:** As a developer, I need a database connection module so that the app can query Neon PostgreSQL.

**Acceptance Criteria:**
- [ ] Create `lib/db/index.ts` with Drizzle client configuration
- [ ] Use `DATABASE_URL` environment variable for connection string
- [ ] Export `db` instance for use throughout the app
- [ ] Connection uses Neon serverless driver (`@neondatabase/serverless`)
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create database health check API route
**Description:** As a developer, I need a health check endpoint to verify database connectivity works in all environments.

**Acceptance Criteria:**
- [ ] Create `app/api/health/route.ts` endpoint
- [ ] Returns `{ status: "ok", database: "connected" }` on success
- [ ] Returns `{ status: "error", database: "disconnected" }` with 500 status on failure
- [ ] Executes simple query (`SELECT 1`) to verify connection
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Add Clerk provider to application
**Description:** As a developer, I need Clerk integrated so users can authenticate.

**Acceptance Criteria:**
- [ ] Install `@clerk/nextjs` package
- [ ] Add `ClerkProvider` wrapper in root layout
- [ ] Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` env vars
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create Clerk middleware for route protection
**Description:** As a developer, I need middleware to protect dashboard routes from unauthenticated access.

**Acceptance Criteria:**
- [ ] Create `middleware.ts` in project root
- [ ] Public routes: `/`, `/sign-in`, `/sign-up`, `/api/health`
- [ ] All other routes require authentication
- [ ] Unauthenticated users redirected to `/sign-in`
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create sign-in and sign-up pages
**Description:** As a user, I need sign-in and sign-up pages so I can authenticate with the app.

**Acceptance Criteria:**
- [ ] Create `app/(auth)/sign-in/[[...sign-in]]/page.tsx` with Clerk `<SignIn />` component
- [ ] Create `app/(auth)/sign-up/[[...sign-up]]/page.tsx` with Clerk `<SignUp />` component
- [ ] Pages are centered and styled for dark mode
- [ ] Configure `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` env var
- [ ] Configure `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` env var
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create protected dashboard layout
**Description:** As a user, I need a dashboard layout that only appears when I'm signed in.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/layout.tsx` for protected routes
- [ ] Layout includes header with app name "Mjolnir"
- [ ] Header includes `<UserButton />` component from Clerk (shows avatar, sign-out)
- [ ] Dark mode styling consistent with design principles
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create dashboard home page
**Description:** As a user, I need a dashboard home page as the main entry point after signing in.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/page.tsx`
- [ ] Displays welcome message with user's first name (from Clerk)
- [ ] Shows placeholder text: "Net worth tracking coming soon"
- [ ] Page is protected (redirects to sign-in if not authenticated)
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create user profile page
**Description:** As a user, I want to view and manage my profile settings.

**Acceptance Criteria:**
- [ ] Create `app/(dashboard)/profile/page.tsx`
- [ ] Displays Clerk `<UserProfile />` component
- [ ] Accessible from UserButton dropdown or direct navigation
- [ ] Dark mode styling applied
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Create public landing page
**Description:** As a visitor, I need a landing page that explains the app and lets me sign in.

**Acceptance Criteria:**
- [ ] Update `app/page.tsx` as public landing page
- [ ] Shows app name "Mjolnir" and tagline "Personal Net Worth Tracker"
- [ ] Includes "Sign In" button linking to `/sign-in`
- [ ] If already signed in, shows "Go to Dashboard" button instead
- [ ] Dark mode styling
- [ ] Typecheck passes
- [ ] Lint passes

### US-010: Configure Vercel deployment
**Description:** As a developer, I need the app deployed to Vercel with automatic deployments.

**Acceptance Criteria:**
- [ ] Create `vercel.json` with any required configuration (or confirm defaults suffice)
- [ ] Document required environment variables in README or `.env.example`
- [ ] Create `.env.example` file listing all required env vars (without values)
- [ ] Verify build succeeds locally with `npm run build`
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Add environment variable documentation
**Description:** As a developer, I need clear documentation of all environment variables for local and production setup.

**Acceptance Criteria:**
- [ ] Create `.env.example` with all required variables (comments explaining each)
- [ ] Variables include: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- [ ] Add setup instructions to README.md (or create if not exists)
- [ ] Typecheck passes
- [ ] Lint passes

## Functional Requirements

- FR-1: Database connection module exports configured Drizzle client using Neon serverless driver
- FR-2: Health check endpoint at `/api/health` returns JSON status with database connectivity
- FR-3: Clerk provider wraps entire application enabling authentication features
- FR-4: Middleware protects all routes except explicitly public ones (`/`, `/sign-in`, `/sign-up`, `/api/health`)
- FR-5: Sign-in page renders Clerk SignIn component with dark mode appearance
- FR-6: Sign-up page renders Clerk SignUp component with dark mode appearance
- FR-7: Dashboard layout includes header with app branding and UserButton
- FR-8: Dashboard home page displays personalized welcome using Clerk user data
- FR-9: Profile page renders Clerk UserProfile component for account management
- FR-10: Landing page shows sign-in CTA for visitors, dashboard link for authenticated users
- FR-11: All environment variables documented in `.env.example`

## Non-Goals

- No custom user database tables (Clerk handles user storage)
- No email verification customization (use Clerk defaults)
- No custom sign-in/sign-up UI (use Clerk components)
- No advanced error handling or monitoring (deferred to W-12)
- No CI/CD pipeline configuration beyond Vercel auto-deploy
- No staging environment setup
- No database seeding or migrations (schema comes in W-3)

## Technical Considerations

### Dependencies to Install
```bash
npm install @clerk/nextjs @neondatabase/serverless drizzle-orm
npm install -D drizzle-kit
```

### Clerk Configuration
- Use Clerk's Next.js App Router integration
- Configure appearance for dark mode: `appearance={{ baseTheme: dark }}`
- Clerk handles passkeys, Apple, Google, and email auth automatically

### Neon Connection
- Use `@neondatabase/serverless` for edge-compatible connections
- Connection string format: `postgresql://user:pass@host/db?sslmode=require`

### File Structure After This Epic
```
app/
  (auth)/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
  (dashboard)/
    layout.tsx
    page.tsx
    profile/page.tsx
  api/
    health/route.ts
  layout.tsx (updated with ClerkProvider)
  page.tsx (public landing)
lib/
  db/
    index.ts
middleware.ts
.env.example
```

## Success Metrics

- Health check endpoint returns `{ status: "ok", database: "connected" }` in production
- User can sign in via email, Google, Apple, or passkey
- Authenticated user sees personalized dashboard with their name
- Unauthenticated access to `/profile` redirects to `/sign-in`
- Vercel deployment succeeds automatically on push to main
- Preview deployments work for pull requests

## Open Questions

- Should we configure custom Clerk appearance beyond dark mode base theme?
- Do we need a custom domain for Clerk (e.g., accounts.mjolnir.app)?
- Should the landing page have more content, or keep it minimal for now?
