# PRD: Budget Categories & Setup (Epic B-2)

## Introduction

Add the budget system foundation to Mjolnir — budget categories, payday-aligned periods, and allocation tracking. This gives the user a way to define how much they plan to spend per category each pay cycle, forming the baseline that all future budget tracking and visualisation builds on.

## Goals

- Define default spending categories with icons and colours
- Allow configuring payday (day of month + weekend adjustment)
- Support creating budget periods aligned to pay cycles
- Allow allocating budget amounts to categories within a period
- Provide budget templates as starting points
- Validate that allocations don't exceed expected income

## User Stories

### US-001: Budget categories database schema
**Description:** As a developer, I need a budget categories table so the system can organise spending into defined buckets.

**Acceptance Criteria:**
- [ ] Create `budget_categories` table with columns: id (varchar PK, e.g. 'groceries'), name, icon (Lucide icon name), colour (hex), sort_order, is_income (boolean), is_system (boolean), created_at
- [ ] Seed default categories: bills-fixed, groceries, transport, eating-out, shopping, health, fun, income (is_income=true), uncategorised (is_system=true)
- [ ] Each category has an icon and hex colour as defined in the plan
- [ ] Generate and run migration successfully
- [ ] `npm run build && npm run lint` passes

### US-002: Payday configuration schema and utilities
**Description:** As a developer, I need payday configuration storage and date calculation utilities so budget periods align with actual pay cycles.

**Acceptance Criteria:**
- [ ] Create `payday_config` table with columns: id, payday_day (int 1-28), adjust_for_weekends (boolean), income_source_pattern (varchar), created_at, updated_at
- [ ] Create `lib/budget/payday.ts` with functions: `calculateBudgetPeriod(config, targetDate)` returns { startDate, endDate, daysInPeriod }, `findPaydayOnOrBefore(date, config)`, `findNextPayday(date, config)`, `getDaysUntilPayday(config)`
- [ ] Weekend adjustment: if payday falls on Saturday use Friday, if Sunday use Friday
- [ ] Handle month boundaries correctly (e.g. payday 28th works for February)
- [ ] Generate and run migration successfully
- [ ] `npm run build && npm run lint` passes

### US-003: Budget periods and allocations schema
**Description:** As a developer, I need tables for budget periods and category allocations so the system can track planned spending per pay cycle.

**Acceptance Criteria:**
- [ ] Create `budget_periods` table with columns: id, start_date, end_date, expected_income_cents (bigint), notes, created_at, updated_at. Unique constraint on start_date
- [ ] Create `budget_allocations` table with columns: id, budget_period_id (FK to budget_periods), category_id (FK to budget_categories), allocated_cents (bigint), created_at, updated_at. Unique constraint on (budget_period_id, category_id)
- [ ] Add indexes on budget_periods(start_date, end_date)
- [ ] Cascade delete allocations when period is deleted
- [ ] Generate and run migration successfully
- [ ] `npm run build && npm run lint` passes

### US-004: Budget categories API endpoints
**Description:** As a developer, I need API endpoints to list and manage budget categories so the UI can display and configure them.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/categories` — returns all categories sorted by sort_order
- [ ] Create `POST /api/budget/categories` — create a custom category (id, name, icon, colour)
- [ ] Create `PUT /api/budget/categories/[id]` — update category name, icon, colour, sort_order
- [ ] System categories (income, uncategorised) cannot be deleted
- [ ] All endpoints protected by Clerk auth
- [ ] Request bodies validated with Zod
- [ ] `npm run build && npm run lint` passes

### US-005: Payday configuration API endpoints
**Description:** As a developer, I need API endpoints to get and set payday configuration so the user can configure their pay cycle.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/payday` — returns current payday config (or defaults: day 15, adjust_for_weekends true)
- [ ] Create `PUT /api/budget/payday` — update payday config (payday_day, adjust_for_weekends, income_source_pattern)
- [ ] Validates payday_day is between 1 and 28
- [ ] Returns the calculated current budget period dates alongside the config
- [ ] Protected by Clerk auth, validated with Zod
- [ ] `npm run build && npm run lint` passes

### US-006: Budget periods API endpoints
**Description:** As a developer, I need API endpoints to create and manage budget periods so the user can set up monthly budgets.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/periods` — list all budget periods with their allocations, ordered by start_date desc
- [ ] Create `POST /api/budget/periods` — create a new period with expected_income_cents and allocations array
- [ ] Create `PUT /api/budget/periods/[id]` — update period income, notes, and allocations
- [ ] Create `DELETE /api/budget/periods/[id]` — delete a period and its allocations
- [ ] Validates that sum of allocations does not exceed expected_income_cents
- [ ] Protected by Clerk auth, validated with Zod
- [ ] `npm run build && npm run lint` passes

### US-007: Budget templates
**Description:** As a developer, I need pre-configured budget templates so the user can quickly set up a budget without starting from scratch.

**Acceptance Criteria:**
- [ ] Create `lib/budget/templates.ts` with three templates: "Barefoot Investor Buckets" (60/10/8/7/5/10 split + $1200 fixed groceries), "50/30/20 Rule" (35/15/10/10/10/10/5 split), "Roland's Budget" ($2129 fixed rent, $1200 fixed groceries, 8/6/8/4/8 split)
- [ ] Each template has: name, description, allocations array with category_id and either percentage or fixed_cents
- [ ] Create `GET /api/budget/templates` — returns all available templates
- [ ] Templates calculate actual dollar amounts when given an income figure
- [ ] `npm run build && npm run lint` passes

### US-008: Budget setup page
**Description:** As a user, I want a budget setup page where I can configure my payday, income, and spending allocations so I have a working budget.

**Acceptance Criteria:**
- [ ] Create `/app/budget/setup/page.tsx` — multi-step setup flow
- [ ] Step 1: Configure payday (day picker 1-28, weekend adjustment toggle)
- [ ] Step 2: Set expected monthly income (currency input)
- [ ] Step 3: Choose a template or start from scratch, then adjust allocations per category
- [ ] Each category shows: icon, name, allocated amount input, percentage of income (calculated)
- [ ] Running total shows: total allocated, unallocated (savings), savings percentage
- [ ] Validation: warn if allocations exceed income, show savings rate
- [ ] Save button creates a budget period with the configured allocations
- [ ] Dark mode styling consistent with rest of Mjolnir
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Budget categories are seeded on first migration with default icons and colours
- FR-2: Payday day must be between 1 and 28 (avoids Feb 29/30/31 issues)
- FR-3: Weekend adjustment shifts Saturday payday to Friday, Sunday to Friday
- FR-4: Budget period dates are calculated from payday config, not manually entered
- FR-5: Allocations are stored in cents (bigint) to avoid floating point issues
- FR-6: Templates calculate dollar amounts from percentages when given an income figure
- FR-7: The system warns but does not prevent over-allocation (planning tool, not enforcement)

## Non-Goals

- No budget tracking or actual spending comparison (that's B-4)
- No transaction categorisation (that's B-3)
- No Sankey visualisation (that's B-4)
- No budget history or period-over-period comparison
- No recurring budget auto-creation (manual for now)

## Technical Considerations

- Reuse existing Drizzle ORM patterns from the codebase
- Budget amounts stored in cents as bigint (consistent with UP transaction amounts)
- Payday utilities should be pure functions with no side effects for easy testing
- Category icons use Lucide icon names (already in the project via shadcn/ui)
- Category colours are hex strings for use in charts/Sankey later

## Success Metrics

- User can complete budget setup in under 2 minutes using a template
- Payday calculation handles edge cases (month boundaries, weekends, February)
- All quality checks pass: `npm run build && npm run lint`

## Open Questions

- Should the system auto-create next month's budget period when the current one ends?
- Should there be a "duplicate last period" convenience action?
