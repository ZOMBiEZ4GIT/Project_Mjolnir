# Mjölnir Budget Intelligence System — Full Specification

> **Purpose:** This document is the complete implementation spec for transforming Mjölnir's budget module from a generic category-based tracker into a personalised, saver-aligned financial intelligence dashboard.
>
> **Audience:** Claude Code — break this into tickets/chunks and execute sequentially. Each phase has clear inputs, outputs, and acceptance criteria.
>
> **Owner:** Roland — Tech Services Engineering Lead, WorkWear Group
>
> **Stack:** Next.js (App Router), PostgreSQL, Tailwind CSS, shadcn/ui, n8n webhooks, UP Bank API, Anthropic Claude API

---

## Table of Contents

1. [Context & Goals](#1-context--goals)
2. [The Three-Tier Budget Architecture](#2-the-three-tier-budget-architecture)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Budget Period Automation](#4-budget-period-automation)
5. [n8n Webhook Receiver Rewrite](#5-n8n-webhook-receiver-rewrite)
6. [n8n Claude Recommendation Flow Rewrite](#6-n8n-claude-recommendation-flow-rewrite)
7. [Dashboard UI — Component Specifications](#7-dashboard-ui--component-specifications)
8. [Implementation Phases](#8-implementation-phases)
9. [Appendix: Full Taxonomy Reference](#9-appendix-full-taxonomy-reference)
10. [Appendix: Roland's Financial Context Block](#10-appendix-rolands-financial-context-block)

---

## 1. Context & Goals

### What exists today

Mjölnir has a budget module with:
- Manual budget period configuration (start/end dates)
- Seven flat categories: Bills & Fixed, Groceries, Transport, Eating Out, Shopping, Health, Fun
- An allocations page where dollar amounts are assigned per category
- A Sankey-style "Budget Breakdown" chart showing income flowing into categories
- Category cards showing budgeted vs spent with progress bars
- A spending trends chart (total and by category over time)
- An "AI Recommendation" button that triggers an n8n flow → Claude API → callback with generic budget advice
- An n8n webhook receiver that categorises UP Bank transactions into the seven categories using rules + Claude fallback

### What's wrong with it

- The categories don't match how Roland's money actually works. His money lives in **UP Bank savers**, not abstract buckets.
- There's no concept of **goals** (emergency fund, homelab build, debt payoff).
- The AI recommendation flow is generic — it doesn't know Roland's financial plan, debt timeline, or goal progress.
- No sub-category or tagging system — every transaction is just "Shopping" or "Health" with no drill-down.
- Budget periods require manual configuration, but Roland always gets paid on the 14th.
- The core question "**am I on track?**" isn't answered clearly.

### What we're building

A budget system where:
1. **Savers are the top-level categories** — matching UP Bank 1:1
2. **Categories provide the drill-down** — what type of spend within each saver
3. **Tags provide flexible slicing** — merchant names, frequency, nature, custom labels
4. **Budget periods auto-generate** — 14th to 13th each month, no manual setup
5. **Goals are tracked visually** — emergency fund, homelab, debt payoff with progress and ETAs
6. **Claude recommendations are contextual** — they know the plan, the goals, the timeline, and give specific actionable advice
7. **"Budgeted vs Actual" is the core concept** — visible at every level (saver, category, tag)

---

## 2. The Three-Tier Budget Architecture

### Tier 1: Savers (where money lives)

These map 1:1 to UP Bank savers. On payday (14th), money is transferred into these savers. Each saver has a **monthly budget** amount.

| Saver ID | Display Name | Monthly Budget | Type | Notes |
|----------|-------------|---------------|------|-------|
| `rent` | 🏠 Rent | $2,129.00 | Fixed allocation | Manual bank transfer to RE agent |
| `essentials` | 💳 Essentials | $1,157.00 | Bills account | Has own BSB/account number, auto-cover |
| `food` | 🍖 Food & Transport | $904.00 | Auto-cover | Card spend pulls from this saver |
| `supplements` | 💪 Supplements | $476.00 | Auto-cover | TEMPORARY — drops post-April 2026 |
| `debt` | 💳 Debt Repayments | $351.91 | Manual payments | ANZ $300 + ZIP $51.91, both interest-free |
| `vitamins` | 💊 Vitamin Reserve | $100.00 | Savings pot | Target $500, then pauses |
| `emergency` | 🚨 Emergency Fund | $1,500.00 | Savings pot | Target $15,000, DO NOT TOUCH |
| `homelab` | 🖥️ Homelab Fund | $500.00 | Savings pot | Target $5,000, UniFi + Unraid build |
| `pearler` | 📈 Pearler Investing | $600.00 | Auto-transfer Day 2 | Increases to $2,100 after EF complete |
| `spending` | 🎮 Spending | ~$1,451.00 | Float + discretionary | What's left after all allocations |

**Key concept:** Savers like `emergency`, `homelab`, `vitamins`, and `pearler` are **savings goals**, not spending buckets. They don't have transactions flowing through them — they receive a fixed allocation on payday and accumulate toward a target. The dashboard should display these differently from spending savers.

### Tier 2: Categories (what type of spend)

Each **spending saver** (rent, essentials, food, supplements, debt, spending) has categories within it. Categories are the drill-down level.

**🏠 Rent**
| Category | Description |
|----------|------------|
| `rent` | Monthly rent payment |

**💳 Essentials**
| Category | Description |
|----------|------------|
| `utilities` | Power, gas, water |
| `internet` | Aussie Broadband |
| `insurance` | Medibank health insurance |
| `gym` | BFT membership |
| `phone` | JB Hi-Fi mobile plan (Nes's phone, penance) |
| `subscriptions-streaming` | YouTube Premium, Spotify, Apple Music, Apple TV+ |
| `subscriptions-productivity` | Microsoft 365, Proton, Chronometer |
| `subscriptions-entertainment` | Letterboxd, Marvel Unlimited, Amazon Prime, Apple Arcade |
| `subscriptions-apple` | iCloud+, AppleCare (iPhone + Watch), Fitness+ |
| `lotto` | Powerball, other lottery tickets |

**🍖 Food & Transport**
| Category | Description |
|----------|------------|
| `meal-kit` | Marley Spoon or equivalent weekly meal kit |
| `shake-ingredients` | Bananas, peanut butter, milk for daily shakes |
| `groceries` | General grocery top-ups beyond meal kit |
| `transport` | Myki, occasional Uber |
| `coffee` | Cafe coffees (not home-made) |

**💪 Supplements**
| Category | Description |
|----------|------------|
| `pre-workout` | Ghost All Out (also ADHD management) |
| `protein` | MuscleTech whey protein |
| `greens` | Ghost Greens |
| `ice-cream-mix` | Gymbod Ice Cream Powder (TEMPORARY — challenge only) |
| `vitamins` | Vitamin restocks when reserve depletes |

**💳 Debt Repayments**
| Category | Description |
|----------|------------|
| `anz-balance-transfer` | $300/month, clears Oct 2026 |
| `zip-pay` | $51.91/month, clears Jul 2026 |

**🎮 Spending (discretionary)**
| Category | Description |
|----------|------------|
| `eating-out` | Restaurants, cafes (sit-down meals) |
| `takeaway` | Uber Eats, Menulog, etc. |
| `clothing` | Clothes, shoes, accessories |
| `grooming` | Haircuts, skincare, personal care |
| `entertainment` | Cinema, events, gigs, gaming |
| `social` | Drinks with mates, group activities |
| `gifts` | Presents for others |
| `household` | Home items, cleaning supplies |
| `tech` | Gadgets, cables, accessories |
| `unexpected` | Anything that doesn't fit elsewhere |

### Tier 3: Tags (flexible labels)

Tags are **not** a fixed list. They're freeform labels attached to transactions. A transaction can have multiple tags. Tags enable cross-cutting analysis.

**Tag types (conventions, not enforced):**

| Type | Examples | Purpose |
|------|----------|---------|
| Merchant | `marley-spoon`, `woolworths`, `ghost`, `bft`, `medibank` | Know where money goes |
| Frequency | `weekly`, `fortnightly`, `monthly`, `annual`, `one-off` | Identify recurring vs ad-hoc |
| Nature | `fixed-cost`, `variable`, `discretionary`, `essential` | Understand flexibility |
| Custom | `adhd-management`, `challenge-related`, `nes-penance`, `treat`, `impulse` | Personal context |
| Temporal | `pre-challenge`, `post-challenge`, `phase-1`, `phase-2` | Track lifestyle changes |

**Tag assignment rules:**
1. n8n rules engine assigns tags for known merchants (always includes merchant name tag)
2. Claude fallback assigns tags for unknown merchants
3. Tags are stored as a JSON array on the transaction record
4. The dashboard allows manual tag editing on individual transactions

---

## 3. Database Schema Changes

### 3.1 New table: `budget_savers`

Stores the saver definitions and monthly budget amounts. This replaces the current category-based allocation system.

```sql
CREATE TABLE budget_savers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  saver_key VARCHAR(50) NOT NULL,          -- e.g., 'rent', 'essentials', 'food'
  display_name VARCHAR(100) NOT NULL,       -- e.g., '🏠 Rent', '💳 Essentials'
  emoji VARCHAR(10),                        -- e.g., '🏠'
  monthly_budget_cents INTEGER NOT NULL,    -- budget in cents
  saver_type VARCHAR(20) NOT NULL           -- 'spending' | 'savings_goal' | 'investment'
    CHECK (saver_type IN ('spending', 'savings_goal', 'investment')),
  sort_order INTEGER NOT NULL DEFAULT 0,    -- display order on dashboard
  is_active BOOLEAN NOT NULL DEFAULT true,
  colour VARCHAR(7),                        -- hex colour for charts, e.g., '#00B894'
  notes TEXT,                               -- e.g., 'TEMPORARY — drops post-April 2026'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, saver_key)
);
```

### 3.2 New table: `budget_categories`

Stores categories within each saver. These are the drill-down level.

```sql
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saver_id UUID NOT NULL REFERENCES budget_savers(id) ON DELETE CASCADE,
  category_key VARCHAR(50) NOT NULL,        -- e.g., 'utilities', 'meal-kit'
  display_name VARCHAR(100) NOT NULL,       -- e.g., 'Utilities', 'Meal Kit'
  monthly_budget_cents INTEGER,             -- optional per-category budget (NULL = no sub-budget)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(saver_id, category_key)
);
```

### 3.3 New table: `goals`

Tracks savings goals with progress and ETAs.

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  saver_id UUID REFERENCES budget_savers(id), -- links to the saver funding this goal
  name VARCHAR(100) NOT NULL,               -- e.g., 'Emergency Fund'
  target_amount_cents INTEGER NOT NULL,      -- e.g., 1500000 ($15,000)
  current_amount_cents INTEGER NOT NULL DEFAULT 0,
  monthly_contribution_cents INTEGER NOT NULL,-- e.g., 150000 ($1,500)
  target_date DATE,                          -- calculated or manual ETA
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  priority INTEGER NOT NULL DEFAULT 0,       -- display order
  colour VARCHAR(7),                         -- hex for progress bar
  icon VARCHAR(10),                          -- emoji
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.4 Modify existing: `transactions` table

Add saver, category, and tags fields. Keep existing columns for backwards compatibility during migration.

```sql
-- Add new columns
ALTER TABLE transactions ADD COLUMN saver_key VARCHAR(50);
ALTER TABLE transactions ADD COLUMN category_key VARCHAR(50);
ALTER TABLE transactions ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;

-- Index for tag queries
CREATE INDEX idx_transactions_tags ON transactions USING GIN (tags);
CREATE INDEX idx_transactions_saver ON transactions (saver_key);
CREATE INDEX idx_transactions_category ON transactions (category_key);
CREATE INDEX idx_transactions_saver_category ON transactions (saver_key, category_key);
```

### 3.5 New table: `budget_periods`

Auto-generated periods based on payday cycle. Replaces manual period configuration.

```sql
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,                  -- always the 14th (or prior Friday)
  end_date DATE NOT NULL,                    -- always the 13th of next month (or prior Friday)
  income_cents INTEGER,                      -- actual income received
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, start_date)
);
```

### 3.6 New table: `ai_recommendations`

Stores Claude's recommendation responses for historical reference and display.

```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  budget_period_id UUID REFERENCES budget_periods(id),
  overall_status VARCHAR(10) NOT NULL        -- 'green' | 'amber' | 'red'
    CHECK (overall_status IN ('green', 'amber', 'red')),
  saver_statuses JSONB NOT NULL,             -- array of saver health checks
  goal_progress JSONB NOT NULL,              -- array of goal updates
  budget_adjustments JSONB,                  -- suggested changes
  insights JSONB NOT NULL,                   -- array of insight strings
  actionable_tip TEXT NOT NULL,
  savings_projection JSONB,
  raw_response JSONB,                        -- full Claude response for debugging
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.7 Seed data

Pre-populate the savers, categories, and goals based on Roland's budget:

```sql
-- Seed script should be generated from the taxonomy in Section 2
-- and the goals defined in Section 10 (Financial Context Block)
-- Include all savers, all categories, and these goals:
--   Emergency Fund: $15,000 target, $1,500/mo, ETA Jan 2027
--   Homelab Build: $5,000 target, $500/mo, ETA Jan 2027
--   Vitamin Reserve: $500 target, $100/mo, ETA Aug 2026
--   ZIP Payoff: $269 target, $51.91/mo, clears Jul 2026
--   ANZ Payoff: $2,300 target, $300/mo, clears Oct 2026
```

---

## 4. Budget Period Automation

### Remove manual period configuration

The current flow where the user configures budget period start/end dates should be **replaced** with automatic period generation.

### Rules

1. **Payday is the 14th of each month.**
2. **If the 14th falls on a Saturday**, payday shifts to **Friday the 13th**.
3. **If the 14th falls on a Sunday**, payday shifts to **Friday the 12th**.
4. A budget period runs from **payday (inclusive)** to **the day before next payday (inclusive)**.
5. Periods should be auto-generated on app load if the current date falls outside any existing period.
6. The "Budget" page should **not** have a period configuration flow. The period dates display in the header as `14 Feb – 13 Mar 2026` (or adjusted for weekends), but are not editable.

### Implementation

```typescript
// Utility: get payday for a given month/year
function getPayday(year: number, month: number): Date {
  const fourteenth = new Date(year, month - 1, 14); // months are 0-indexed
  const dayOfWeek = fourteenth.getDay();

  if (dayOfWeek === 6) {
    // Saturday → Friday 13th
    return new Date(year, month - 1, 13);
  } else if (dayOfWeek === 0) {
    // Sunday → Friday 12th
    return new Date(year, month - 1, 12);
  }

  return fourteenth;
}

// Generate period: from this month's payday to next month's payday - 1 day
function generatePeriod(year: number, month: number) {
  const start = getPayday(year, month);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextPayday = getPayday(nextYear, nextMonth);

  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1); // day before next payday

  return { start, end };
}
```

### Auto-generation trigger

On dashboard load, check if a `budget_period` exists that contains today's date. If not, generate it and insert. This ensures periods are always available without user intervention.

---

## 5. n8n Webhook Receiver Rewrite

### Current flow (what exists)

```
UP Webhook → Validate Signature → Fetch Transaction → Skip Transfers/RoundUps
  → Map Transaction → Categorise with Rules (flat: main_category + sub_category)
  → If uncategorised → Claude Haiku fallback
  → Tag in UP → Sign & POST to Mjölnir
```

### New flow (what to build)

```
UP Webhook → Validate Signature → Fetch Transaction → Skip Transfers/RoundUps
  → Map Transaction (add saver/category/tags fields)
  → Classify with Rules (three-tier: saver + category + tags[])
  → If uncategorised → Claude fallback (returns saver + category + tags[])
  → Merge classified output
  → Tag in UP (use saver name)
  → Sign & POST to Mjölnir (new payload shape)
```

### 5.1 Updated "Map Transaction" node

The mapped transaction object should now include placeholder fields for the three-tier classification:

```javascript
const data = $input.first().json.data;
const attrs = data.attributes;
const category = data.relationships?.category?.data;

return [{ json: {
  up_transaction_id: data.id,
  description: attrs.description,
  raw_text: attrs.rawText || null,
  amount_cents: parseInt(attrs.amount.valueInBaseUnits, 10),
  status: attrs.status,
  up_category_id: category?.id || null,
  transaction_date: attrs.createdAt.split('T')[0],
  settled_at: attrs.settledAt || null,
  is_transfer: false,
  // New three-tier fields (populated by classification step)
  saver: null,
  category: null,
  tags: []
} }];
```

### 5.2 Rewritten "Categorise with Rules" node

This is the core rewrite. The rules array now maps to saver + category + tags.

```javascript
// ═══════════════════════════════════════════════════════════════════
// 🏦 MJÖLNIR TRANSACTION CLASSIFIER — THREE-TIER RULES ENGINE
// ═══════════════════════════════════════════════════════════════════
// Maps UP Bank transactions to: saver → category → tags[]
// Anything this can't classify goes to Claude for fallback
// ═══════════════════════════════════════════════════════════════════

const RULES = [
  // ──────────────────────────────────────────────────────────────
  // 💰 INCOME (positive amounts)
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'THE WORKWEARGRO', amountSign: 'positive' },
    classify: { saver: 'income', category: 'salary', tags: ['wwg', 'monthly', 'fixed'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🏠 RENT
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'REAL ESTATE' },
    classify: { saver: 'rent', category: 'rent', tags: ['monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'up_category_id', exact: 'rent' },
    classify: { saver: 'rent', category: 'rent', tags: ['monthly', 'fixed-cost'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Utilities
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'ACTIVE UTILITIES' },
    classify: { saver: 'essentials', category: 'utilities', tags: ['active-utilities', 'power', 'variable'] }
  },
  {
    match: { field: 'description', pattern: 'ORIGIN ENERGY' },
    classify: { saver: 'essentials', category: 'utilities', tags: ['origin-energy', 'power', 'variable'] }
  },
  {
    match: { field: 'description', pattern: 'AUSSIE BROADBAND' },
    classify: { saver: 'essentials', category: 'internet', tags: ['aussie-broadband', 'monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'up_category_id', exact: 'utilities' },
    classify: { saver: 'essentials', category: 'utilities', tags: ['variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'internet' },
    classify: { saver: 'essentials', category: 'internet', tags: ['monthly'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Insurance
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'MEDIBANK' },
    classify: { saver: 'essentials', category: 'insurance', tags: ['medibank', 'monthly', 'fixed-cost', 'health'] }
  },
  {
    match: { field: 'up_category_id', exact: 'home-insurance' },
    classify: { saver: 'essentials', category: 'insurance', tags: ['fixed-cost'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Gym
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'BODY FIT' },
    classify: { saver: 'essentials', category: 'gym', tags: ['bft', 'weekly', 'fixed-cost'] }
  },
  {
    match: { field: 'description', pattern: 'BFT' },
    classify: { saver: 'essentials', category: 'gym', tags: ['bft', 'weekly', 'fixed-cost'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Phone
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'JB HI-FI' },
    classify: { saver: 'essentials', category: 'phone', tags: ['jb-hifi', 'monthly', 'fixed-cost', 'nes-penance'] }
  },
  {
    match: { field: 'up_category_id', exact: 'mobile-phone' },
    classify: { saver: 'essentials', category: 'phone', tags: ['monthly', 'fixed-cost'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Subscriptions (streaming)
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'YOUTUBE' },
    classify: { saver: 'essentials', category: 'subscriptions-streaming', tags: ['youtube-premium', 'monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'description', pattern: 'SPOTIFY' },
    classify: { saver: 'essentials', category: 'subscriptions-streaming', tags: ['spotify', 'monthly', 'fixed-cost', 'nes-penance'] }
  },
  {
    match: { field: 'description', pattern: 'APPLE.COM/BILL' },
    classify: { saver: 'essentials', category: 'subscriptions-apple', tags: ['apple', 'monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'description', pattern: 'AMAZON PRIME' },
    classify: { saver: 'essentials', category: 'subscriptions-streaming', tags: ['amazon-prime', 'monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'up_category_id', exact: 'music-and-streaming' },
    classify: { saver: 'essentials', category: 'subscriptions-streaming', tags: ['monthly'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Subscriptions (productivity)
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'MICROSOFT' },
    classify: { saver: 'essentials', category: 'subscriptions-productivity', tags: ['microsoft-365', 'monthly', 'fixed-cost'] }
  },
  {
    match: { field: 'description', pattern: 'PROTON' },
    classify: { saver: 'essentials', category: 'subscriptions-productivity', tags: ['proton', 'monthly', 'fixed-cost'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 ESSENTIALS — Lotto
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'THELOTT' },
    classify: { saver: 'essentials', category: 'lotto', tags: ['powerball', 'essential'] }
  },
  {
    match: { field: 'description', pattern: 'THE LOTT' },
    classify: { saver: 'essentials', category: 'lotto', tags: ['powerball', 'essential'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🍖 FOOD & TRANSPORT — Meal Kit
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'MARLEY SPOON' },
    classify: { saver: 'food', category: 'meal-kit', tags: ['marley-spoon', 'weekly', 'fixed-cost', 'dinner'] }
  },
  {
    match: { field: 'description', pattern: 'HELLO FRESH' },
    classify: { saver: 'food', category: 'meal-kit', tags: ['hello-fresh', 'weekly', 'fixed-cost', 'dinner'] }
  },
  {
    match: { field: 'description', pattern: 'DINNERLY' },
    classify: { saver: 'food', category: 'meal-kit', tags: ['dinnerly', 'weekly', 'fixed-cost', 'dinner'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🍖 FOOD & TRANSPORT — Groceries
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'WOOLWORTHS' },
    classify: { saver: 'food', category: 'groceries', tags: ['woolworths', 'variable'] }
  },
  {
    match: { field: 'description', pattern: 'COLES' },
    classify: { saver: 'food', category: 'groceries', tags: ['coles', 'variable'] }
  },
  {
    match: { field: 'description', pattern: 'ALDI' },
    classify: { saver: 'food', category: 'groceries', tags: ['aldi', 'variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'groceries' },
    classify: { saver: 'food', category: 'groceries', tags: ['variable'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🍖 FOOD & TRANSPORT — Transport
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'MYKI' },
    classify: { saver: 'food', category: 'transport', tags: ['myki', 'weekly', 'fixed-cost', 'public-transport'] }
  },
  {
    match: { field: 'up_category_id', exact: 'public-transport' },
    classify: { saver: 'food', category: 'transport', tags: ['public-transport'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💪 SUPPLEMENTS
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'GHOST' },
    classify: { saver: 'supplements', category: 'pre-workout', tags: ['ghost', 'supplement', 'adhd-management'] }
  },
  {
    match: { field: 'description', pattern: 'NUTRITION WAREHOUSE' },
    classify: { saver: 'supplements', category: 'protein', tags: ['nutrition-warehouse', 'supplement'] }
  },
  {
    match: { field: 'description', pattern: 'GYMBOD' },
    classify: { saver: 'supplements', category: 'ice-cream-mix', tags: ['gymbod', 'supplement', 'challenge-related'] }
  },
  {
    match: { field: 'description', pattern: 'MUSCLETECH' },
    classify: { saver: 'supplements', category: 'protein', tags: ['muscletech', 'supplement'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 💳 DEBT REPAYMENTS
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'ANZ' },
    classify: { saver: 'debt', category: 'anz-balance-transfer', tags: ['anz', 'interest-free', 'monthly'] }
  },
  {
    match: { field: 'description', pattern: 'ZIP' },
    classify: { saver: 'debt', category: 'zip-pay', tags: ['zip', 'interest-free', 'monthly'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🎮 SPENDING — Eating Out / Takeaway
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'description', pattern: 'UBER EATS' },
    classify: { saver: 'spending', category: 'takeaway', tags: ['uber-eats', 'discretionary'] }
  },
  {
    match: { field: 'description', pattern: 'MENULOG' },
    classify: { saver: 'spending', category: 'takeaway', tags: ['menulog', 'discretionary'] }
  },
  {
    match: { field: 'description', pattern: 'DOORDASH' },
    classify: { saver: 'spending', category: 'takeaway', tags: ['doordash', 'discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'restaurants-and-cafes' },
    classify: { saver: 'spending', category: 'eating-out', tags: ['discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'takeaway' },
    classify: { saver: 'spending', category: 'takeaway', tags: ['discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'coffee' },
    classify: { saver: 'food', category: 'coffee', tags: ['discretionary', 'variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'pubs-and-bars' },
    classify: { saver: 'spending', category: 'social', tags: ['discretionary'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🎮 SPENDING — Shopping / Lifestyle
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'up_category_id', exact: 'clothing-and-accessories' },
    classify: { saver: 'spending', category: 'clothing', tags: ['discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'electronics' },
    classify: { saver: 'spending', category: 'tech', tags: ['discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'home-and-garden' },
    classify: { saver: 'spending', category: 'household', tags: ['variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'games-and-software' },
    classify: { saver: 'spending', category: 'entertainment', tags: ['gaming', 'discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'entertainment' },
    classify: { saver: 'spending', category: 'entertainment', tags: ['discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'events-and-gigs' },
    classify: { saver: 'spending', category: 'entertainment', tags: ['events', 'discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'hobbies' },
    classify: { saver: 'spending', category: 'entertainment', tags: ['hobbies', 'discretionary'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🎮 SPENDING — Health (non-supplement)
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'up_category_id', exact: 'personal-care' },
    classify: { saver: 'spending', category: 'grooming', tags: ['personal-care', 'variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'pharmacy' },
    classify: { saver: 'spending', category: 'unexpected', tags: ['pharmacy', 'variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'medical' },
    classify: { saver: 'spending', category: 'unexpected', tags: ['medical', 'variable'] }
  },

  // ──────────────────────────────────────────────────────────────
  // 🎮 SPENDING — Transport (non-Myki)
  // ──────────────────────────────────────────────────────────────
  {
    match: { field: 'up_category_id', exact: 'rideshare' },
    classify: { saver: 'spending', category: 'eating-out', tags: ['uber', 'rideshare', 'discretionary'] }
  },
  {
    match: { field: 'up_category_id', exact: 'fuel' },
    classify: { saver: 'spending', category: 'unexpected', tags: ['fuel', 'variable'] }
  },
  {
    match: { field: 'up_category_id', exact: 'parking' },
    classify: { saver: 'spending', category: 'unexpected', tags: ['parking', 'variable'] }
  },
];

// ═══════════════════════════════════════════════════════════════════
// 🔍 CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════

const transaction = $input.first().json;
const description = (transaction.description || '').toUpperCase();
const upCategoryId = transaction.up_category_id || '';
const amountCents = transaction.amount_cents || 0;

let result = { saver: null, category: null, tags: [] };

for (const rule of RULES) {
  const m = rule.match;
  let matched = false;

  // Check amount sign constraint
  if (m.amountSign === 'positive' && amountCents <= 0) continue;
  if (m.amountSign === 'negative' && amountCents >= 0) continue;

  // Match by field
  if (m.field === 'description') {
    matched = description.includes(m.pattern.toUpperCase());
  } else if (m.field === 'up_category_id') {
    matched = m.exact ? upCategoryId === m.exact : upCategoryId.includes(m.pattern);
  }

  if (matched) {
    result = { ...rule.classify };

    // Auto-add merchant name as tag from description
    // Extract clean merchant name (first 2-3 words of description)
    const merchantTag = description
      .split(/\s+/)
      .slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (merchantTag && !result.tags.includes(merchantTag)) {
      result.tags = [merchantTag, ...result.tags];
    }

    break;
  }
}

// Fallback: large positive amounts are likely income
if (!result.saver && amountCents > 200000) {
  result = { saver: 'income', category: 'unknown', tags: ['unknown-income'] };
}

return [{
  json: {
    ...transaction,
    saver: result.saver,
    category: result.category,
    tags: result.tags
  }
}];
```

### 5.3 Updated "Is Uncategorised?" check

Change the condition from checking `main_category === 'uncategorised'` to checking `saver === null`:

```
leftValue: {{ $json.saver }}
operator: does not exist (is null)
```

### 5.4 Rewritten Claude fallback prompt

When the rules engine can't classify a transaction, Claude receives the full taxonomy and classifies it:

```javascript
const transaction = $input.first().json;

const prompt = `You are a transaction classifier for an Australian personal finance app.

Classify this transaction into the correct saver, category, and tags.

TRANSACTION:
- Description: "${transaction.description}"
- Raw text: "${transaction.raw_text || 'N/A'}"
- Amount: $${(Math.abs(transaction.amount_cents) / 100).toFixed(2)} ${transaction.amount_cents > 0 ? '(credit)' : '(debit)'}
- UP Category: "${transaction.up_category_id || 'none'}"

VALID SAVERS AND CATEGORIES:

rent: rent
essentials: utilities, internet, insurance, gym, phone, subscriptions-streaming, subscriptions-productivity, subscriptions-entertainment, subscriptions-apple, lotto
food: meal-kit, shake-ingredients, groceries, transport, coffee
supplements: pre-workout, protein, greens, ice-cream-mix, vitamins
debt: anz-balance-transfer, zip-pay
spending: eating-out, takeaway, clothing, grooming, entertainment, social, gifts, household, tech, unexpected

If it's clearly income (salary, reimbursement, refund): saver=income, category=salary|reimbursement|refund

TAG CONVENTIONS:
- Always include a merchant name tag (lowercase, hyphenated)
- Include frequency if known: weekly, monthly, annual, one-off
- Include nature: fixed-cost, variable, discretionary, essential
- Include any relevant custom tags: adhd-management, challenge-related, supplement, treat

Respond with ONLY a JSON object, no other text:
{"saver": "...", "category": "...", "tags": ["...", "..."]}`;

return [{ json: { ...transaction, prompt } }];
```

### 5.5 Updated payload to Mjölnir

The POST to Mjölnir should now include the three-tier classification:

```json
{
  "up_transaction_id": "txn_abc123",
  "description": "MARLEY SPOON AU",
  "raw_text": "MARLEY SPOON AU Sydney",
  "amount_cents": -16860,
  "status": "SETTLED",
  "up_category_id": "groceries",
  "transaction_date": "2026-02-15",
  "settled_at": "2026-02-16T10:30:00+11:00",
  "is_transfer": false,
  "saver": "food",
  "category": "meal-kit",
  "tags": ["marley-spoon", "weekly", "fixed-cost", "dinner"]
}
```

### 5.6 Ambiguous merchants — Chemist Warehouse

Some merchants could belong to multiple savers. Chemist Warehouse is the key example — it could be vitamins (supplements saver), pharmacy (spending), or personal care (spending).

**Strategy:** Don't add Chemist Warehouse to the rules engine. Let it fall through to Claude every time. Claude can infer from the amount and context:
- $50+ → likely supplements → `saver: supplements, category: vitamins`
- $10-30 → likely pharmacy → `saver: spending, category: unexpected, tags: ['pharmacy']`
- The Claude fallback prompt handles this well because it sees the amount.

---

## 6. n8n Claude Recommendation Flow Rewrite

### Current state

The existing flow sends generic spending data to Claude and asks for budget advice. It doesn't know about goals, debt timelines, or the saver structure.

### New design

The recommendation flow should:
1. Receive **saver-level** actuals and budgets from Mjölnir
2. Receive **goal progress** data
3. Include Roland's **full financial context** as a system-level prompt
4. Return **structured, actionable** recommendations tied to specific savers and goals

### 6.1 Updated prompt structure

The "Format Claude Prompt" node should build a prompt with three sections:

**Section 1 — Static context (Roland's financial plan)**

This is the full context block from [Appendix: Roland's Financial Context Block](#10-appendix-rolands-financial-context-block). It includes income, saver structure, goals, debt timeline, known upcoming changes, and preferences. This section changes rarely — update it when the budget changes.

**Section 2 — Dynamic data (current period)**

Pulled from Mjölnir at request time:

```
CURRENT PERIOD: {startDate} to {endDate}
DAYS ELAPSED: {daysElapsed} of {totalDays}
DAYS REMAINING: {daysRemaining}
PERIOD PROGRESS: {progressPercent}%

SAVER PERFORMANCE THIS PERIOD:
{for each spending saver:}
  - {saverName}: budgeted ${budget}, spent ${actual}, {percentUsed}% used
    Pace: {paceStatus} (should be at {expectedPercent}% based on days elapsed)
    {if over pace: "⚠️ Projected to overspend by ${projectedOverspend}"}
    Categories:
      {for each category with spend:}
        - {categoryName}: ${actual} {if budgeted: "of ${budget}"}

GOAL PROGRESS:
{for each active goal:}
  - {goalName}: ${current} / ${target} ({percentComplete}%)
    Monthly contribution: ${monthly}
    ETA: {targetDate}
    On track: {yes/no}

TOP TAGS THIS PERIOD (by total spend):
  1. {tag}: ${total} ({count} transactions)
  2. ...

HISTORICAL COMPARISON (vs last 3 periods average):
{for each saver:}
  - {saverName}: this period ${actual} vs avg ${average} ({percentDiff})
```

**Section 3 — Instructions**

```
Analyse Roland's budget performance and return a JSON object with this exact structure:

{
  "healthCheck": {
    "overall": "green|amber|red",
    "summary": "One sentence overall assessment",
    "saverStatuses": [
      {
        "saverKey": "food",
        "displayName": "🍖 Food & Transport",
        "status": "green|amber|red",
        "budgetCents": 90400,
        "actualCents": 61200,
        "pacePercent": 68,
        "projectedEndCents": 95000,
        "headline": "On track. Meal kit spending is consistent."
      }
    ]
  },
  "goalProgress": [
    {
      "goalName": "Emergency Fund",
      "currentCents": 450000,
      "targetCents": 1500000,
      "percentComplete": 30,
      "onTrack": true,
      "revisedEta": "Jan 2027",
      "note": "On pace. No changes needed."
    }
  ],
  "budgetAdjustments": [
    {
      "saverKey": "supplements",
      "currentBudgetCents": 47600,
      "suggestedBudgetCents": 22000,
      "reason": "BFT challenge ended April 2026. Drop Gymbod, reduce Ghost to maintenance dose.",
      "effectiveFrom": "2026-04-14",
      "savingsCents": 25600
    }
  ],
  "insights": [
    "Specific, data-driven observation about spending patterns",
    "Comparison to previous periods with actual numbers",
    "Flag any concerning trends or positive improvements",
    "Note any upcoming milestones (debt clearing, goal completion)"
  ],
  "actionableTip": "One specific, time-bound action Roland should take this period",
  "savingsProjection": {
    "currentSavingsRatePct": 44.7,
    "projectedSavingsRatePct": 45.2,
    "monthlyFreedUpCents": 0,
    "nextMilestone": "ZIP Pay clears July 2026 — $51.91/month freed up"
  }
}

RULES:
- All monetary values in Australian cents (integer)
- Status thresholds: green = under 85% pace, amber = 85-100% pace, red = over 100% pace
- Pace = (actual / budget) vs (days elapsed / total days)
- Include ALL spending savers in saverStatuses (not savings goals)
- Include ALL active goals in goalProgress
- budgetAdjustments only when there's a genuine reason to change (not every time)
- insights should be 3-5 specific observations with real numbers
- actionableTip should reference a specific saver, category, or goal
- Return ONLY the JSON object, no markdown fences, no other text
```

### 6.2 Response parsing

The "Parse Claude Response" node stays mostly the same but validates against the new schema shape. Key changes:
- Validate `healthCheck.saverStatuses` is an array
- Validate `goalProgress` is an array
- Ensure all cent values are rounded integers
- Store `raw_response` in the `ai_recommendations` table for debugging

### 6.3 Callback payload

The signed callback to Mjölnir now includes the richer recommendation structure. Mjölnir's callback endpoint needs to accept and store this in the `ai_recommendations` table.

---

## 7. Dashboard UI — Component Specifications

### 7.0 Design Principles

- **Dark mode by default** — matches current Mjölnir aesthetic (screenshots show dark theme)
- **Budgeted vs Actual is the core concept** — every data display should show both
- **Traffic light system** — green/amber/red at every level for instant "am I ok?" reading
- **Drill-down navigation** — Saver → Category → Transaction list with tags
- **Mobile-first** — Roland checks this on his phone (iPhone 16 Pro, 393pt wide)

### 7.1 Budget Overview (replaces current Budget page)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  💰 Budget    ← Feb 14 – Mar 13, 2026 →        │
│                                                   │
│  Income: $9,168    Spent: $4,200    Saved: $4,968 │
│  ████████████████████████░░░░░░░░░░ 46% spent    │
│  Day 18 of 28 (64% through period)                │
│                                                   │
├─────────────────────────────────────────────────┤
│  📊 SPENDING SAVERS          Budget    Actual     │
│                                                   │
│  🏠 Rent                    $2,129    $2,129  ✅  │
│  ██████████████████████████████████ 100%          │
│                                                   │
│  💳 Essentials              $1,157    $  847  🟢  │
│  █████████████████████░░░░░░░░░░░░  73%          │
│  ├─ Utilities    $175   $148                      │
│  ├─ Gym          $286   $264                      │
│  ├─ Subs         $350   $310                      │
│  └─ +4 more...                                    │
│                                                   │
│  🍖 Food & Transport        $  904    $  612  🟢  │
│  ██████████████████░░░░░░░░░░░░░░░  68%          │
│                                                   │
│  💪 Supplements             $  476    $  389  🟡  │
│  ██████████████████████░░░░░░░░░░░  82%          │
│                                                   │
│  💳 Debt                    $  352    $  352  ✅  │
│  ██████████████████████████████████ 100%          │
│                                                   │
│  🎮 Spending                $1,451    $  940  🟢  │
│  ████████████████░░░░░░░░░░░░░░░░░  65%          │
│                                                   │
├─────────────────────────────────────────────────┤
│  🎯 GOALS                                        │
│                                                   │
│  🚨 Emergency Fund     $4,500 / $15,000    30%   │
│  ██████████░░░░░░░░░░░░░░░░░░░░░░░               │
│  $1,500/mo • ETA Jan 2027                         │
│                                                   │
│  🖥️ Homelab Build      $1,500 / $5,000     30%   │
│  ██████████░░░░░░░░░░░░░░░░░░░░░░░               │
│  $500/mo • ETA Jan 2027                           │
│                                                   │
│  💊 Vitamin Reserve    $  200 / $  500     40%   │
│  █████████████░░░░░░░░░░░░░░░░░░░░               │
│  $100/mo • ETA Aug 2026                           │
│                                                   │
│  💳 ZIP Payoff         $  165 / $  269     61%   │
│  ████████████████████░░░░░░░░░░░░░               │
│  $51.91/mo • Clears Jul 2026                      │
│                                                   │
│  💳 ANZ Payoff         $  900 / $2,300     39%   │
│  █████████████░░░░░░░░░░░░░░░░░░░░               │
│  $300/mo • Clears Oct 2026                        │
│                                                   │
├─────────────────────────────────────────────────┤
│  🤖 AI Check-in                    [Run Check-in] │
│  Last run: 2 days ago                              │
│                                                   │
│  Overall: 🟢 On Track                             │
│  "You're tracking well this period. Dining out    │
│   is your only amber area at $180/$200. ZIP Pay   │
│   clears in 2 months — that $52/mo goes straight  │
│   to Emergency Fund."                              │
│                                                   │
│  💡 Tip: "Set a calendar reminder for Jul 14 to   │
│   redirect ZIP's $51.91 into Emergency Fund."      │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 7.2 Saver Detail View (drill-down)

When the user taps/clicks a saver on the overview, they see the category breakdown:

```
┌─────────────────────────────────────────────────┐
│  ← Back to Budget                                 │
│                                                   │
│  💳 Essentials              $847 / $1,157  🟢    │
│  █████████████████████░░░░░░░░░░░░  73%          │
│  Day 18 of 28 — Pace: 73% vs expected 64%        │
│                                                   │
├─────────────────────────────────────────────────┤
│  Categories                    Budget    Actual    │
│                                                   │
│  🏠 Utilities               $  175    $  148      │
│  ████████████████████░░░░░░░░░  85%          🟡  │
│                                                   │
│  🏋️ Gym (BFT)               $  286    $  264      │
│  ██████████████████████████░░░  92%          🟡  │
│                                                   │
│  🛡️ Insurance               $  234    $  234      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
│  📱 Phone                   $   52    $   52      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
│  🎵 Subs (Streaming)        $   83    $   63      │
│  ██████████████████████░░░░░░░  76%          🟢  │
│                                                   │
│  🔧 Subs (Productivity)     $   28    $   28      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
│  🍎 Subs (Apple)            $   55    $   55      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
│  🎰 Lotto                   $   45    $    0      │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%           🟢  │
│                                                   │
│  🎮 Subs (Entertainment)    $   13    $   13      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
│  🌐 Internet                $  129    $  129      │
│  ██████████████████████████████  100%         ✅  │
│                                                   │
├─────────────────────────────────────────────────┤
│  Recent Transactions                               │
│                                                   │
│  Feb 28  BODY FIT TRAINING     -$66.00    gym      │
│          Tags: bft, weekly, fixed-cost              │
│  Feb 27  MEDIBANK PRIVATE     -$234.20    insurance│
│          Tags: medibank, monthly, fixed-cost        │
│  Feb 25  AUSSIE BROADBAND     -$129.00    internet │
│          Tags: aussie-broadband, monthly            │
│  ...                                                │
└─────────────────────────────────────────────────┘
```

### 7.3 Chart Specifications

#### 7.3.1 Budget vs Actual Bar Chart (primary chart, replaces Sankey)

**What it shows:** Side-by-side bars for each spending saver — budget (outlined/ghost bar) vs actual (filled bar). This is the "am I on track" chart.

**Design:**
- Horizontal bars, one row per spending saver
- Budget bar: outlined, semi-transparent fill (e.g., 20% opacity of saver colour)
- Actual bar: solid fill in saver colour
- If actual exceeds budget: the overflow portion renders in red
- A vertical dashed line at the "expected pace" position (days elapsed / total days × budget)
- Saver emoji + name on the left, dollar amounts on the right

**Library:** Recharts `BarChart` with custom bars, or a custom SVG component for more control.

**Example data shape:**
```typescript
interface SaverBarData {
  saverKey: string;
  displayName: string;
  emoji: string;
  colour: string;
  budgetCents: number;
  actualCents: number;
  expectedPaceCents: number; // budget × (daysElapsed / totalDays)
}
```

#### 7.3.2 Spending Pace Line Chart

**What it shows:** Cumulative spending over the period vs the "pace line" (where you should be).

**Design:**
- X-axis: days of the period (1–28ish)
- Y-axis: cumulative spend in dollars
- Grey dashed diagonal line: the "budget pace" — a straight line from $0 to total budget
- Coloured solid line: actual cumulative spend, plotted as each transaction comes in
- If the actual line is below the pace line: green area between them
- If above: red area between them
- Today marker: vertical dotted line

**Library:** Recharts `AreaChart` with a `ReferenceLine` for the pace.

#### 7.3.3 Category Treemap

**What it shows:** Proportional rectangles showing where money went within a saver. Larger rectangle = more spend. Colour indicates status (green/amber/red).

**Design:**
- Appears on the Saver Detail View
- Each rectangle: category name, dollar amount, percentage of saver total
- Colour: green if under pace, amber if near budget, red if over
- Tapping a rectangle shows the transaction list filtered to that category

**Library:** Recharts `Treemap` or D3 treemap.

#### 7.3.4 Goal Progress Rings

**What it shows:** Circular progress indicators for each active goal.

**Design:**
- Ring chart (donut) per goal, showing percent complete
- Centre of ring: current amount / target amount
- Below ring: monthly contribution and ETA
- Colour: goal-specific colour from `goals` table
- Completed goals show a checkmark and completion date

**Library:** Custom SVG rings or Recharts `RadialBarChart`.

#### 7.3.5 Tag Cloud / Tag Spend Table

**What it shows:** Most-used tags ranked by total spend.

**Design:**
- Table view (default): Tag name, count, total spend, avg per transaction
- Cloud view (toggle): Visual tag cloud where size = spend amount
- Clicking a tag filters the transaction list to show all transactions with that tag
- Useful for answering questions like "how much did I spend on Ghost products?" or "what's my total discretionary spend?"

#### 7.3.6 Month-over-Month Trend

**What it shows:** How each saver's spending compares across periods.

**Design:**
- Grouped bar chart or line chart
- X-axis: budget periods (Feb, Mar, Apr, etc.)
- Y-axis: spend in dollars
- One line/bar group per saver
- Budget line overlaid as a horizontal reference
- Key insight: shows if supplement spend actually dropped post-April

#### 7.3.7 Savings Waterfall

**What it shows:** How income flows into spending, savings, and goals. This replaces the Sankey chart with something more readable.

**Design:**
- Waterfall chart starting with income ($9,168)
- Each saver allocation shown as a descending block
- Colour: spending savers in warm colours, savings/goals in cool colours
- Final bar: "Remaining in Spending" — what's left
- This is essentially the payday split visualised

**Library:** Recharts or custom SVG.

### 7.4 AI Check-in Card

**What it shows:** The Claude recommendation, beautifully rendered.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  🤖 AI Check-in                                  │
│                                                   │
│  ┌───┐                                            │
│  │ 🟢│  Overall: On Track                         │
│  └───┘  "Summary sentence from Claude"            │
│                                                   │
│  ┌─ Saver Health ──────────────────────────────┐  │
│  │ 🏠 Rent        ✅  │ 💳 Essentials   🟢    │  │
│  │ 🍖 Food        🟢  │ 💪 Supps        🟡    │  │
│  │ 💳 Debt        ✅  │ 🎮 Spending     🟢    │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  📊 Insights                                      │
│  • "Dining out is at $180 of $200 budget..."      │
│  • "Supplement spend on pace for $476 target..."  │
│  • "Emergency fund on track for Jan 2027..."      │
│                                                   │
│  💡 Actionable Tip                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ "Set a calendar reminder for Jul 14 to       │  │
│  │  redirect ZIP's $51.91 into Emergency Fund." │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  Generated: Feb 28, 2026 at 8:14 PM               │
│                                   [Run Check-in]  │
└─────────────────────────────────────────────────┘
```

**Behaviour:**
- "Run Check-in" button triggers the n8n recommendation flow
- Shows loading state while waiting for callback
- Stores result in `ai_recommendations` table
- Shows most recent recommendation by default
- Can browse historical recommendations (carousel or date picker)

### 7.5 Tag Explorer Page

**A dedicated page for cross-cutting tag analysis.**

```
┌─────────────────────────────────────────────────┐
│  🏷️ Tag Explorer                                 │
│                                                   │
│  🔍 [Search tags...              ]                │
│                                                   │
│  Period: [Feb 14 – Mar 13 ▾]  [All time ▾]       │
│                                                   │
│  Top Tags by Spend                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ Tag              │ Count │ Total    │ Avg    │  │
│  ├──────────────────┼───────┼──────────┼────────┤  │
│  │ marley-spoon     │   4   │ $674.40  │$168.60 │  │
│  │ bft              │   4   │ $264.00  │ $66.00 │  │
│  │ fixed-cost       │  18   │$1,847.20 │$102.62 │  │
│  │ discretionary    │  12   │ $680.00  │ $56.67 │  │
│  │ ghost            │   2   │ $110.50  │ $55.25 │  │
│  │ weekly           │  16   │$1,420.00 │ $88.75 │  │
│  │ supplement       │   5   │ $420.30  │ $84.06 │  │
│  │ adhd-management  │   2   │ $110.50  │ $55.25 │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  Clicking a tag → filtered transaction list        │
└─────────────────────────────────────────────────┘
```

### 7.6 Transaction List (updated)

The existing transaction list should show saver, category, and tags:

```
┌─────────────────────────────────────────────────┐
│  Feb 28  BODY FIT TRAINING       -$66.00         │
│  💳 Essentials → Gym                              │
│  Tags: bft · weekly · fixed-cost                  │
│                                        [Edit ✏️] │
├─────────────────────────────────────────────────┤
│  Feb 27  WOOLWORTHS DOCKLANDS    -$32.50         │
│  🍖 Food → Groceries                              │
│  Tags: woolworths · variable · shake-ingredients   │
│                                        [Edit ✏️] │
└─────────────────────────────────────────────────┘
```

The Edit button allows manual correction of saver, category, and tags if the auto-classification got it wrong. This also feeds back into the rules engine — if Roland keeps correcting the same merchant, that's a rule to add.

---

## 8. Implementation Phases

### Phase A — Database & Schema (do first)

| # | Task | Depends on | Acceptance Criteria |
|---|------|-----------|-------------------|
| A1 | Create `budget_savers` table | — | Migration runs, table exists |
| A2 | Create `budget_categories` table | A1 | Migration runs, FK to savers works |
| A3 | Create `goals` table | A1 | Migration runs, FK to savers works |
| A4 | Create `budget_periods` table | — | Migration runs |
| A5 | Create `ai_recommendations` table | A4 | Migration runs |
| A6 | Add `saver_key`, `category_key`, `tags` to `transactions` | — | Columns added, indexes created |
| A7 | Seed savers, categories, and goals | A1, A2, A3 | All data from Section 2 inserted |
| A8 | Build period auto-generation utility | A4 | `getPayday()` and `generatePeriod()` work correctly |
| A9 | Remove manual period configuration UI | A8 | Period config flow removed, auto-generation on dashboard load |

### Phase B — n8n Flows

| # | Task | Depends on | Acceptance Criteria |
|---|------|-----------|-------------------|
| B1 | Rewrite "Categorise with Rules" node | A6 | New rules engine returns `saver`, `category`, `tags[]` |
| B2 | Rewrite Claude fallback prompt | B1 | Unknown transactions get correct three-tier classification |
| B3 | Update "Map Transaction" output shape | B1 | Payload includes `saver`, `category`, `tags` fields |
| B4 | Update "Is Uncategorised?" condition | B1 | Checks `saver === null` instead of `main_category === 'uncategorised'` |
| B5 | Update Mjölnir POST payload | B3 | New payload shape accepted by Mjölnir API |
| B6 | Update Mjölnir transaction API endpoint | A6, B5 | Stores `saver_key`, `category_key`, `tags` in transactions table |
| B7 | Rewrite recommendation prompt | A5 | Full context block + dynamic data + new response schema |
| B8 | Update recommendation response parser | B7 | Validates new schema, stores in `ai_recommendations` |
| B9 | Update recommendation callback endpoint | A5, B8 | Stores recommendation in new table |

### Phase C — Dashboard UI

| # | Task | Depends on | Acceptance Criteria |
|---|------|-----------|-------------------|
| C1 | Budget Overview page (saver progress bars) | A1, A6 | Shows all spending savers with budget vs actual |
| C2 | Goal Tracker widget | A3 | Shows all active goals with progress rings/bars |
| C3 | Saver Detail View (category drilldown) | A2, C1 | Click saver → see category breakdown |
| C4 | Budget vs Actual bar chart | C1 | Side-by-side bars per saver |
| C5 | Spending Pace line chart | C1 | Cumulative spend vs pace line |
| C6 | AI Check-in card | B8, B9 | Renders recommendation, Run button triggers flow |
| C7 | Transaction list (updated with saver/category/tags) | B6 | Shows three-tier classification, edit button |
| C8 | Tag Explorer page | A6 | Search, filter, table view of tags with spend totals |
| C9 | Category Treemap | C3 | Proportional rectangles within saver detail |
| C10 | Savings Waterfall chart | C1 | Income → saver allocations → remaining |
| C11 | Month-over-Month Trend chart | C1 | Multi-period comparison per saver |
| C12 | Mobile responsive pass | C1–C11 | All views work on iPhone 16 Pro (393pt) |

### Phase D — Enrichment (nice-to-haves, do later)

| # | Task | Depends on | Acceptance Criteria |
|---|------|-----------|-------------------|
| D1 | Historical data backfill | B1 | Re-classify existing transactions with new taxonomy |
| D2 | Manual tag editing on transactions | C7 | Edit saver/category/tags inline |
| D3 | Rule learning from manual edits | D2 | Suggest new rules when same correction made 3+ times |
| D4 | Post-challenge comparison view | C11 | Before/after on Supps saver from April |
| D5 | Chronometer health data integration | — | Future: feed nutrition data into health dashboard |
| D6 | Goal completion celebrations | C2 | Confetti / animation when a goal hits 100% |
| D7 | Anomaly alerts | C6 | Claude proactively flags unusual spend without manual trigger |

---

## 9. Appendix: Full Taxonomy Reference

### Complete Saver → Category → Example Tags mapping

```yaml
rent:
  rent: [monthly, fixed-cost]

essentials:
  utilities: [active-utilities, origin-energy, power, gas, water, variable]
  internet: [aussie-broadband, monthly, fixed-cost]
  insurance: [medibank, health, monthly, fixed-cost]
  gym: [bft, body-fit-training, weekly, fixed-cost]
  phone: [jb-hifi, monthly, fixed-cost, nes-penance]
  subscriptions-streaming: [youtube-premium, spotify, apple-music, amazon-prime, monthly, fixed-cost]
  subscriptions-productivity: [microsoft-365, proton, chronometer, monthly, fixed-cost]
  subscriptions-entertainment: [letterboxd, marvel-unlimited, apple-arcade, monthly, annual, fixed-cost]
  subscriptions-apple: [icloud, applecare-iphone, applecare-watch, fitness-plus, monthly, annual, fixed-cost]
  lotto: [powerball, the-lott, essential]

food:
  meal-kit: [marley-spoon, hello-fresh, dinnerly, weekly, fixed-cost, dinner]
  shake-ingredients: [woolworths, coles, aldi, banana, peanut-butter, milk, weekly, variable]
  groceries: [woolworths, coles, aldi, variable]
  transport: [myki, public-transport, weekly, fixed-cost]
  coffee: [cafe, discretionary, variable]

supplements:
  pre-workout: [ghost, ghost-all-out, adhd-management, supplement, monthly]
  protein: [muscletech, nutrition-warehouse, supplement, monthly]
  greens: [ghost, ghost-greens, supplement, monthly]
  ice-cream-mix: [gymbod, supplement, challenge-related, weekly]
  vitamins: [chemist-warehouse, supplement, variable]

debt:
  anz-balance-transfer: [anz, interest-free, monthly]
  zip-pay: [zip, interest-free, monthly]

spending:
  eating-out: [restaurant-name, discretionary, variable]
  takeaway: [uber-eats, menulog, doordash, discretionary, variable]
  clothing: [store-name, discretionary, variable]
  grooming: [haircut, skincare, personal-care, variable]
  entertainment: [cinema, gaming, steam, events, discretionary]
  social: [pub, bar, drinks, mates, discretionary]
  gifts: [recipient, one-off, discretionary]
  household: [cleaning, furniture, home, variable]
  tech: [gadget, cable, accessory, discretionary]
  unexpected: [medical, pharmacy, parking, one-off, variable]
```

---

## 10. Appendix: Roland's Financial Context Block

This is the static context that the Claude recommendation flow should include in every prompt. Update this when the budget structure changes.

```text
You are Roland's personal finance advisor. You know his complete financial situation and goals. Your job is to give specific, data-driven advice — not generic tips.

═══════════════════════════════════════════════════════
PERSONAL CONTEXT
═══════════════════════════════════════════════════════

Name: Roland
Location: Melbourne, Australia (postcode 3003)
Job: Tech Services Engineering Lead at WorkWear Group (WWG)
Take-home pay: $9,148.53/month + $20 YouTube reimbursement = $9,168.53/month
Payday: 14th of each month (or prior Friday if weekend)
Bank: UP Bank (savers + auto-cover system)
Investing: Pearler (ETFs)
ADHD: Uses Ghost All Out pre-workout as functional caffeine/focus replacement for stimulant medication. This is a health expense, not a luxury.
Status: Recently single (Feb 2026). Living solo. Paying for ex-partner's phone and Spotify temporarily.

═══════════════════════════════════════════════════════
SAVER STRUCTURE (payday allocations)
═══════════════════════════════════════════════════════

🏠 Rent Saver:              $2,129.00/mo  (manual transfer to RE agent)
💳 Essentials Saver:         $1,157.00/mo  (bills account, own BSB — auto-cover)
🍖 Food & Transport Saver:   $  904.00/mo  (auto-cover for card spend)
💪 Supplements Saver:        $  476.00/mo  (auto-cover — TEMPORARY, drops post-April 2026)
💳 Debt Saver:               $  351.91/mo  (ANZ $300 + ZIP $51.91)
💊 Vitamin Reserve:          $  100.00/mo  (savings pot — target $500, then pauses)
🚨 Emergency Fund:           $1,500.00/mo  (savings pot — target $15,000, DO NOT TOUCH)
🖥️ Homelab Fund:             $  500.00/mo  (savings pot — target $5,000, UniFi UDR + Unraid N6 build)
📈 Pearler Investing:        $  600.00/mo  (auto-transfer Day 2 after payday)
🎮 Spending (float):        ~$1,451.00/mo  (what's left — discretionary)

═══════════════════════════════════════════════════════
ACTIVE GOALS (in priority order)
═══════════════════════════════════════════════════════

1. 🚨 Emergency Fund:   $15,000 target @ $1,500/mo → ETA January 2027
2. 🖥️ Homelab Build:    $ 5,000 target @ $  500/mo → ETA January 2027
3. 💊 Vitamin Reserve:  $   500 target @ $  100/mo → ETA August 2026
4. 💳 ZIP Payoff:       $   269 remaining @ $51.91/mo → Clears July 2026
5. 💳 ANZ Payoff:       $ 2,300 remaining @ $300/mo  → Clears October 2026
6. 📈 Pearler Target:   $ 2,100/mo investing (after EF complete, from Feb 2027)

═══════════════════════════════════════════════════════
KNOWN UPCOMING CHANGES
═══════════════════════════════════════════════════════

• April 2026: BFT 8-week challenge ends → supplement spend drops ~$250/mo (Gymbod stops, Ghost reduces)
• July 2026: ZIP Pay clears → $51.91/mo freed up → redirect to Emergency Fund
• October 2026: ANZ Balance Transfer clears → $300/mo freed up → redirect to Emergency Fund or Pearler
• January 2027: Emergency Fund reaches $15,000 → redirect $1,500/mo to Pearler = $2,100/mo investing
• January 2027: Homelab Fund reaches $5,000 → redirect $500/mo (TBD — more investing or new goal)
• When ready: Spotify Duo → Individual saves $10/mo
• When ready: Stop paying Nes's JB Hi-Fi phone plan saves $52/mo

═══════════════════════════════════════════════════════
BUDGET RULES
═══════════════════════════════════════════════════════

• Lotto ($44.65/mo) is classified as "essential" — don't suggest cutting it
• Pre-workout ($110.50/mo) is ADHD management — don't suggest cutting it
• BFT gym ($286/mo) is non-negotiable
• Meal kit (~$169/week) replaces daily cooking — don't suggest meal prepping as cheaper alternative
• "Discretionary" spending budget is $500/mo covering: dining out $200, personal care $50, clothing $75, entertainment $100, misc $75
• Savings rate target: 44.7% in current structure
• Post-EF completion target: redirect to Pearler for $2,100/mo total investing

═══════════════════════════════════════════════════════
PERSONALITY & COMMUNICATION
═══════════════════════════════════════════════════════

• Australian — use AUD, metric, Australian English
• Has ADHD — prefers clear, structured, actionable advice
• Technically savvy — can handle data and percentages
• Responds well to direct honesty, not fluffy encouragement
• Appreciates humour (call out the Letterboxd Pro subscription if you want)
• Don't suggest generic advice like "cook at home" or "cancel subscriptions" — be specific
```

---

## End of Specification

This document contains everything needed to transform Mjölnir's budget module. Work through the implementation phases in order (A → B → C → D). Each phase's tasks can be parallelised where dependencies allow.

The core outcome: Roland opens his budget dashboard and immediately knows if he's on track — per saver, per category, per goal — with intelligent, contextual AI check-ins that understand his actual financial plan.
