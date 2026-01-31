# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mjolnir** is a personal net worth tracking dashboard built for a single user (Roland). It uses transaction-based tracking for tradeable assets (stocks, ETFs, crypto) and snapshot-based tracking for manually-valued items (superannuation, cash, debt).

**Hero Metric:** `Net Worth = Total Assets - Total Liabilities`

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** Neon (Serverless PostgreSQL)
- **ORM:** Drizzle ORM with Drizzle Kit for migrations
- **Styling:** Tailwind CSS with shadcn/ui components
- **Authentication:** Clerk (supports passkeys, Apple, Google, email)
- **Server State:** TanStack Query
- **Client State:** Zustand
- **Charts:** Tremor or Recharts
- **Email:** Resend (for monthly reminders)
- **Hosting:** Vercel with auto-deploy from main branch

## Common Commands

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Database
npm run db:generate            # Generate Drizzle migration from schema
npm run db:migrate             # Run pending migrations
npm run db:push                # Push schema changes directly (dev only)
npm run db:studio              # Open Drizzle Studio for database inspection
```

## Architecture & Data Model

### Two Tracking Paradigms

1. **Transaction-based** (stocks, ETFs, crypto): Log BUY/SELL events. Current value = quantity x live price
2. **Snapshot-based** (super, cash, debt): Log balances at points in time via monthly check-in modal

### Core Entities

**holdings** - Central registry of everything being tracked
- Types: `stock`, `etf`, `crypto`, `super`, `cash`, `debt`
- Stores: symbol, name, currency (AUD/NZD/USD), exchange, is_dormant flag
- Soft delete supported via `deleted_at`

**transactions** - BUY/SELL events for tradeable assets
- Links to holdings
- Fields: date, action, quantity, unit_price, fees, currency
- **Uses FIFO** (first in, first out) for cost basis on sells

**snapshots** - Point-in-time balances for super, cash, debt
- Links to holdings
- Fields: date, balance, currency
- **Unique constraint:** One snapshot per holding per date

**contributions** - Super-specific employer/employee contributions
- Links to holdings (super only)
- Fields: date, employer_contrib, employee_contrib
- **Investment returns** are derived: `new_balance - old_balance - employer_contrib - employee_contrib`

**price_cache** - Cached live prices (15-minute TTL)
- Stores: symbol, price, currency, fetched_at
- Populated from CoinGecko (crypto) and Yahoo Finance (stocks/ETFs)

### External API Integration

- **CoinGecko:** Cryptocurrency prices (10-30 calls/min free tier)
- **Yahoo Finance:** Stock/ETF prices via `yahoo-finance2` npm package (ASX uses `.AX` suffix)
- **Exchange Rate API:** USD/AUD and NZD/AUD conversion (1-hour cache)

### Currency Handling

All values stored in **native currency** (AUD/NZD/USD). Conversion to AUD happens at **display time** using current exchange rates. No historical FX tracking.

### Super Growth Breakdown

For active super funds, the app separates growth into three components:
- Employer contributions (Superannuation Guarantee)
- Employee contributions (salary sacrifice + personal)
- Investment returns (derived from balance changes minus contributions)

## Key User Flows

### Monthly Check-in Modal

Primary data entry interface. Single modal collects:
- **Active super:** balance + employer contrib + employee contrib
- **Dormant super:** balance only (e.g., Kiwisaver)
- **Cash:** balance
- **Debt:** single combined balance

Month selector allows backdating (e.g., log on the 5th for previous month).

### Transaction Entry

For stocks/ETFs/crypto. Users add BUY/SELL events with:
- Date, quantity, unit price, fees
- System calculates: quantity held, cost basis, unrealised gain/loss

### Live Price Refresh

Manual refresh button fetches current prices for all tradeable assets. Failed fetches show last cached price with "as of X ago" indicator.

## Project Structure (Target)

```
app/
  (auth)/               # Clerk authentication routes
  (dashboard)/          # Protected dashboard routes
    page.tsx            # Main dashboard with net worth hero card
    holdings/           # Holdings list and detail pages
    check-in/           # Monthly check-in modal
  api/                  # API routes
    holdings/           # CRUD for holdings
    transactions/       # CRUD for transactions
    snapshots/          # CRUD for snapshots
    prices/             # Live price fetching
lib/
  db/                   # Drizzle schema and connection
  queries/              # Reusable database queries
  calculations/         # Net worth, cost basis, returns calculations
  services/             # External API integrations (CoinGecko, Yahoo, FX)
components/
  ui/                   # shadcn/ui base components
  dashboard/            # Dashboard-specific components (charts, cards)
  forms/                # Holding/transaction/snapshot forms
  charts/               # Chart components (Tremor/Recharts)
```

## Important Implementation Notes

### Database Migrations

- Always use `npm run db:generate` to create migrations from schema changes
- Never edit migration files directly
- Run `npm run db:migrate` before deploying to apply pending migrations
- Use `npm run db:push` only in local development for quick schema iterations

### Calculations

**Net Worth:**
```
Total Assets =
  Sum(stock/etf/crypto quantity x live price) +
  Sum(latest super snapshots) +
  Sum(latest cash snapshots)

Total Debt = Latest debt snapshot balance

Net Worth = Total Assets - Total Debt
```

**Historical Net Worth:**
Use **carry-forward** for months with missing snapshots: the most recent snapshot before the target date. Display "stale data" indicator for old snapshots.

**FIFO Sell Logic:**
When selling stocks/ETFs/crypto, the cost basis uses first-in-first-out. Implement by sorting transactions by date and consuming oldest lots first.

### Error Handling Patterns

| Scenario | Behaviour |
|----------|-----------|
| Price API down | Show last cached price with "as of X ago" badge |
| Unknown symbol | Show error on holding form, prevent save |
| Invalid ticker | Show validation error, suggest correct format (e.g., `.AX` for ASX) |
| Auth failure | Redirect to Clerk sign-in |
| DB error | Generic "something went wrong" + error logging |

## Design Principles

1. **Dark mode only** - This is a finance dashboard; no light mode
2. **Information density** - Show meaningful data; minimize empty space
3. **Scannable** - Key metrics visible without scrolling
4. **Mobile responsive** - Usable on phone for quick balance checks

## Data Import/Export

### Import Format (CSV)

**Transactions:**
```csv
date,symbol,action,quantity,unit_price,fees,currency,exchange,notes
2024-03-15,VAS.AX,BUY,10,95.50,9.50,AUD,ASX,
```

**Super Snapshots:**
```csv
date,fund_name,balance,employer_contrib,employee_contrib,currency
2024-03-31,AustralianSuper,185000,1200,500,AUD
```

Import should be **idempotent** - re-running doesn't create duplicates.

## Environment Variables

```bash
DATABASE_URL=                           # Neon PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=      # Clerk public key
CLERK_SECRET_KEY=                       # Clerk secret key
COINGECKO_API_KEY=                      # Optional, for higher rate limits
EXCHANGE_RATE_API_KEY=                  # FX service API key
RESEND_API_KEY=                         # For monthly email reminders
NEXT_PUBLIC_APP_URL=                    # Production URL (e.g., https://mjolnir.vercel.app)
```

## Epic Sequencing

Implementation follows this order:
1. W-1: Project Scaffolding (Next.js, TypeScript, Tailwind, shadcn/ui, Drizzle setup) - **COMPLETE**
2. W-2: Infrastructure Integration (DB connection, Clerk auth, Vercel deploy)
3. W-3: Holdings Management (CRUD, list, forms)
4. W-4: Transaction Tracking (BUY/SELL, FIFO, cost basis)
5. W-5: Snapshot Tracking & Monthly Check-in Modal
6. W-6: Live Prices & Caching (CoinGecko, Yahoo Finance)
7. W-7: Net Worth Calculation (hero metric, dashboard cards)
8. W-8: Multi-Currency Support (AUD/NZD/USD with FX conversion)
9. W-9: Charts & Visualisation (net worth over time, asset allocation, super breakdown)
10. W-10: Email Reminders (Vercel Cron + Resend)
11. W-11: Data Import (CSV processing)
12. W-12: Polish & Error Handling (dark mode, mobile, loading/error states)
13. W-13: Data Export (CSV/JSON backup)

## Key Constraints

- **Single user app** - Not a multi-tenant product; built specifically for Roland
- **No light mode** - Dark mode only (finance dashboard convention)
- **No property tracking** - Out of scope
- **Monthly snapshot frequency** - User-initiated check-in with email reminders
- **Debt is a single number** - No itemization by card/provider
- **FIFO for sells** - No LIFO or specific lot selection

## Ralph Autonomous Development

This project uses [Ralph](https://github.com/snarktank/ralph) for autonomous AI-driven development. Philosophy: **Iteration > Perfection**.

Ralph runs as a bash loop that spawns fresh Claude instances per iteration. Memory persists through git commits, `prd.json`, and `progress.txt`.

### Workflow

**Step 1: Create a PRD**
```bash
/prd
```
Use the `/prd` skill to generate a Product Requirements Document for a feature or epic. Answer clarifying questions to build detailed requirements.

**Step 2: Convert to Ralph Format**
```bash
/ralph
```
Use the `/ralph` skill to convert the PRD into `prd.json` with structured user stories.

**Step 3: Run Ralph**
```bash
./scripts/ralph/ralph.sh --tool claude 20    # Run up to 20 iterations
```

Ralph will:
1. Create a feature branch
2. Select highest-priority incomplete story
3. Implement that single story
4. Run quality checks (`npm run build && npm run lint`)
5. Commit if checks pass
6. Mark story complete in `prd.json`
7. Append learnings to `progress.txt`
8. Repeat until all stories pass

### Key Files

| File | Purpose |
|------|---------|
| `prd.json` | User stories with completion status |
| `progress.txt` | Learnings and context from previous iterations |
| `scripts/ralph/ralph.sh` | Main bash loop spawning fresh AI instances |

### Right-Sizing Stories

Stories should fit in one context window. Break down epics into small, focused tasks:
- ✅ "Add Clerk provider to layout"
- ✅ "Create database connection module"
- ✅ "Add sign-in button to header"
- ❌ "Implement full authentication system" (too big)

### Quality Checks

Every iteration must pass before committing:
```bash
npm run build
npm run lint
```

### Completion

When all stories have `passes: true` in `prd.json`, Ralph outputs `<promise>COMPLETE</promise>` and exits.

### Debugging

```bash
cat prd.json | jq '.userStories[] | {id, title, passes}'
cat progress.txt
git log --oneline -10
```

### Commands Reference

```bash
/prd                              # Generate PRD for a feature
/ralph                            # Convert PRD to prd.json format
./scripts/ralph/ralph.sh --tool claude [max_iterations]
```
