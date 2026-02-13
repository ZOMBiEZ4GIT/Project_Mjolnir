# Project Mjölnir — Cashflow & Budget System

> **Phase**: Phase 3 — Cashflow Upgrade  
> **Prerequisite**: Core build complete (W-1 through W-13), UI/UX polish in progress  
> **Goal**: Transform Mjölnir from a point-in-time net worth tracker into a living financial command centre with UP Bank integration, intelligent budgeting, and AI-powered recommendations

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Security Model](#security-model)
4. [UP Bank Integration](#up-bank-integration)
5. [n8n Middleware Layer](#n8n-middleware-layer)
6. [Data Model](#data-model)
7. [Budget System Design](#budget-system-design)
8. [Sankey Visualisation](#sankey-visualisation)
9. [AI Recommendations](#ai-recommendations)
10. [Budget Categories & Framework](#budget-categories--framework)
11. [User Stories](#user-stories)
12. [Epic Definitions](#epic-definitions)
13. [API Endpoints](#api-endpoints)
14. [Implementation Notes](#implementation-notes)

---

## Executive Summary

Phase 3 adds real-time cashflow tracking to Mjölnir by integrating with UP Bank via webhooks through an n8n middleware layer. The system enables:

- **Live cash position** — Aggregated balance across all UP accounts (transaction + savers) displayed as a single "Cash" figure in net worth
- **Automated transaction ingestion** — UP transactions flow through n8n for categorisation before landing in Mjölnir
- **Monthly budget planning** — Set income expectations and spending allocations by category
- **Visual budget tracking** — Interactive Sankey diagram showing income → spending → savings flow
- **AI-powered recommendations** — Claude integration via n8n for intelligent Pay Split suggestions based on spending patterns

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cash tracking granularity | Aggregated total only | Savers are internal buckets; net worth cares about total cash, not distribution |
| UP API communication | n8n middleware only | Mjölnir never touches UP credentials; n8n handles all bank communication |
| Transaction sync | Webhook-driven (real-time) | UP supports webhooks; maximises freshness without polling limits |
| Budget period | Payday-aligned (configurable) | Real financial cycles start at payday, not calendar month |
| Budget purpose | Planning tool, not enforcement | Compare plan vs reality; adjust behaviour, not restrict it |
| Visualisation | Interactive Sankey | Clear flow visualisation; click to drill down into categories |

### Financial Context

| Parameter | Value |
|-----------|-------|
| Monthly Income (post-tax) | $9,145 |
| Fixed: Rent | $2,129 (23.3%) |
| Fixed: Food/Nutrition | $1,200 (13.1%) |
| Flexible spending | ~$2,500-3,000 |
| Target savings rate | 30%+ of income |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 3 SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              UP Bank API                                    │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │                           │                            │
│                    ▼                           ▼                            │
│            Webhook Events              API Requests                         │
│         (transaction.created)        (accounts, balances)                   │
│                    │                           │                            │
│                    └─────────────┬─────────────┘                            │
│                                  │                                          │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         n8n Instance                                  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────┐   │  │
│  │  │  Webhook    │  │  Categorisation  │  │   Claude API            │   │  │
│  │  │  Receiver   │─►│  Rules Engine    │  │   (Recommendations)     │   │  │
│  │  └─────────────┘  └────────┬─────────┘  └───────────┬─────────────┘   │  │
│  │                            │                        │                 │  │
│  │                            ▼                        ▼                 │  │
│  │                   ┌─────────────────────────────────────┐             │  │
│  │                   │      Mjölnir API Calls              │             │  │
│  │                   │  (POST /api/up/*, authenticated)    │             │  │
│  │                   └─────────────────────────────────────┘             │  │
│  │                                                                       │  │
│  │  Optional: Tag Writeback ◄──────────────────────────────► UP API     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                  │                                          │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Mjölnir Application                           │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │    Neon     │  │   Budget    │  │   Sankey    │  │    AI       │   │  │
│  │  │  PostgreSQL │  │   Engine    │  │   Dashboard │  │  Insights   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **UP Bank** sends webhook events to **n8n** when transactions occur
2. **n8n** categorises transactions using rules engine
3. **n8n** forwards categorised transactions to **Mjölnir API**
4. **Mjölnir** stores transactions and updates budget tracking
5. **Dashboard** displays Sankey visualisation and budget progress
6. **AI Recommendations** flow: Mjölnir → n8n → Claude → n8n → Mjölnir

### Key Principle: Separation of Concerns

| Component | Responsibility | Does NOT Do |
|-----------|---------------|-------------|
| **UP Bank** | Source of truth for banking data | — |
| **n8n** | Webhook handling, categorisation, UP API auth, Claude integration | Store persistent state |
| **Mjölnir** | Budget logic, visualisation, user preferences, data storage | Touch UP credentials |

---

## Security Model

> ⚠️ **Critical**: This system handles real banking data. Security is non-negotiable.

### Credential Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CREDENTIAL ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UP Bank API Token                                                          │
│  ├── Stored: n8n credential store (encrypted at rest)                       │
│  ├── Access: n8n workflows only                                             │
│  ├── Rotation: Manual, via UP app                                           │
│  └── Mjölnir access: NEVER (Mjölnir doesn't know this token exists)         │
│                                                                             │
│  n8n → Mjölnir Authentication                                               │
│  ├── Mechanism: API key + webhook signature                                 │
│  ├── API key stored: n8n credential store + Mjölnir env var                 │
│  ├── Signature: HMAC-SHA256 of request body                                 │
│  └── Validation: Mjölnir middleware validates every n8n request             │
│                                                                             │
│  Claude API Key                                                             │
│  ├── Stored: n8n credential store                                           │
│  ├── Access: n8n Claude recommendation workflow only                        │
│  └── Mjölnir access: NEVER                                                  │
│                                                                             │
│  Mjölnir Application                                                        │
│  ├── Auth: Clerk (Sign in with Apple)                                       │
│  ├── Database: Neon PostgreSQL (encrypted connections)                      │
│  └── Environment: Vercel (encrypted env vars)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### n8n → Mjölnir Request Signing

Every request from n8n to Mjölnir includes:

```typescript
// Request headers
{
  "X-Mjolnir-API-Key": "mjolnir_n8n_xxxxxxxxxxxxx",
  "X-Mjolnir-Timestamp": "1707292800",  // Unix timestamp
  "X-Mjolnir-Signature": "sha256=xxxxxxxxxxxxxxxxxxxxxxxx"
}

// Signature calculation (in n8n)
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${timestamp}.${JSON.stringify(body)}`)
  .digest('hex');

// Validation (in Mjölnir middleware)
// 1. Check timestamp is within 5 minutes
// 2. Recalculate signature
// 3. Compare using timing-safe equality
```

### Security Checklist

| Requirement | Implementation |
|-------------|----------------|
| UP token never in Mjölnir | n8n credential store only |
| n8n requests authenticated | API key + HMAC signature |
| Request replay prevention | Timestamp validation (5 min window) |
| Database encryption | Neon TLS + encrypted at rest |
| Environment variables | Vercel encrypted env vars |
| No sensitive data in logs | Redact account numbers, tokens |
| Rate limiting | n8n → Mjölnir endpoints rate limited |
| Input validation | Zod schemas on all n8n payloads |

### UP API Token Permissions

When generating UP API token, use **minimum required permissions**:

| Permission | Required | Reason |
|------------|----------|--------|
| `accounts:read` | ✅ | Fetch account list and balances |
| `transactions:read` | ✅ | Fetch transaction history |
| `webhooks:manage` | ✅ | Register/manage webhooks |
| `tags:write` | ⚪ Optional | Only if implementing tag writeback |
| `transactions:write` | ❌ | Never needed |

---

## UP Bank Integration

### UP API Overview

| Endpoint | Use Case | Rate Limit |
|----------|----------|------------|
| `GET /accounts` | List all accounts (transaction + savers) | 5 req/sec |
| `GET /accounts/{id}` | Get specific account balance | 5 req/sec |
| `GET /transactions` | List transactions (paginated) | 5 req/sec |
| `POST /webhooks` | Register webhook endpoint | 5 req/sec |
| `PUT /transactions/{id}/tags` | Add tags to transaction | 5 req/sec |

### Webhook Events

UP sends webhooks for these events:

| Event | Payload | Use Case |
|-------|---------|----------|
| `TRANSACTION_CREATED` | Full transaction object | Real-time spend tracking |
| `TRANSACTION_SETTLED` | Full transaction object | Update pending → settled |
| `TRANSACTION_DELETED` | Transaction ID | Handle reversals |

### Account Types

```typescript
type UpAccountType = 'TRANSACTIONAL' | 'SAVER';

interface UpAccount {
  id: string;
  attributes: {
    displayName: string;           // e.g., "Spending", "Rent Saver"
    accountType: UpAccountType;
    balance: {
      currencyCode: 'AUD';
      value: string;               // e.g., "12345.67"
      valueInBaseUnits: number;    // e.g., 1234567 (cents)
    };
    createdAt: string;             // ISO 8601
  };
}
```

### Transaction Structure

```typescript
interface UpTransaction {
  id: string;
  attributes: {
    status: 'HELD' | 'SETTLED';
    rawText: string | null;        // Raw merchant text
    description: string;           // Clean description
    message: string | null;        // Transfer message
    amount: {
      currencyCode: 'AUD';
      value: string;               // Negative for debits
      valueInBaseUnits: number;
    };
    settledAt: string | null;      // ISO 8601
    createdAt: string;             // ISO 8601
    category: {
      id: string;                  // e.g., "restaurants-and-cafes"
      name: string;                // e.g., "Restaurants & Cafes"
    } | null;
    parentCategory: {
      id: string;                  // e.g., "food-and-drink"
      name: string;                // e.g., "Food & Drink"
    } | null;
    tags: Array<{ id: string }>;
  };
  relationships: {
    account: { data: { id: string } };
    transferAccount: { data: { id: string } | null };  // For internal transfers
  };
}
```

### Initial Sync (90 Days)

On first connection, n8n will:

1. Fetch all accounts via `GET /accounts`
2. Fetch 90 days of transactions via `GET /transactions?filter[since]=<90-days-ago>`
3. Paginate through all results (UP uses cursor pagination)
4. Forward each transaction to Mjölnir for categorisation and storage

```typescript
// n8n workflow pseudocode
const since = new Date();
since.setDate(since.getDate() - 90);

let pageUrl = `https://api.up.com.au/api/v1/transactions?filter[since]=${since.toISOString()}&page[size]=100`;

while (pageUrl) {
  const response = await fetch(pageUrl, { headers: { Authorization: `Bearer ${UP_TOKEN}` } });
  const data = await response.json();
  
  for (const transaction of data.data) {
    await forwardToMjolnir(categorise(transaction));
  }
  
  pageUrl = data.links.next;  // null when no more pages
}
```

---

## n8n Middleware Layer

### Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         n8n WORKFLOW ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Workflow 1: UP Webhook Receiver                                            │
│  ├── Trigger: Webhook (UP Bank events)                                      │
│  ├── Validate: Check UP webhook signature                                   │
│  ├── Filter: Ignore internal transfers (Saver ↔ Transaction)               │
│  ├── Categorise: Apply rules engine                                         │
│  └── Forward: POST to Mjölnir /api/up/transactions                          │
│                                                                             │
│  Workflow 2: Balance Sync (Scheduled)                                       │
│  ├── Trigger: Cron (every 15 minutes)                                       │
│  ├── Fetch: GET /accounts from UP                                           │
│  ├── Aggregate: Sum all account balances                                    │
│  └── Forward: POST to Mjölnir /api/up/balance                               │
│                                                                             │
│  Workflow 3: Initial Sync (Manual Trigger)                                  │
│  ├── Trigger: Manual or Mjölnir API call                                    │
│  ├── Fetch: GET /transactions (90 days, paginated)                          │
│  ├── Categorise: Apply rules to each transaction                            │
│  └── Batch Forward: POST to Mjölnir /api/up/transactions/batch              │
│                                                                             │
│  Workflow 4: AI Recommendation                                              │
│  ├── Trigger: Mjölnir API call                                              │
│  ├── Receive: Income, budget, spending data                                 │
│  ├── Call: Claude API with structured prompt                                │
│  ├── Parse: Extract recommendations from response                           │
│  └── Return: POST to Mjölnir /api/up/recommendations                        │
│                                                                             │
│  Workflow 5: Tag Writeback (Optional/Bonus)                                 │
│  ├── Trigger: Mjölnir API call                                              │
│  ├── Receive: Transaction ID + tags to add                                  │
│  └── Execute: PUT /transactions/{id}/tags to UP                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Categorisation Rules Engine

n8n will apply rules to map UP transactions to Mjölnir budget categories:

```typescript
interface CategorisationRule {
  id: string;
  priority: number;  // Lower = higher priority
  match: {
    type: 'merchant' | 'category' | 'description' | 'amount';
    operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt';
    value: string | number;
  };
  action: {
    category: string;  // Mjölnir category ID
  };
}

// Example rules
const rules: CategorisationRule[] = [
  // Income detection
  {
    id: 'income-salary',
    priority: 1,
    match: { type: 'description', operator: 'contains', value: 'THE WORKWEARGRO' },
    action: { category: 'income' }
  },
  {
    id: 'income-salary-alt',
    priority: 2,
    match: { type: 'description', operator: 'contains', value: 'Workwear Group' },
    action: { category: 'income' }
  },
  
  // Fixed expenses
  {
    id: 'rent',
    priority: 10,
    match: { type: 'description', operator: 'contains', value: 'REAL ESTATE' },
    action: { category: 'bills-fixed' }
  },
  
  // Groceries (UP category mapping)
  {
    id: 'groceries',
    priority: 20,
    match: { type: 'category', operator: 'equals', value: 'groceries' },
    action: { category: 'groceries' }
  },
  
  // Eating out
  {
    id: 'eating-out-restaurants',
    priority: 20,
    match: { type: 'category', operator: 'equals', value: 'restaurants-and-cafes' },
    action: { category: 'eating-out' }
  },
  {
    id: 'eating-out-takeaway',
    priority: 20,
    match: { type: 'category', operator: 'equals', value: 'takeaway' },
    action: { category: 'eating-out' }
  },
  
  // Transport
  {
    id: 'transport-fuel',
    priority: 20,
    match: { type: 'category', operator: 'equals', value: 'fuel' },
    action: { category: 'transport' }
  },
  {
    id: 'transport-public',
    priority: 20,
    match: { type: 'category', operator: 'equals', value: 'public-transport' },
    action: { category: 'transport' }
  },
  
  // Catch-all (lowest priority)
  {
    id: 'uncategorised',
    priority: 999,
    match: { type: 'description', operator: 'regex', value: '.*' },
    action: { category: 'uncategorised' }
  }
];
```

### Internal Transfer Filtering

Transfers between UP accounts (Transaction ↔ Saver) should be **invisible** to the budget system:

```typescript
function isInternalTransfer(transaction: UpTransaction): boolean {
  return transaction.relationships.transferAccount?.data?.id != null;
}

// In n8n webhook receiver:
if (isInternalTransfer(transaction)) {
  // Skip - don't forward to Mjölnir
  return;
}
```

---

## Data Model

### New Tables

```sql
-- ============================================================================
-- UP BANK INTEGRATION TABLES
-- ============================================================================

-- UP account cache (for balance aggregation)
CREATE TABLE up_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  up_account_id VARCHAR(255) UNIQUE NOT NULL,    -- UP's account ID
  display_name VARCHAR(255) NOT NULL,             -- e.g., "Spending", "Rent Saver"
  account_type VARCHAR(50) NOT NULL,              -- 'TRANSACTIONAL' | 'SAVER'
  balance_cents BIGINT NOT NULL DEFAULT 0,        -- Balance in cents
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UP transactions (for budget tracking)
CREATE TABLE up_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  up_transaction_id VARCHAR(255) UNIQUE NOT NULL, -- UP's transaction ID
  description VARCHAR(500) NOT NULL,
  raw_text VARCHAR(500),                          -- Original merchant text
  amount_cents BIGINT NOT NULL,                   -- Negative for debits
  status VARCHAR(50) NOT NULL,                    -- 'HELD' | 'SETTLED'
  up_category_id VARCHAR(100),                    -- UP's category ID
  up_category_name VARCHAR(255),                  -- UP's category name
  mjolnir_category_id VARCHAR(100),               -- Our mapped category
  transaction_date DATE NOT NULL,                 -- Date of transaction
  settled_at TIMESTAMPTZ,                         -- When settled (null if held)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_up_transactions_date ON up_transactions(transaction_date);
CREATE INDEX idx_up_transactions_category ON up_transactions(mjolnir_category_id);
CREATE INDEX idx_up_transactions_status ON up_transactions(status);

-- ============================================================================
-- BUDGET TABLES
-- ============================================================================

-- Budget categories (custom categories)
CREATE TABLE budget_categories (
  id VARCHAR(100) PRIMARY KEY,                    -- e.g., 'groceries', 'eating-out'
  name VARCHAR(255) NOT NULL,                     -- Display name
  icon VARCHAR(50),                               -- Lucide icon name
  colour VARCHAR(7),                              -- Hex colour for Sankey
  sort_order INT NOT NULL DEFAULT 0,
  is_income BOOLEAN NOT NULL DEFAULT FALSE,       -- True for income category
  is_system BOOLEAN NOT NULL DEFAULT FALSE,       -- True for uncategorised
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Budget periods (monthly budgets)
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,                       -- Period start (payday)
  end_date DATE NOT NULL,                         -- Period end (day before next payday)
  expected_income_cents BIGINT NOT NULL,          -- Expected income for period
  notes TEXT,                                     -- Optional notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(start_date)                              -- One budget per start date
);

CREATE INDEX idx_budget_periods_dates ON budget_periods(start_date, end_date);

-- Budget allocations (category budgets within a period)
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL REFERENCES budget_categories(id),
  allocated_cents BIGINT NOT NULL,                -- Budgeted amount
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(budget_period_id, category_id)
);

-- Budget templates (saved budget presets)
CREATE TABLE budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template allocations
CREATE TABLE budget_template_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL REFERENCES budget_categories(id),
  percentage DECIMAL(5,2),                        -- % of income (optional)
  fixed_cents BIGINT,                             -- Fixed amount (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (percentage IS NOT NULL OR fixed_cents IS NOT NULL)
);

-- ============================================================================
-- USER PREFERENCES (extend existing settings)
-- ============================================================================

-- Payday configuration
CREATE TABLE payday_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payday_day INT NOT NULL CHECK (payday_day >= 1 AND payday_day <= 28),
  adjust_for_weekends BOOLEAN NOT NULL DEFAULT TRUE,  -- If payday is Sat, use Fri
  income_source_pattern VARCHAR(255),                  -- Regex/contains for income detection
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA MODEL RELATIONSHIPS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  up_accounts                                                                │
│       │                                                                     │
│       └── Aggregated → Cash holding in net worth                            │
│                                                                             │
│  up_transactions                                                            │
│       │                                                                     │
│       └── mjolnir_category_id ──► budget_categories                         │
│                                                                             │
│  budget_periods                                                             │
│       │                                                                     │
│       └── budget_allocations ──► budget_categories                          │
│                                                                             │
│  budget_templates                                                           │
│       │                                                                     │
│       └── budget_template_allocations ──► budget_categories                 │
│                                                                             │
│  payday_config                                                              │
│       │                                                                     │
│       └── Drives budget period date calculations                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Budget System Design

### Payday-Aligned Periods

Budget periods align with actual pay cycles, not calendar months:

```typescript
interface PaydayConfig {
  paydayDay: number;              // e.g., 14
  adjustForWeekends: boolean;     // If 14th is Sat, use 13th (Fri)
  incomeSourcePattern: string;    // "THE WORKWEARGRO" or "Workwear Group"
}

function calculateBudgetPeriod(paydayConfig: PaydayConfig, targetDate: Date): BudgetPeriod {
  // Find the payday on or before targetDate
  const startDate = findPaydayOnOrBefore(targetDate, paydayConfig);
  
  // End date is day before next payday
  const nextPayday = findNextPayday(startDate, paydayConfig);
  const endDate = subDays(nextPayday, 1);
  
  return {
    startDate,
    endDate,
    daysInPeriod: differenceInDays(endDate, startDate) + 1  // 28-32 days typically
  };
}

function findPaydayOnOrBefore(date: Date, config: PaydayConfig): Date {
  let payday = new Date(date.getFullYear(), date.getMonth(), config.paydayDay);
  
  // If target date is before this month's payday, use last month's
  if (date < payday) {
    payday = subMonths(payday, 1);
  }
  
  // Adjust for weekends
  if (config.adjustForWeekends) {
    const dayOfWeek = getDay(payday);
    if (dayOfWeek === 6) payday = subDays(payday, 1);  // Sat → Fri
    if (dayOfWeek === 0) payday = subDays(payday, 2);  // Sun → Fri
  }
  
  return payday;
}
```

### Days Until Payday Calculation

```typescript
function getDaysUntilPayday(paydayConfig: PaydayConfig): number {
  const today = new Date();
  const currentPeriod = calculateBudgetPeriod(paydayConfig, today);
  
  // End date + 1 = next payday
  const nextPayday = addDays(currentPeriod.endDate, 1);
  
  return differenceInDays(nextPayday, today);
}

// Display: "12 days until payday" or "Payday tomorrow!" or "Payday today! 🎉"
```

### Budget vs Actual Calculation

```typescript
interface BudgetSummary {
  period: BudgetPeriod;
  income: {
    expected: number;       // From budget_periods.expected_income_cents
    actual: number;         // Sum of income transactions
    variance: number;       // actual - expected
  };
  categories: Array<{
    id: string;
    name: string;
    budgeted: number;       // From budget_allocations
    spent: number;          // Sum of transactions in category
    remaining: number;      // budgeted - spent
    percentUsed: number;    // (spent / budgeted) * 100
    status: 'under' | 'warning' | 'over';  // <80%, 80-100%, >100%
  }>;
  totals: {
    budgeted: number;       // Sum of all allocations
    spent: number;          // Sum of all spending transactions
    unallocated: number;    // income.expected - totals.budgeted
    savings: number;        // income.actual - totals.spent
    savingsRate: number;    // (savings / income.actual) * 100
  };
  daysRemaining: number;
  daysElapsed: number;
}
```

### Budget Templates

Pre-configured budget templates to help get started:

```typescript
const budgetTemplates = {
  'barefoot-buckets': {
    name: 'Barefoot Investor Buckets',
    description: 'Based on Scott Pape\'s bucket system, adapted for spending tracking',
    allocations: [
      { category: 'bills-fixed', percentage: 60 },    // Daily Expenses bucket
      { category: 'groceries', percentage: null, fixed: 1200_00 },  // Fixed nutrition budget
      { category: 'eating-out', percentage: 10 },
      { category: 'transport', percentage: 8 },
      { category: 'shopping', percentage: 7 },
      { category: 'health', percentage: 5 },
      { category: 'fun', percentage: 10 },
    ]
  },
  '50-30-20': {
    name: '50/30/20 Rule',
    description: 'Classic budgeting: 50% needs, 30% wants, 20% savings',
    allocations: [
      { category: 'bills-fixed', percentage: 35 },
      { category: 'groceries', percentage: 15 },
      { category: 'transport', percentage: 10 },
      { category: 'eating-out', percentage: 10 },
      { category: 'shopping', percentage: 10 },
      { category: 'fun', percentage: 10 },
      { category: 'health', percentage: 5 },
      // Remaining ~5% buffer/uncategorised
    ]
  },
  'custom': {
    name: 'Roland\'s Budget',
    description: 'Custom budget based on actual spending patterns',
    allocations: [
      { category: 'bills-fixed', fixed: 2129_00 },      // Rent
      { category: 'groceries', fixed: 1200_00 },        // Nutrition goals
      { category: 'eating-out', percentage: 8 },
      { category: 'transport', percentage: 6 },
      { category: 'shopping', percentage: 8 },
      { category: 'health', percentage: 4 },
      { category: 'fun', percentage: 8 },
    ]
  }
};
```

---

## Sankey Visualisation

### Library Choice

**Primary**: [visx](https://airbnb.io/visx/) — Airbnb's low-level visualisation primitives for React

| Option | Pros | Cons |
|--------|------|------|
| **visx** ✅ | Full control, React-native, excellent docs, Sankey support via d3-sankey | More code to write |
| react-flow | Great for flowcharts | Not ideal for financial flows |
| recharts | Simple API | No native Sankey support |
| nivo | Has Sankey component | Heavier bundle, less customisation |

### Design Specifications

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SANKEY DIAGRAM DESIGN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layout:                                                                    │
│  ┌──────────┐                                        ┌──────────┐           │
│  │          │                                        │          │           │
│  │  INCOME  │═══╦═════════════════════════════════╗  │ SAVINGS  │           │
│  │          │   ║                                 ║  │          │           │
│  │  $9,145  │   ╠══► Bills & Fixed    $2,129  ───╫──│  $2,816  │           │
│  │          │   ║                                 ║  │          │           │
│  └──────────┘   ╠══► Groceries        $1,200  ───╫──│   30.8%  │           │
│                 ║                                 ║  │          │           │
│                 ╠══► Eating Out         $732  ───╫──└──────────┘           │
│                 ║                                 ║                         │
│                 ╠══► Transport          $549  ───╝                         │
│                 ║                                                           │
│                 ╠══► Shopping           $732                               │
│                 ║                                                           │
│                 ╠══► Health             $366                               │
│                 ║                                                           │
│                 ╚══► Fun                $621                               │
│                                                                             │
│  Colours:                                                                   │
│  • Income node: Purple (#8b5cf6)                                            │
│  • Category flows: Purple gradient with opacity based on % of income        │
│  • Savings node: Green (#22c55e) if positive, Red (#ef4444) if negative     │
│  • Over-budget categories: Red tint on the flow                             │
│                                                                             │
│  Interactions:                                                              │
│  • Hover flow: Highlight + tooltip with amount and %                        │
│  • Click flow: Drill down to category detail view                           │
│  • Hover node: Show all connected flows                                     │
│                                                                             │
│  Responsive:                                                                │
│  • Desktop: Full Sankey with labels                                         │
│  • Mobile: Simplified horizontal bar chart (Sankey too complex)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Structure for Sankey

```typescript
interface SankeyNode {
  id: string;
  name: string;
  value: number;        // Amount in cents
  colour: string;       // Hex colour
  type: 'income' | 'category' | 'savings';
}

interface SankeyLink {
  source: string;       // Node ID
  target: string;       // Node ID
  value: number;        // Flow amount in cents
  status?: 'under' | 'warning' | 'over';
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Example transformation
function buildSankeyData(summary: BudgetSummary): SankeyData {
  const nodes: SankeyNode[] = [
    {
      id: 'income',
      name: 'Income',
      value: summary.income.actual,
      colour: '#8b5cf6',
      type: 'income'
    },
    ...summary.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      value: cat.spent,
      colour: getCategoryColour(cat.id),
      type: 'category' as const
    })),
    {
      id: 'savings',
      name: 'Savings',
      value: summary.totals.savings,
      colour: summary.totals.savings >= 0 ? '#22c55e' : '#ef4444',
      type: 'savings'
    }
  ];
  
  const links: SankeyLink[] = [
    ...summary.categories.map(cat => ({
      source: 'income',
      target: cat.id,
      value: cat.spent,
      status: cat.status
    })),
    {
      source: 'income',
      target: 'savings',
      value: Math.max(0, summary.totals.savings)
    }
  ];
  
  return { nodes, links };
}
```

### Mobile Fallback

For mobile devices, replace Sankey with a simpler visualisation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MOBILE: HORIZONTAL BAR CHART                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Income                                    $9,145                           │
│  ████████████████████████████████████████████████  100%                     │
│                                                                             │
│  Bills & Fixed        $2,129 / $2,129                                       │
│  ████████████████████████  100% ✓                                           │
│                                                                             │
│  Groceries            $980 / $1,200                                         │
│  ██████████████████░░░░  82%                                                │
│                                                                             │
│  Eating Out           $812 / $732                                           │
│  ████████████████████████  111% ⚠️                                          │
│                                                                             │
│  Transport            $320 / $549                                           │
│  ████████████░░░░░░░░  58%                                                  │
│                                                                             │
│  ...                                                                        │
│                                                                             │
│  ─────────────────────────────────────────                                  │
│  Total Spent: $6,329 / $6,800 budgeted                                      │
│  Savings: $2,816 (30.8%)                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Recommendations

### n8n + Claude Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AI RECOMMENDATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User clicks "✨ Get AI Recommendation" in Mjölnir                       │
│                                                                             │
│  2. Mjölnir sends to n8n:                                                   │
│     {                                                                       │
│       "income": 914500,                                                     │
│       "currentBudget": { ... },                                             │
│       "last3MonthsSpending": { ... },                                       │
│       "savingsGoal": 30  // target savings rate %                           │
│     }                                                                       │
│                                                                             │
│  3. n8n calls Claude API with structured prompt:                            │
│                                                                             │
│     "Analyse this Australian's spending patterns and budget.                │
│      Income: $9,145/month (post-tax)                                        │
│      Current allocations: [...]                                             │
│      Actual spending (3 month avg): [...]                                   │
│                                                                             │
│      Provide recommendations in JSON format:                                │
│      - Suggested budget adjustments per category                            │
│      - UP Pay Split percentages to automate these allocations               │
│      - Brief explanation of reasoning                                       │
│      - One actionable tip for improving savings rate"                       │
│                                                                             │
│  4. Claude responds with structured JSON                                    │
│                                                                             │
│  5. n8n parses and returns to Mjölnir:                                      │
│     {                                                                       │
│       "suggestedBudget": { ... },                                           │
│       "paySplitConfig": {                                                   │
│         "rentSaver": { "percentage": 23.3, "amount": 2129 },                │
│         "billsSaver": { "percentage": 10, "amount": 915 },                  │
│         ...                                                                 │
│       },                                                                    │
│       "reasoning": "Based on your spending patterns...",                    │
│       "tip": "Your eating out spending is 10% over budget..."               │
│     }                                                                       │
│                                                                             │
│  6. Mjölnir displays recommendations in a modal/card                        │
│     User can: Accept All | Modify | Dismiss                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Claude Prompt Template

```typescript
const RECOMMENDATION_PROMPT = `
You are a financial advisor helping an Australian manage their budget using the UP Bank app.

## Context
- Location: Melbourne, Australia
- Monthly income (post-tax): {{income_formatted}}
- Pay day: {{payday_day}}th of each month
- Savings goal: {{savings_goal}}% of income

## Current Budget Allocations
{{#each current_budget}}
- {{name}}: ${{amount}} ({{percentage}}% of income)
{{/each}}

## Actual Spending (3-month average)
{{#each spending_avg}}
- {{name}}: ${{amount}} ({{percentage}}% of income) — {{variance_text}}
{{/each}}

## Your Task
Analyse the spending patterns and provide recommendations to:
1. Adjust budget allocations to be more realistic
2. Suggest UP Pay Split percentages to automate savings
3. Identify areas where spending can be optimised

## Response Format (JSON)
{
  "suggestedBudget": [
    { "category": "bills-fixed", "amount": 2129, "reason": "Keep as-is, rent is fixed" },
    ...
  ],
  "paySplitConfig": [
    { "saverName": "Rent", "percentage": 23.3, "amount": 2129 },
    { "saverName": "Bills", "percentage": 10, "amount": 915 },
    ...
  ],
  "insights": [
    "Your eating out spending is consistently 15% over budget. Consider...",
    ...
  ],
  "savingsProjection": {
    "currentRate": 25.5,
    "projectedRate": 32.0,
    "monthlyIncrease": 594
  },
  "actionableTip": "Set up a 'Fun Money' saver with $600 and use the UP card only for discretionary spending to stay accountable."
}

Respond ONLY with the JSON object, no additional text.
`;
```

### Recommendation UI Component

```typescript
interface AIRecommendation {
  suggestedBudget: Array<{
    category: string;
    amount: number;
    reason: string;
  }>;
  paySplitConfig: Array<{
    saverName: string;
    percentage: number;
    amount: number;
  }>;
  insights: string[];
  savingsProjection: {
    currentRate: number;
    projectedRate: number;
    monthlyIncrease: number;
  };
  actionableTip: string;
  generatedAt: string;
}

// UI states
type RecommendationState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: AIRecommendation }
  | { status: 'error'; message: string };
```

---

## Budget Categories & Framework

### Default Categories

Based on Barefoot Investor principles, adapted for spending tracking:

| ID | Name | Icon | Colour | Description |
|----|------|------|--------|-------------|
| `bills-fixed` | Bills & Fixed | `receipt` | `#8b5cf6` | Rent, utilities, insurance, subscriptions |
| `groceries` | Groceries | `shopping-cart` | `#22c55e` | Supermarket, household supplies |
| `transport` | Transport | `car` | `#3b82f6` | Fuel, public transport, parking, tolls |
| `eating-out` | Eating Out | `utensils` | `#f59e0b` | Restaurants, cafes, takeaway, coffee |
| `shopping` | Shopping | `shopping-bag` | `#ec4899` | Clothes, electronics, general purchases |
| `health` | Health | `heart-pulse` | `#ef4444` | Gym, medical, pharmacy, personal care |
| `fun` | Fun | `gamepad-2` | `#a855f7` | Entertainment, hobbies, games, events |
| `income` | Income | `wallet` | `#22c55e` | Salary, wages, other income (system) |
| `uncategorised` | Uncategorised | `help-circle` | `#71717a` | Needs manual categorisation (system) |

### UP Category Mapping

```typescript
const UP_TO_MJOLNIR_CATEGORY_MAP: Record<string, string> = {
  // Food & Drink
  'groceries': 'groceries',
  'restaurants-and-cafes': 'eating-out',
  'takeaway': 'eating-out',
  'pubs-and-bars': 'eating-out',
  'coffee': 'eating-out',
  
  // Transport
  'fuel': 'transport',
  'public-transport': 'transport',
  'parking': 'transport',
  'tolls': 'transport',
  'car-insurance-and-maintenance': 'transport',
  'rideshare': 'transport',
  
  // Home
  'rent': 'bills-fixed',
  'utilities': 'bills-fixed',
  'internet': 'bills-fixed',
  'mobile-phone': 'bills-fixed',
  'home-insurance': 'bills-fixed',
  
  // Personal
  'clothing-and-accessories': 'shopping',
  'electronics': 'shopping',
  'home-and-garden': 'shopping',
  
  // Health & Fitness
  'health-and-fitness': 'health',
  'pharmacy': 'health',
  'medical': 'health',
  'personal-care': 'health',
  
  // Entertainment
  'entertainment': 'fun',
  'games-and-software': 'fun',
  'music-and-streaming': 'fun',
  'events-and-gigs': 'fun',
  'hobbies': 'fun',
  
  // Other
  'gifts-and-charity': 'fun',
  'education': 'bills-fixed',
  'professional-services': 'bills-fixed',
  'government-and-tax': 'bills-fixed',
};
```

### Roland's Initial Budget (Based on $9,145 Income)

| Category | Amount | % of Income | Notes |
|----------|--------|-------------|-------|
| Bills & Fixed | $2,129 | 23.3% | Rent (fixed) |
| Groceries | $1,200 | 13.1% | Nutrition goals (fixed) |
| Eating Out | $730 | 8.0% | Flexible |
| Transport | $550 | 6.0% | Flexible |
| Shopping | $730 | 8.0% | Flexible |
| Health | $365 | 4.0% | Gym, etc. |
| Fun | $730 | 8.0% | Entertainment |
| **Total Budgeted** | **$6,434** | **70.4%** | — |
| **Target Savings** | **$2,711** | **29.6%** | Minimum 30% goal |

---

## User Stories

### UP Bank Integration

> As a user, I want my UP Bank transactions to automatically appear in Mjölnir so I don't have to manually enter spending data.

> As a user, I want my total cash balance (all UP accounts combined) to appear in my net worth so I see the full picture.

> As a user, I want internal transfers between my UP accounts to be hidden so they don't clutter my spending view.

### Budget Setup

> As a user, I want to set my expected monthly income so the system knows what I have to work with.

> As a user, I want to allocate budget amounts to spending categories so I have targets to track against.

> As a user, I want to use budget templates to get started quickly without overthinking.

> As a user, I want my budget period to align with my actual payday so it matches my financial reality.

### Budget Tracking

> As a user, I want to see a visual breakdown of where my money is going so I understand my spending at a glance.

> As a user, I want to see how much I've spent vs budgeted per category so I know if I'm on track.

> As a user, I want to see how many days until payday so I can pace my spending.

> As a user, I want to see my projected savings for the month so I stay motivated.

### Transaction Categorisation

> As a user, I want transactions to be automatically categorised so I don't have to manually sort everything.

> As a user, I want to see uncategorised transactions highlighted so I can review and assign them.

> As a user, I want to override automatic categories when they're wrong so my data is accurate.

### AI Recommendations

> As a user, I want AI-powered budget suggestions based on my spending patterns so I can optimise my allocations.

> As a user, I want recommended UP Pay Split percentages so I can automate my budget.

> As a user, I want insights on where I'm over/under spending so I know where to adjust.

---

## Epic Definitions

### Epic B-1: UP Bank Integration (n8n)

**Depends on**: W-2 (Authentication), n8n instance running  
**Effort**: 1.5 weeks

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| n8n Webhook Receiver | Workflow to receive UP webhook events | P0 |
| n8n Balance Sync | Scheduled workflow to sync account balances | P0 |
| n8n Initial Sync | One-time 90-day transaction import | P0 |
| n8n → Mjölnir Auth | API key + HMAC signature validation | P0 |
| Mjölnir API endpoints | `/api/up/*` endpoints for n8n to call | P0 |
| Database tables | `up_accounts`, `up_transactions` | P0 |
| Internal transfer filter | Ignore Saver ↔ Transaction transfers | P0 |
| Cash holding integration | Aggregate UP balance → net worth | P1 |

#### Deliverables

- `/lib/api/up/middleware.ts` — Request signing validation
- `/app/api/up/transactions/route.ts` — Transaction ingestion endpoint
- `/app/api/up/balance/route.ts` — Balance sync endpoint
- `/app/api/up/sync/route.ts` — Trigger initial sync
- `/lib/db/schema/up.ts` — Database schema additions
- n8n workflows (exported JSON): `up-webhook.json`, `up-balance-sync.json`, `up-initial-sync.json`

#### Acceptance Criteria

- [ ] n8n receives UP webhooks and forwards to Mjölnir
- [ ] Transactions appear in database within seconds of occurring in UP
- [ ] Internal transfers are filtered out
- [ ] Balance sync runs every 15 minutes
- [ ] Initial sync imports 90 days of history (or max available)
- [ ] All n8n → Mjölnir requests are authenticated and validated
- [ ] UP API token is never exposed to Mjölnir

---

### Epic B-2: Budget Categories & Setup

**Depends on**: B-1  
**Effort**: 1 week

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| Budget categories table | Default categories with icons/colours | P0 |
| Budget periods table | Monthly budget definitions | P0 |
| Budget allocations table | Category allocations per period | P0 |
| Payday configuration | Configurable payday with weekend adjustment | P0 |
| Budget setup UI | Page to configure income + allocations | P0 |
| Budget templates | Pre-configured budget presets | P1 |
| Template selector | Apply template to new budget | P1 |

#### Deliverables

- `/lib/db/schema/budget.ts` — Budget schema additions
- `/app/budget/setup/page.tsx` — Budget setup page
- `/components/budget/BudgetAllocationForm.tsx` — Allocation form
- `/components/budget/TemplateSelector.tsx` — Template picker
- `/lib/budget/payday.ts` — Payday calculation utilities
- `/lib/budget/templates.ts` — Default budget templates

#### Acceptance Criteria

- [ ] Can configure payday (day of month + weekend adjustment)
- [ ] Can set expected monthly income
- [ ] Can allocate amounts to each category
- [ ] Allocations + unallocated = income (validation)
- [ ] Can apply budget template as starting point
- [ ] Budget period dates calculate correctly from payday

---

### Epic B-3: Transaction Categorisation

**Depends on**: B-1, B-2  
**Effort**: 1 week

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| Auto-categorisation | Map UP categories to Mjölnir categories | P0 |
| Categorisation rules | n8n rules engine for edge cases | P0 |
| Income detection | Identify salary deposits automatically | P0 |
| Manual override | UI to recategorise transactions | P1 |
| Uncategorised queue | Review and assign uncategorised | P1 |
| Learning rules | Remember manual overrides for merchant | P2 |

#### Deliverables

- n8n workflow: `categorisation-rules.json`
- `/lib/budget/categorisation.ts` — Category mapping logic
- `/app/budget/transactions/page.tsx` — Transaction list with category filter
- `/components/budget/TransactionRow.tsx` — Transaction row with category dropdown
- `/components/budget/UncategorisedBadge.tsx` — Indicator for uncategorised count
- `/app/api/up/transactions/[id]/category/route.ts` — Category override endpoint

#### Acceptance Criteria

- [ ] 90%+ of transactions auto-categorise correctly
- [ ] Income deposits detected and categorised
- [ ] Can manually change transaction category
- [ ] Uncategorised transactions highlighted in UI
- [ ] Uncategorised count shown in navigation

---

### Epic B-4: Budget Dashboard & Sankey

**Depends on**: B-2, B-3  
**Effort**: 2 weeks

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| Budget summary API | Calculate budget vs actual | P0 |
| Sankey visualisation | Interactive flow diagram (desktop) | P0 |
| Mobile fallback | Horizontal bar chart for mobile | P0 |
| Category cards | Progress bars per category | P0 |
| Days until payday | Countdown display | P0 |
| Savings indicator | Current savings rate + projection | P0 |
| Drill-down view | Click category to see transactions | P1 |
| Period selector | Switch between budget periods | P1 |

#### Deliverables

- `/app/budget/page.tsx` — Main budget dashboard
- `/components/budget/SankeyChart.tsx` — visx Sankey implementation
- `/components/budget/MobileBudgetChart.tsx` — Mobile bar chart fallback
- `/components/budget/CategoryCard.tsx` — Category progress card
- `/components/budget/PaydayCountdown.tsx` — Days until payday
- `/components/budget/SavingsIndicator.tsx` — Savings rate display
- `/components/budget/PeriodSelector.tsx` — Budget period switcher
- `/lib/budget/summary.ts` — Budget calculation engine
- `/app/api/budget/summary/route.ts` — Summary API endpoint

#### Acceptance Criteria

- [ ] Sankey diagram renders correctly with all categories
- [ ] Flows are proportional to amounts
- [ ] Over-budget categories highlighted in red
- [ ] Clicking a flow drills down to transactions
- [ ] Mobile shows bar chart instead of Sankey
- [ ] Days until payday displays correctly
- [ ] Savings rate and projection shown
- [ ] Can switch between current and past periods

---

### Epic B-5: AI Pay Split Recommendations

**Depends on**: B-4  
**Effort**: 1 week

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| Recommendation API | Mjölnir → n8n trigger endpoint | P0 |
| n8n Claude workflow | Send data to Claude, parse response | P0 |
| Claude prompt template | Structured prompt for analysis | P0 |
| Recommendation UI | Display suggestions in modal/card | P0 |
| Accept/modify flow | Apply recommendations to budget | P1 |
| Pay Split export | Generate UP Pay Split config | P1 |

#### Deliverables

- `/app/api/budget/recommendations/route.ts` — Trigger recommendation
- n8n workflow: `claude-recommendation.json`
- `/components/budget/AIRecommendationButton.tsx` — Trigger button
- `/components/budget/RecommendationModal.tsx` — Display recommendations
- `/components/budget/PaySplitConfig.tsx` — Show recommended splits
- `/lib/budget/recommendations.ts` — Recommendation types and utils

#### Acceptance Criteria

- [ ] Can trigger AI recommendation from budget page
- [ ] Recommendations include budget adjustments and reasoning
- [ ] Pay Split percentages calculated correctly
- [ ] Can accept recommendations (updates budget allocations)
- [ ] Can modify recommendations before accepting
- [ ] Loading and error states handled gracefully

---

### Epic B-6: Budget Polish & Mobile

**Depends on**: B-4  
**Effort**: 1 week

#### Scope

| Component | Description | Priority |
|-----------|-------------|----------|
| Mobile optimisation | Touch-friendly budget UI | P0 |
| Transaction search | Filter/search transactions | P1 |
| Category management | Add/edit custom categories | P1 |
| Spending trends | Month-over-month comparison | P1 |
| Export budget data | CSV export of budget/transactions | P2 |
| Notifications | Over-budget alerts (in-app) | P2 |

#### Deliverables

- Mobile-optimised versions of all B-4 components
- `/components/budget/TransactionSearch.tsx`
- `/components/budget/CategoryManager.tsx`
- `/components/budget/SpendingTrends.tsx`
- `/app/api/budget/export/route.ts`
- Design tokens applied to all budget components

#### Acceptance Criteria

- [ ] Budget page works well on mobile
- [ ] Can search/filter transactions
- [ ] Can add custom categories
- [ ] Month-over-month trends visible
- [ ] Budget data exportable
- [ ] Consistent styling with rest of Mjölnir

---

## API Endpoints

### n8n → Mjölnir (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/up/transactions` | Ingest single transaction |
| POST | `/api/up/transactions/batch` | Ingest multiple transactions |
| POST | `/api/up/balance` | Update account balances |
| POST | `/api/up/sync/trigger` | Trigger initial sync |
| POST | `/api/budget/recommendations/callback` | Receive AI recommendations |

### Mjölnir → n8n (Webhooks)

| Trigger | n8n Webhook URL | Description |
|---------|-----------------|-------------|
| Manual | `n8n.example.com/webhook/up-sync` | Trigger initial sync |
| Manual | `n8n.example.com/webhook/ai-recommend` | Request AI recommendation |

### Frontend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budget/summary` | Get budget vs actual summary |
| GET | `/api/budget/periods` | List budget periods |
| POST | `/api/budget/periods` | Create new budget period |
| PUT | `/api/budget/periods/:id` | Update budget period |
| GET | `/api/budget/categories` | List categories |
| POST | `/api/budget/categories` | Create custom category |
| PUT | `/api/budget/categories/:id` | Update category |
| GET | `/api/budget/transactions` | List transactions with filters |
| PUT | `/api/budget/transactions/:id/category` | Override transaction category |
| GET | `/api/budget/templates` | List budget templates |
| POST | `/api/budget/recommendations` | Trigger AI recommendation |

---

## Implementation Notes

### visx Sankey Setup

```bash
npm install @visx/sankey @visx/group @visx/scale @visx/tooltip d3-sankey
```

```typescript
// Basic Sankey setup with visx
import { Sankey, sankeyLinkHorizontal } from '@visx/sankey';
import { Group } from '@visx/group';

const BudgetSankey = ({ data, width, height }) => {
  return (
    <svg width={width} height={height}>
      <Sankey
        root={data}
        size={[width, height]}
        nodeWidth={15}
        nodePadding={10}
      >
        {({ graph }) => (
          <Group>
            {/* Render nodes */}
            {graph.nodes.map((node, i) => (
              <rect
                key={`node-${i}`}
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={node.y1 - node.y0}
                fill={node.colour}
              />
            ))}
            
            {/* Render links */}
            {graph.links.map((link, i) => (
              <path
                key={`link-${i}`}
                d={sankeyLinkHorizontal()(link)}
                fill="none"
                stroke={link.source.colour}
                strokeWidth={Math.max(1, link.width)}
                strokeOpacity={0.5}
              />
            ))}
          </Group>
        )}
      </Sankey>
    </svg>
  );
};
```

### n8n Credential Configuration

1. **UP Bank API Token**
   - Type: Header Auth
   - Name: `Authorization`
   - Value: `Bearer up:yeah:xxxxxx`

2. **Mjölnir API Key**
   - Type: Header Auth
   - Name: `X-Mjolnir-API-Key`
   - Value: `mjolnir_n8n_xxxxx`

3. **Mjölnir Webhook Secret**
   - Type: Generic Credential
   - Used for HMAC signature generation

4. **Claude API Key**
   - Type: Header Auth
   - Name: `x-api-key`
   - Value: `sk-ant-xxxxx`

### Environment Variables (Mjölnir)

```env
# n8n Integration
N8N_API_KEY=mjolnir_n8n_xxxxxxxxxxxxx
N8N_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
N8N_BASE_URL=https://n8n.example.com

# These are NOT stored in Mjölnir (n8n only)
# UP_API_TOKEN=up:yeah:xxxxx
# ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Timeline Summary

| Epic | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| B-1 | UP Bank Integration (n8n) | 1.5 weeks | W-2, n8n running |
| B-2 | Budget Categories & Setup | 1 week | B-1 |
| B-3 | Transaction Categorisation | 1 week | B-1, B-2 |
| B-4 | Budget Dashboard & Sankey | 2 weeks | B-2, B-3 |
| B-5 | AI Pay Split Recommendations | 1 week | B-4 |
| B-6 | Budget Polish & Mobile | 1 week | B-4 |
| **Total** | | **7.5 weeks** | |

```
Week 1-2:   B-1 (UP Integration)
Week 2-3:   B-2 (Categories & Setup) + B-3 (Categorisation) — parallel
Week 4-5:   B-4 (Dashboard & Sankey)
Week 6:     B-5 (AI Recommendations)
Week 7:     B-6 (Polish & Mobile)
```

---

## Appendix: UP API Reference

- [UP API Documentation](https://developer.up.com.au/)
- [UP API OpenAPI Spec](https://developer.up.com.au/api/v1/openapi.json)
- [Webhook Events](https://developer.up.com.au/#webhooks)

## Appendix: n8n Resources

- [n8n Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [n8n Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/)

## Appendix: visx Resources

- [visx Sankey Examples](https://airbnb.io/visx/sankey)
- [d3-sankey Documentation](https://github.com/d3/d3-sankey)
