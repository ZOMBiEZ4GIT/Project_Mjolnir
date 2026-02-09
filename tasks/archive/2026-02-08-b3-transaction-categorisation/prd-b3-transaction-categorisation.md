# PRD: Transaction Categorisation (Epic B-3)

## Introduction

Add automatic and manual categorisation of UP Bank transactions against Mjolnir's budget categories. Transactions flowing in from n8n carry UP's own category IDs — this epic maps those to Mjolnir categories, detects income deposits, and provides UI for reviewing and overriding categories. The goal is 90%+ auto-categorisation accuracy with a clean workflow for handling the rest.

## Goals

- Automatically map UP category IDs to Mjolnir budget categories
- Detect salary/income deposits by description pattern matching
- Provide a transaction list UI with category filtering
- Allow manual category overrides on individual transactions
- Surface uncategorised transactions for review
- Show uncategorised count as a badge in navigation

## User Stories

### US-001: Category mapping logic
**Description:** As a developer, I need a mapping from UP category IDs to Mjolnir category IDs so transactions are auto-categorised when they arrive.

**Acceptance Criteria:**
- [ ] Create `lib/budget/categorisation.ts` with a `UP_TO_MJOLNIR_CATEGORY_MAP` constant mapping UP category IDs (e.g. 'restaurants-and-cafes', 'groceries', 'fuel') to Mjolnir category IDs (e.g. 'eating-out', 'groceries', 'transport')
- [ ] Cover all major UP categories: groceries, restaurants-and-cafes, takeaway, pubs-and-bars, coffee, fuel, public-transport, parking, tolls, car-insurance-and-maintenance, rideshare, rent, utilities, internet, mobile-phone, home-insurance, clothing-and-accessories, electronics, home-and-garden, health-and-fitness, pharmacy, medical, personal-care, entertainment, games-and-software, music-and-streaming, events-and-gigs, hobbies, gifts-and-charity, education, professional-services, government-and-tax
- [ ] Export a `mapUpCategory(upCategoryId: string | null): string` function that returns the Mjolnir category ID or 'uncategorised' if no mapping exists
- [ ] `npm run build && npm run lint` passes

### US-002: Income detection logic
**Description:** As a developer, I need to identify salary deposits automatically so income transactions are categorised correctly.

**Acceptance Criteria:**
- [ ] Add income detection to `lib/budget/categorisation.ts`
- [ ] Export `isIncomeTransaction(description: string, amount_cents: number, incomePattern: string | null): boolean`
- [ ] Detects income when: amount is positive AND (description matches the configured income_source_pattern from payday_config, OR amount exceeds a threshold like $2000)
- [ ] Income transactions get categorised as 'income' regardless of UP category
- [ ] Pattern matching is case-insensitive
- [ ] `npm run build && npm run lint` passes

### US-003: Apply categorisation on transaction ingestion
**Description:** As a developer, I need incoming transactions to be auto-categorised when they arrive from n8n so they're immediately useful for budget tracking.

**Acceptance Criteria:**
- [ ] Modify the `POST /api/up/transactions` endpoint to apply categorisation when `mjolnir_category_id` is not provided by n8n
- [ ] Check income detection first (takes priority), then UP category mapping, then fall back to 'uncategorised'
- [ ] If n8n provides a `mjolnir_category_id`, use it (n8n rules engine takes priority over server-side mapping)
- [ ] Store the mapped category in `mjolnir_category_id` column
- [ ] Also apply categorisation in the batch endpoint
- [ ] `npm run build && npm run lint` passes

### US-004: Category override API endpoint
**Description:** As a developer, I need an endpoint to change a transaction's category so the user can fix incorrect auto-categorisations.

**Acceptance Criteria:**
- [ ] Create `PUT /api/budget/transactions/[id]/category` endpoint
- [ ] Accepts `{ category_id: string }` body
- [ ] Validates category_id exists in budget_categories table
- [ ] Updates the transaction's `mjolnir_category_id`
- [ ] Protected by Clerk auth, validated with Zod
- [ ] Returns updated transaction on success, 404 if transaction not found
- [ ] `npm run build && npm run lint` passes

### US-005: Transaction list API endpoint
**Description:** As a developer, I need an endpoint to list transactions with filtering so the UI can display and search them.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/transactions` endpoint
- [ ] Supports query params: category (filter by mjolnir_category_id), status (HELD/SETTLED), from (start date), to (end date), search (text search on description/raw_text), uncategorised (boolean, filters to mjolnir_category_id = 'uncategorised')
- [ ] Returns transactions ordered by transaction_date desc, with pagination (limit/offset)
- [ ] Excludes soft-deleted transactions and internal transfers by default
- [ ] Each transaction includes: id, description, raw_text, amount_cents, status, mjolnir_category_id, category name, transaction_date, settled_at
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-006: Transaction list page
**Description:** As a user, I want to see my UP transactions in a list so I can review what's been categorised and fix any mistakes.

**Acceptance Criteria:**
- [ ] Create `/app/budget/transactions/page.tsx` — paginated transaction list
- [ ] Each row shows: date, description, amount (formatted as currency, red for debits, green for credits), category badge with icon and colour
- [ ] Category badge is a dropdown — clicking it opens a category selector to override
- [ ] Filter bar at top with: category dropdown, status toggle (All/Held/Settled), date range picker, search input
- [ ] "Uncategorised" filter quick-action button
- [ ] Pagination controls at bottom
- [ ] Dark mode styling consistent with Mjolnir
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-007: Uncategorised transaction badge
**Description:** As a user, I want to see a count of uncategorised transactions in the navigation so I know when items need my attention.

**Acceptance Criteria:**
- [ ] Create `GET /api/budget/transactions/uncategorised-count` endpoint — returns count of transactions where mjolnir_category_id = 'uncategorised' and is_transfer = false and deleted_at is null
- [ ] Create a `UncategorisedBadge` component that fetches and displays this count
- [ ] Badge shows count as a number (e.g. "3") with warning styling if > 0
- [ ] Badge shows nothing if count is 0
- [ ] Add badge to the budget navigation/sidebar next to "Transactions" link
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-008: n8n categorisation rules workflow template
**Description:** As a developer, I need an n8n workflow template for the categorisation rules engine so n8n can pre-categorise transactions before sending to Mjolnir.

**Acceptance Criteria:**
- [ ] Create `n8n/workflows/categorisation-rules.json` — importable n8n workflow (or update the existing webhook receiver workflow)
- [ ] Rules engine checks in priority order: income detection by description pattern, merchant-specific overrides (e.g. "REAL ESTATE" -> bills-fixed), UP category mapping, fallback to uncategorised
- [ ] Rules are defined as a JSON array in a Code node for easy editing
- [ ] Workflow adds `mjolnir_category_id` to the payload before forwarding to Mjolnir
- [ ] Includes example rules for Roland's known merchants (THE WORKWEARGRO for income, REAL ESTATE for rent)
- [ ] File is valid JSON

## Functional Requirements

- FR-1: Income detection takes highest priority — salary deposits must never be categorised as spending
- FR-2: n8n-provided categories take priority over server-side mapping (n8n rules engine is more specific)
- FR-3: Server-side mapping is a fallback when n8n doesn't provide a category
- FR-4: Category overrides persist — re-syncing a transaction from n8n should not overwrite a manual override
- FR-5: The uncategorised count endpoint should be fast (indexed query)
- FR-6: Transaction search is case-insensitive partial match on description and raw_text

## Non-Goals

- No learning/remembering rules from manual overrides (P2 — future epic)
- No bulk category assignment
- No category merge/split functionality
- No transaction editing beyond category changes

## Technical Considerations

- The UP category → Mjolnir category map is a static constant, not database-driven (simpler, faster)
- Income detection uses the `income_source_pattern` from `payday_config` table (set in B-2)
- Transaction list pagination should use limit/offset (simpler than cursor for this use case)
- Text search can use PostgreSQL `ILIKE` for now — no need for full-text search at this scale

## Success Metrics

- 90%+ of transactions auto-categorise correctly using UP category mapping
- Salary deposits are always detected and categorised as income
- User can override a category in 2 clicks (click badge, select new category)
- Uncategorised count updates immediately after override

## Open Questions

- Should we track category change history (audit trail)?
- Should the income threshold ($2000) be configurable?
