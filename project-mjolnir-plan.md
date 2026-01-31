# Project Mjölnir

**Codename:** Mjölnir (because only the worthy can wield their net worth)

**Document Type:** Project Plan

**Version:** 2.0

**Last Updated:** January 2025

---

## Executive Summary

Project Mjölnir is a personal net worth tracking dashboard that provides a clear, honest picture of financial position over time. It uses **transaction-based tracking** for tradeable assets (stocks, ETFs, crypto) and **snapshot-based tracking** for manually-valued items (superannuation, cash, debt). Live prices keep the dashboard current, while a monthly check-in modal captures everything that can't be automated.

**Hero Metric:** `Net Worth = Total Assets − Total Liabilities`

**Target User:** Single user (Roland). Not a product — a personal tool.

---

## Vision

A single source of truth for personal finances that:

- Shows net worth at a glance, updated with live prices
- Tracks growth (or decline) over time with clear visualisations
- Makes monthly check-ins a simple modal — super, cash, debt in one flow
- Separates super growth into **employer contributions**, **employee contributions**, and **investment returns**
- Handles multiple currencies (AUD, NZD, USD) with conversion to AUD for display
- Tracks debt with a single goal: drive it to zero
- Looks good enough that you actually want to use it

---

## Core Concepts

### Two Tracking Paradigms

| Paradigm | Used For | How It Works |
|----------|----------|--------------|
| **Transaction-based** | Stocks, ETFs, Crypto | Log BUY/SELL events. Current value = quantity held × live price. |
| **Snapshot-based** | Super, Cash, Debt | Log balances at points in time (monthly check-in). |

### Asset Types

| Asset Type | Tracking | Live Prices | Check-in Modal |
|------------|----------|-------------|----------------|
| **Stocks** | Transactions | Yes (Yahoo Finance) | No |
| **ETFs** | Transactions | Yes (Yahoo Finance) | No |
| **Crypto** | Transactions | Yes (CoinGecko) | No |
| **Super (active)** | Snapshots + contributions | No | Yes |
| **Super (dormant)** | Snapshots only | No | Yes (balance only) |
| **Cash** | Snapshots | No | Yes |
| **Debt** | Snapshots | No | Yes |

### Liabilities

Single combined debt balance. No itemisation by card/provider — just one number trending to zero.

### Super Growth Breakdown

For active super funds, the app calculates three growth components:

```
Investment Returns = New Balance − Old Balance − Employer Contrib − Employee Contrib
```

This enables visualisation of *why* super is growing: employer money, your money, or market returns.

---

## Data Model

### Entity Relationship Overview

```
┌─────────────────┐
│     USERS       │
│    (Clerk)      │
└────────┬────────┘
         │ 1:n
         ▼
┌─────────────────┐
│    HOLDINGS     │
│                 │
│  type: stock,   │
│  etf, crypto,   │
│  super, cash,   │
│  debt           │
└────────┬────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         │ (stocks, etfs, crypto)                  │ (super, cash, debt)
         ▼                                         ▼
┌─────────────────┐                      ┌─────────────────┐
│  TRANSACTIONS   │                      │    SNAPSHOTS    │
│                 │                      │                 │
│  BUY/SELL       │                      │  balance at     │
│  date, qty,     │                      │  point in time  │
│  price, fees    │                      │                 │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                                  │ (super only)
                                                  ▼
                                         ┌─────────────────┐
                                         │  CONTRIBUTIONS  │
                                         │                 │
                                         │  employer,      │
                                         │  employee       │
                                         └─────────────────┘
```

### Users

Managed by Clerk. Supports passkeys, Apple, Google, email — whatever's convenient.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Clerk user ID |
| email | string | Primary email |
| name | string (nullable) | Display name |
| created_at | timestamp | Account creation |

### Holdings

The central registry of everything being tracked.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | string (FK) | Clerk user ID |
| type | enum | `stock`, `etf`, `crypto`, `super`, `cash`, `debt` |
| symbol | string (nullable) | Ticker symbol (e.g., `VAS.AX`, `BTC`) |
| name | string | Human-readable name (e.g., "AustralianSuper", "Savings") |
| currency | enum | `AUD`, `NZD`, `USD` |
| exchange | string (nullable) | `ASX`, `NYSE`, `NASDAQ` (for stocks/ETFs) |
| is_dormant | boolean | For super: no contributions, balance only |
| is_active | boolean | Still holding/owing this? |
| notes | text (nullable) | User notes |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |
| deleted_at | timestamp (nullable) | Soft delete |

### Transactions

For stocks, ETFs, and crypto. Records buy/sell events.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| holding_id | UUID (FK) | Parent holding |
| date | date | Transaction date |
| action | enum | `BUY` or `SELL` |
| quantity | decimal | Units bought/sold |
| unit_price | decimal | Price per unit |
| fees | decimal | Brokerage/transaction fees |
| currency | enum | Currency of the transaction |
| notes | text (nullable) | User notes |
| created_at | timestamp | Record creation |

**Sells use FIFO** (first in, first out) for cost basis calculation.

### Snapshots

For super, cash, and debt. Records balances at points in time.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| holding_id | UUID (FK) | Parent holding |
| date | date | Snapshot date (typically end of month) |
| balance | decimal | Total balance (positive for assets, positive for debt — net worth calc handles sign) |
| currency | enum | Currency of the balance |
| notes | text (nullable) | User notes |
| created_at | timestamp | Record creation |

**Unique constraint:** One snapshot per holding per date.

### Contributions

Super-specific. Tracks employer and employee contributions alongside snapshots.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| holding_id | UUID (FK) | The super fund holding |
| date | date | Period date (matches snapshot date) |
| employer_contrib | decimal | Employer SG contribution |
| employee_contrib | decimal | Employee contribution (salary sacrifice + personal combined) |
| notes | text (nullable) | User notes |
| created_at | timestamp | Record creation |

**Investment returns** are derived at query time:
```
returns = current_balance − previous_balance − employer_contrib − employee_contrib
```

### Price Cache

Caches live prices to avoid hammering APIs.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| symbol | string | Ticker symbol |
| price | decimal | Cached price |
| currency | enum | Price currency |
| fetched_at | timestamp | When price was fetched |

**TTL:** 15 minutes. Stale prices shown with "as of X ago" indicator.

---

## Key Calculations

### Net Worth

```
Net Worth = Total Assets − Total Debt

Where:
  Total Assets =
    Sum of (stock/etf/crypto quantity × live price) +
    Sum of (latest super snapshots) +
    Sum of (latest cash snapshots)

  Total Debt = Latest debt snapshot balance
```

### Stock/ETF/Crypto Value

```
Current Value = Sum of (quantity held × live price)
Cost Basis = Sum of (buy_price × quantity + fees) for held lots
Unrealised Gain/Loss = Current Value − Cost Basis
```

### Super Investment Returns

```
Returns = New Balance − Previous Balance − Employer Contrib − Employee Contrib
```

Cumulative tracking enables stacked area charts showing growth sources over time.

### Historical Net Worth

For months with incomplete data, use **carry-forward**: the most recent snapshot before target date. Display a "stale data" indicator for holdings with old snapshots.

### Currency Conversion

All values stored in native currency. Conversion to AUD happens at display time using current exchange rates. No historical FX tracking.

---

## Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14+ (App Router)                                       │
│  TypeScript                                                     │
│  Tailwind CSS                                                   │
│  shadcn/ui (component library)                                  │
│  TanStack Query (server state & caching)                        │
│  Zustand (client state)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Clerk                                                          │
│  Passkeys, Apple, Google, Email                                 │
│  Pre-built UI components                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE                                                       │
├─────────────────────────────────────────────────────────────────┤
│  Neon (Serverless PostgreSQL)                                   │
│  Drizzle ORM (type-safe queries)                                │
│  Drizzle Kit (migrations)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL APIs                                                  │
├─────────────────────────────────────────────────────────────────┤
│  CoinGecko — cryptocurrency prices                              │
│  Yahoo Finance — ASX and US stock/ETF prices                    │
│  Exchange Rate API — USD/AUD, NZD/AUD conversion                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SCHEDULED JOBS                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Vercel Cron — monthly reminder trigger                         │
│  Resend — email delivery                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  HOSTING                                                        │
├─────────────────────────────────────────────────────────────────┤
│  Vercel                                                         │
│  Auto-deploy from GitHub                                        │
│  Preview deployments per pull request                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js (App Router) | Server components, API routes, Vercel-native |
| **Language** | TypeScript | Type safety across full stack |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **Components** | shadcn/ui | Beautiful, accessible, customisable |
| **Database** | Neon | Serverless PostgreSQL, generous free tier |
| **ORM** | Drizzle | Lightweight, type-safe, fast cold starts |
| **Auth** | Clerk | Passkeys, multiple providers, pre-built UI |
| **Server State** | TanStack Query | Caching, background refetch |
| **Client State** | Zustand | Simple, minimal boilerplate |
| **Charts** | Tremor or Recharts | Dashboard visualisations |
| **Email** | Resend | Transactional email (free tier) |
| **Cron** | Vercel Cron | Monthly reminder jobs |
| **Hosting** | Vercel | Zero-config deploys |

### External API Integration

#### CoinGecko (Crypto)
- **Endpoint:** `api.coingecko.com/api/v3/simple/price`
- **Rate Limit:** 10-30 calls/minute (free tier)
- **Caching:** 15-minute TTL in `price_cache` table

#### Yahoo Finance (Stocks/ETFs)
- **Library:** `yahoo-finance2` npm package
- **Coverage:** ASX (`.AX` suffix), NYSE, NASDAQ
- **Caching:** 15-minute TTL in `price_cache` table

#### Exchange Rates
- **Provider:** exchangerate-api.com or similar
- **Pairs:** USD/AUD, NZD/AUD
- **Caching:** Fetched on demand, cached for 1 hour

### Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Price API down | Show last cached price with "as of X ago" badge |
| Unknown symbol | Show error on holding form, prevent save |
| Invalid ticker | Show validation error, suggest correct format |
| Auth failure | Redirect to Clerk sign-in |
| DB error | Generic "something went wrong" + error logging |

---

## User Interface

### Monthly Check-in Modal

The primary data entry interface. Triggered by button click, collects all manual-entry data in one flow.

```
┌─────────────────────────────────────────────────────────────┐
│  Monthly Check-in                           [March 2024 ▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUPERANNUATION                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AustralianSuper                                AUD  │    │
│  │ Balance              [___________________]          │    │
│  │ Employer Contrib     [___________________]          │    │
│  │ Employee Contrib     [___________________]          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Kiwisaver                                      NZD  │    │
│  │ Balance              [___________________]          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  CASH                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Savings                                        AUD  │    │
│  │ Balance              [___________________]          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  DEBT                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Total Debt                                     AUD  │    │
│  │ Balance              [___________________]          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                        [Cancel]      [Save Check-in]        │
└─────────────────────────────────────────────────────────────┘
```

**Notes:**
- Month selector allows backdating (log on the 5th for previous month)
- Dormant super (Kiwisaver) shows balance only — no contribution fields
- Debt is a single combined number

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  MJÖLNIR                         [Check-in]  [+ Transaction]  [⟳]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        NET WORTH                             │  │
│  │                       $XXX,XXX                               │  │
│  │                    ▲ $X,XXX (+X.X%) this month               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │      TOTAL ASSETS       │  │       TOTAL DEBT        │          │
│  │       $XXX,XXX          │  │        $X,XXX           │          │
│  │     ▲ X.X% vs last      │  │      ▼ X.X% vs last     │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  NET WORTH OVER TIME                         │  │
│  │                     (Line Chart)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────┐  ┌───────────────────────────────────┐ │
│  │   ASSET ALLOCATION     │  │   HOLDINGS                        │ │
│  │   (Donut Chart)        │  │                                   │ │
│  │                        │  │   Super         $XXX,XXX   XX%    │ │
│  │                        │  │   Stocks        $XX,XXX    XX%    │ │
│  │                        │  │   Crypto        $X,XXX     XX%    │ │
│  │                        │  │   Cash          $X,XXX     XX%    │ │
│  │                        │  │   ─────────────────────────────   │ │
│  │                        │  │   Debt         -$X,XXX            │ │
│  └────────────────────────┘  └───────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Key Charts

| Chart | Type | Purpose |
|-------|------|---------|
| **Net Worth Over Time** | Line | Hero chart — total trajectory |
| **Super Growth Breakdown** | Stacked Area | Employer vs Employee vs Returns over time |
| **Super Monthly Breakdown** | Stacked Bar | Month-by-month contribution sources |
| **Asset Allocation** | Donut | Where your money is |
| **Debt Paydown** | Line (trending down) | The one that should hit zero |
| **Stock/ETF Performance** | Line | Price vs your cost basis |

### Design Principles

1. **Dark mode first** — finance dashboard, dark mode expected
2. **Information density** — meaningful data, no empty space
3. **Scannable** — key metrics visible without scrolling
4. **Mobile responsive** — usable on phone for quick checks
5. **Minimal input friction** — forms should be fast

---

## Historical Data Import

For initial data load, prepare CSVs in these formats:

### Transactions (stocks, ETFs, crypto)

```csv
date,symbol,action,quantity,unit_price,fees,currency,exchange,notes
2024-03-15,VAS.AX,BUY,10,95.50,9.50,AUD,ASX,
2024-04-20,VTI,BUY,5,245.00,0,USD,NYSE,Stake purchase
2024-03-01,BTC,BUY,0.05,62000,2.50,AUD,,Coinspot
```

### Super Snapshots

```csv
date,fund_name,balance,employer_contrib,employee_contrib,currency
2024-03-31,AustralianSuper,185000,1200,500,AUD
2024-02-28,AustralianSuper,181500,1200,0,AUD
2023-06-30,Kiwisaver,45000,0,0,NZD
```

**Note:** Use `0` for employee_contrib in historical periods where you weren't salary sacrificing.

### Debt Snapshots

```csv
date,balance,currency
2024-03-31,4500,AUD
2024-02-28,5200,AUD
```

---

## Epics

The project is split into two tracks:

- **Roland Epics (R-):** Manual setup tasks Roland does himself — accounts, credentials, infrastructure provisioning
- **Ralph Epics (W-):** Code that Ralph Wiggum builds — features, UI, business logic

Roland Epics must be completed before Ralph can start the dependent work.

---

## Roland Epics (Manual Setup)

### R-1: GitHub Repository

**Goal:** Create the project repository.

**Tasks:**
- [ ] Create new GitHub repo: `mjolnir` (private)
- [ ] Clone locally
- [ ] Add `.gitignore` for Node.js
- [ ] Initial commit

**Outputs:**
- Repository URL for Ralph to reference

---

### R-2: Clerk Setup

**Goal:** Configure authentication provider.

**Tasks:**
- [ ] Log into Clerk dashboard (clerk.com)
- [ ] Create new application: "Mjölnir"
- [ ] Enable sign-in methods: Passkeys, Apple, Google, Email
- [ ] Note down credentials:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

**Outputs:**
- Clerk publishable key
- Clerk secret key

---

### R-3: Neon Database Setup

**Goal:** Provision PostgreSQL database.

**Tasks:**
- [ ] Log into Neon dashboard (neon.tech)
- [ ] Create new project: "mjolnir"
- [ ] Create database: "mjolnir" (or use default)
- [ ] Note down connection string

**Outputs:**
- `DATABASE_URL` connection string

---

### R-4: Vercel Project Setup

**Goal:** Configure hosting and deployment.

**Tasks:**
- [ ] Log into Vercel dashboard
- [ ] Create new project, link to GitHub repo
- [ ] Configure environment variables (from R-2, R-3)
- [ ] Set up auto-deploy from `main` branch

**Outputs:**
- Vercel project URL
- Preview deployment URL pattern

---

### R-5: Resend Setup

**Goal:** Configure email service for reminders.

**Tasks:**
- [ ] Log into Resend dashboard (resend.com)
- [ ] Create API key
- [ ] Verify sending domain (or use default for testing)

**Outputs:**
- `RESEND_API_KEY`

**Note:** This can be deferred until Ralph Epic W-9 (Email Reminders).

---

### R-6: Environment Variables

**Goal:** Consolidate all credentials.

**Tasks:**
- [ ] Create `.env.local` file locally with all values
- [ ] Add all variables to Vercel project settings
- [ ] Create `.env.example` in repo (without real values)

**Required Variables:**
```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

### R-7: Historical Data Preparation

**Goal:** Prepare CSV files for import.

**Tasks:**
- [ ] Export/compile stock transaction history
- [ ] Export/compile super snapshot history
- [ ] Export/compile debt snapshot history
- [ ] Format according to CSV schemas in this document
- [ ] Validate data (dates, symbols, currencies)

**Outputs:**
- `transactions.csv`
- `super-snapshots.csv`
- `debt-snapshots.csv`

**Note:** This can be done in parallel with Ralph building the app. Required before Ralph Epic W-10 (Data Import).

---

## Ralph Epics (Code Implementation)

### W-1: Project Scaffolding

**Goal:** Set up the codebase structure and base configuration.

**Prerequisites:** R-1 (GitHub repo exists)

**Scope:**
- Next.js 14+ project with App Router
- TypeScript configuration
- Tailwind CSS setup
- shadcn/ui installation and base components
- Drizzle ORM setup with schema file (no migration yet)
- Project structure per this document
- Base layout component (header placeholder)

**Acceptance Criteria:**
- Project runs locally with `npm run dev`
- TypeScript compiles without errors
- Tailwind styles apply correctly
- shadcn/ui Button component renders
- Drizzle schema file exists (not connected yet)

**Out of Scope:**
- Database connection (needs env vars)
- Authentication
- Any features

---

### W-2: Infrastructure Integration

**Goal:** Connect to external services and deploy.

**Prerequisites:** R-2, R-3, R-4 (all credentials ready)

**Scope:**
- Drizzle database connection
- Run initial migration
- Clerk authentication integration
- Clerk middleware for protected routes
- Basic sign-in/sign-out flow
- Vercel deployment verification

**Acceptance Criteria:**
- App deploys to Vercel successfully
- User can sign in via Clerk (any provider)
- Protected routes redirect unauthenticated users
- Database connection works (can query)
- Base UI shell renders with auth state

**Out of Scope:**
- Any actual features or data entry
- Holdings, transactions, snapshots

---

### W-3: Holdings Management

**Goal:** Enable users to create and manage the registry of things they track.

**Scope:**
- Holdings CRUD (create, read, update, soft delete)
- Holdings list page
- Add holding form with type-specific fields
- Edit holding form
- Holding detail page (shell — no transaction/snapshot history yet)
- Support for all types: stock, etf, crypto, super, cash, debt
- `is_dormant` flag for passive super funds
- `is_active` toggle for archiving

**Acceptance Criteria:**
- User can add a new holding of any type
- User can view all holdings in a list
- User can edit holding details
- User can archive (soft delete) a holding
- Holdings persist in database
- Form validation prevents invalid data

**Out of Scope:**
- Transactions
- Snapshots
- Live prices
- Net worth calculation

---

### W-4: Transaction Tracking

**Goal:** Enable buy/sell event logging for tradeable assets.

**Scope:**
- Transactions table and API
- Add transaction form (holding-specific)
- Transaction history on holding detail page
- BUY and SELL action support
- FIFO sell logic for cost basis
- Quantity held calculation
- Cost basis calculation
- Transaction edit and delete

**Acceptance Criteria:**
- User can add BUY transaction for stock/etf/crypto holding
- User can add SELL transaction (FIFO applied)
- Holding detail shows transaction history
- Quantity held displays correctly after buys/sells
- Cost basis calculates correctly
- User can edit or delete transactions

**Out of Scope:**
- Live prices
- Current value display (requires live prices)
- Charts

---

### W-5: Snapshot Tracking & Monthly Check-in

**Goal:** Enable balance tracking for super, cash, and debt via a unified check-in modal.

**Scope:**
- Snapshots table and API
- Contributions table and API (super-specific)
- Monthly check-in modal component
- Month selector with backdating support
- Super section: balance + employer + employee contrib (active funds)
- Super section: balance only (dormant funds)
- Cash section: balance
- Debt section: combined balance
- Snapshot history on holding detail page
- Investment returns calculation (derived)

**Acceptance Criteria:**
- User can open check-in modal from dashboard
- User can select month (including past months)
- Modal shows all relevant holdings with appropriate fields
- Submitting saves snapshots and contributions
- Holding detail shows snapshot history
- Investment returns calculate correctly for active super

**Out of Scope:**
- Email reminders (separate epic)
- Charts (separate epic)

---

### W-6: Live Prices & Caching

**Goal:** Fetch and display live prices for tradeable assets.

**Scope:**
- Price cache table
- CoinGecko integration (crypto)
- Yahoo Finance integration (stocks/ETFs)
- Manual refresh button
- Price display on holdings list
- Price display on holding detail
- Current value calculation (quantity × price)
- Unrealised gain/loss display
- "Stale price" indicator when cache is old
- Error handling for failed price fetches

**Acceptance Criteria:**
- Live prices display for stocks/ETFs/crypto
- Prices cache with 15-minute TTL
- Manual refresh updates prices
- Failed fetches show last cached price with timestamp
- Current value calculates correctly
- Unrealised gain/loss displays

**Out of Scope:**
- Historical price fetching
- Charts

---

### W-7: Net Worth Calculation

**Goal:** Calculate and display the hero metric.

**Scope:**
- Net worth calculation logic
- Dashboard net worth hero card
- Total assets card
- Total debt card
- Month-over-month change calculation
- Carry-forward logic for missing snapshots
- "Stale data" indicator for old snapshots
- Holdings summary list on dashboard

**Acceptance Criteria:**
- Net worth displays correctly on dashboard
- Total assets and debt display correctly
- Change vs last month shows accurately
- Missing snapshots use carry-forward with indicator
- Holdings summary shows current values

**Out of Scope:**
- Charts (separate epic)
- Historical net worth over time

---

### W-8: Multi-Currency Support

**Goal:** Handle AUD, NZD, and USD with conversion to AUD for display.

**Scope:**
- Exchange rate API integration
- FX rate caching (1-hour TTL)
- Currency stored on holdings and transactions
- Display values in native currency on detail pages
- Convert to AUD for dashboard totals
- Currency formatting utilities

**Acceptance Criteria:**
- Holdings can be created in AUD, NZD, or USD
- Transactions store currency
- Detail pages show native currency values
- Dashboard totals convert everything to AUD
- FX rates cache and refresh appropriately

**Out of Scope:**
- Historical FX rates
- Currency selection preference

---

### W-9: Charts & Visualisation

**Goal:** Visualise financial data with meaningful charts.

**Scope:**
- Net worth over time (line chart)
- Asset allocation (donut chart)
- Super growth breakdown (stacked area: employer/employee/returns)
- Super monthly breakdown (stacked bar)
- Debt paydown trend (line, trending down)
- Stock/ETF performance chart (price vs cost basis)
- Date range selection for charts
- Responsive chart sizing

**Acceptance Criteria:**
- All charts render with real data
- Charts are responsive
- Date range selector works
- Super charts correctly separate growth sources
- Debt chart trends downward (hopefully)

**Out of Scope:**
- Export chart as image
- Customisable chart options

---

### W-10: Email Reminders

**Goal:** Send monthly reminder to complete check-in.

**Prerequisites:** R-5 (Resend API key)

**Scope:**
- Vercel Cron job (runs 1st of each month)
- Resend email integration
- Reminder email template
- Link directly to check-in modal
- Environment configuration for email

**Acceptance Criteria:**
- Cron job triggers on 1st of month
- Email sends successfully via Resend
- Email contains link to app check-in
- Can be tested manually

**Out of Scope:**
- Reminder preferences/opt-out (single user)
- Multiple reminder schedules

---

### W-11: Data Import

**Goal:** Load historical data from CSV files.

**Prerequisites:** R-7 (CSV files prepared)

**Scope:**
- CSV import endpoint/script
- Transaction import (stocks, ETFs, crypto)
- Snapshot import (super, cash, debt)
- Contribution import (super)
- Validation and error reporting
- Idempotent import (re-running doesn't duplicate)

**Acceptance Criteria:**
- Can import transactions CSV
- Can import snapshots CSV
- Invalid rows reported with clear errors
- Re-running import doesn't create duplicates
- Imported data displays correctly in app

**Out of Scope:**
- In-app import UI (script/API is fine)
- Automatic file detection

---

### W-12: Polish & Error Handling

**Goal:** Production-ready quality, error states, loading states, empty states.

**Scope:**
- Dark mode implementation
- Mobile responsive design
- Loading skeletons/states
- Error boundaries and fallbacks
- Empty states with helpful prompts
- Form validation feedback
- Toast notifications for actions
- 404 and error pages

**Acceptance Criteria:**
- App works in dark mode
- App is usable on mobile
- Loading states show during data fetches
- Errors display user-friendly messages
- Empty states guide user on what to do

**Out of Scope:**
- Light mode toggle (dark mode only)
- Accessibility audit (nice to have later)

---

### W-13: Data Export

**Goal:** Export data for backup or analysis.

**Scope:**
- Export holdings as CSV/JSON
- Export transactions as CSV/JSON
- Export snapshots as CSV/JSON
- Export all data as single JSON backup
- Download button in settings

**Acceptance Criteria:**
- User can export data from settings
- Export files are valid CSV/JSON
- All data included in backup export

**Out of Scope:**
- Scheduled automatic backups
- Cloud backup integration

---

## Environment Variables

```bash
# Database
DATABASE_URL=                         # Neon connection string

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # Clerk publishable key
CLERK_SECRET_KEY=                     # Clerk secret key

# External APIs
COINGECKO_API_KEY=                    # Optional, for higher rate limits
EXCHANGE_RATE_API_KEY=                # FX service API key

# Email
RESEND_API_KEY=                       # Resend API key for reminders

# App
NEXT_PUBLIC_APP_URL=                  # https://mjolnir.vercel.app
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Holding** | Any asset or liability being tracked |
| **Transaction** | A BUY or SELL event for tradeable assets |
| **Snapshot** | A point-in-time balance record for super, cash, or debt |
| **Contribution** | Employer or employee money added to super |
| **Dormant** | A super fund with no active contributions (e.g., Kiwisaver) |
| **Cost Basis** | What you paid for an asset (including fees) |
| **FIFO** | First In, First Out — sell oldest lots first |
| **Investment Returns** | Super growth that isn't from contributions |
| **Check-in** | Monthly workflow for recording manual-entry data |

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Property tracking | Out of scope — not purchasing property |
| Snapshot frequency | Monthly check-in, user-initiated with reminders |
| Historical data format | CSV import with defined schemas |
| Auth provider | Clerk (passkeys, flexibility) |
| Debt granularity | Single combined number |
| Employee contrib split | Single field (salary sacrifice for now) |

---

*Project Mjölnir v2.0 — Because your net worth should be worthy of tracking.*
