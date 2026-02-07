# PRD: UP Bank Integration (Epic B-1)

## Introduction

Add the Mjolnir-side infrastructure to receive banking data from UP Bank via an n8n middleware layer. Mjolnir never touches UP credentials directly — n8n handles all UP API communication, then forwards pre-processed data to authenticated Mjolnir API endpoints. This epic creates the database tables, API endpoints, request signing middleware, and n8n workflow templates needed to receive real-time transactions and balance updates.

## Goals

- Receive and store UP Bank transactions forwarded from n8n in real-time
- Aggregate UP account balances into a single "Cash (UP)" figure in net worth
- Validate all incoming n8n requests using API key + HMAC-SHA256 signatures
- Filter out internal transfers (Saver <-> Transaction) so they don't appear as spending
- Auto-create a Cash (UP) holding that updates from aggregated UP balance
- Provide n8n workflow JSON templates for webhook receiving and balance sync
- Show held (pending) transactions separately from settled ones

## User Stories

### US-001: UP integration database schema
**Description:** As a developer, I need database tables to store UP account data and transactions so the system can track banking activity.

**Acceptance Criteria:**
- [ ] Create `up_accounts` table with columns: id, up_account_id (unique), display_name, account_type ('TRANSACTIONAL' | 'SAVER'), balance_cents (bigint), last_synced_at, created_at, updated_at
- [ ] Create `up_transactions` table with columns: id, up_transaction_id (unique), description, raw_text, amount_cents (bigint, negative for debits), status ('HELD' | 'SETTLED'), up_category_id, up_category_name, mjolnir_category_id, transaction_date, settled_at, is_transfer (boolean), created_at, updated_at
- [ ] Add indexes on up_transactions: transaction_date, mjolnir_category_id, status
- [ ] Generate and run migration successfully
- [ ] `npm run build && npm run lint` passes

### US-002: n8n request signing middleware
**Description:** As a developer, I need middleware that validates incoming n8n requests so that only authenticated requests from n8n can write to UP endpoints.

**Acceptance Criteria:**
- [ ] Create middleware at `lib/api/up/middleware.ts`
- [ ] Validates `X-Mjolnir-API-Key` header against `N8N_API_KEY` env var
- [ ] Validates `X-Mjolnir-Timestamp` header is within 5 minutes of current time
- [ ] Validates `X-Mjolnir-Signature` header using HMAC-SHA256 of `${timestamp}.${body}` with `N8N_WEBHOOK_SECRET`
- [ ] Uses timing-safe comparison for signature check
- [ ] Returns 401 for invalid API key, 403 for invalid/expired signature
- [ ] Exports a reusable `validateN8nRequest(request)` function
- [ ] `npm run build && npm run lint` passes

### US-003: Transaction ingestion endpoint
**Description:** As a system, I need an API endpoint to receive individual transactions from n8n so that UP spending data flows into Mjolnir in real-time.

**Acceptance Criteria:**
- [ ] Create `POST /api/up/transactions` endpoint
- [ ] Uses n8n middleware for authentication
- [ ] Validates request body with Zod schema (up_transaction_id, description, raw_text, amount_cents, status, up_category_id, up_category_name, transaction_date, settled_at, is_transfer)
- [ ] Upserts on `up_transaction_id` — same transaction ID updates existing record (handles HELD -> SETTLED status change)
- [ ] If `is_transfer` is true, stores the transaction but marks it as a transfer (excluded from budget queries)
- [ ] Returns 200 with the stored transaction on success
- [ ] Returns 400 for validation errors with descriptive messages
- [ ] `npm run build && npm run lint` passes

### US-004: Batch transaction ingestion endpoint
**Description:** As a system, I need a batch endpoint so n8n can send multiple transactions at once efficiently.

**Acceptance Criteria:**
- [ ] Create `POST /api/up/transactions/batch` endpoint
- [ ] Uses n8n middleware for authentication
- [ ] Accepts array of transactions (same schema as single endpoint)
- [ ] Upserts each transaction within a database transaction (all-or-nothing)
- [ ] Returns 200 with count of inserted/updated records
- [ ] Returns 400 if any transaction fails validation (with index of failing record)
- [ ] Limits batch size to 500 transactions per request
- [ ] `npm run build && npm run lint` passes

### US-005: Balance sync endpoint
**Description:** As a system, I need an endpoint to receive account balance updates from n8n so Mjolnir has current cash position data.

**Acceptance Criteria:**
- [ ] Create `POST /api/up/balance` endpoint
- [ ] Uses n8n middleware for authentication
- [ ] Accepts array of accounts: { up_account_id, display_name, account_type, balance_cents }
- [ ] Upserts each account on `up_account_id`
- [ ] Updates `last_synced_at` timestamp on each account
- [ ] Returns 200 with aggregated total balance across all accounts
- [ ] `npm run build && npm run lint` passes

### US-006: Cash holding auto-creation and net worth integration
**Description:** As a user, I want my total UP Bank balance to automatically appear as a "Cash (UP)" holding in my net worth so I see my full financial picture.

**Acceptance Criteria:**
- [ ] When balance sync runs for the first time, auto-create a holding with: name "Cash (UP)", type "cash", currency "AUD"
- [ ] On each balance sync, create/update a snapshot for the current date with the aggregated balance across all UP accounts
- [ ] If a snapshot already exists for today's date on the Cash (UP) holding, update it (don't create duplicates)
- [ ] The Cash (UP) holding appears in the net worth calculation automatically via existing snapshot logic
- [ ] `npm run build && npm run lint` passes

### US-007: Transaction deletion/reversal endpoint
**Description:** As a system, I need to handle transaction deletions from UP so reversed charges don't remain in the budget.

**Acceptance Criteria:**
- [ ] Create `DELETE /api/up/transactions` endpoint (or accept deletion via the POST endpoint with a `deleted` flag)
- [ ] Uses n8n middleware for authentication
- [ ] Accepts `up_transaction_id` to identify the transaction
- [ ] Soft-deletes the transaction (adds `deleted_at` timestamp) rather than hard delete
- [ ] Soft-deleted transactions excluded from budget calculations
- [ ] Returns 200 on success, 404 if transaction not found
- [ ] `npm run build && npm run lint` passes

### US-008: UP connection status endpoint
**Description:** As a user, I want to see whether UP is connected and when the last sync happened so I know my data is fresh.

**Acceptance Criteria:**
- [ ] Create `GET /api/up/status` endpoint
- [ ] Returns: connected (boolean — true if any up_accounts exist), account_count, total_balance_cents, last_synced_at (most recent across all accounts), transaction_count, oldest_transaction_date, newest_transaction_date
- [ ] Protected by Clerk auth (normal user auth, not n8n middleware)
- [ ] `npm run build && npm run lint` passes

### US-009: n8n webhook receiver workflow template
**Description:** As a developer, I need an n8n workflow JSON template for receiving UP webhook events so Roland can import it into n8n.

**Acceptance Criteria:**
- [ ] Create `n8n/workflows/up-webhook-receiver.json` — importable n8n workflow
- [ ] Workflow includes: Webhook trigger node, Code node for UP webhook signature validation, IF node to check `is_transfer` (transferAccount relationship not null), Code node to map UP transaction to Mjolnir payload format, HTTP Request node to POST to Mjolnir `/api/up/transactions` with signing headers
- [ ] Includes placeholder credentials for UP webhook secret and Mjolnir API key
- [ ] Includes README comments in workflow description explaining setup steps
- [ ] File is valid JSON

### US-010: n8n balance sync workflow template
**Description:** As a developer, I need an n8n workflow JSON template for scheduled balance syncing so Roland can import it into n8n.

**Acceptance Criteria:**
- [ ] Create `n8n/workflows/up-balance-sync.json` — importable n8n workflow
- [ ] Workflow includes: Cron trigger node (every 15 minutes), HTTP Request node to GET UP `/api/v1/accounts`, Code node to extract account data, HTTP Request node to POST to Mjolnir `/api/up/balance` with signing headers
- [ ] Includes placeholder credentials for UP API token and Mjolnir API key
- [ ] Includes README comments in workflow description explaining setup steps
- [ ] File is valid JSON

## Functional Requirements

- FR-1: All `/api/up/*` endpoints (except `/api/up/status`) must validate n8n request signatures before processing
- FR-2: Transaction upsert uses `up_transaction_id` as the unique key — re-sending the same transaction updates it
- FR-3: Transactions with `is_transfer = true` are stored but excluded from any budget/spending queries
- FR-4: Balance sync aggregates ALL UP account balances (transactional + savers) into a single cash figure
- FR-5: The Cash (UP) holding is auto-created on first balance sync, not manually
- FR-6: Held (pending) transactions are stored with status 'HELD' — they are displayed but visually distinguished from settled transactions in future UI work
- FR-7: Soft-deleted transactions (from UP reversals) are excluded from all queries by default
- FR-8: HMAC signature validation uses timing-safe comparison to prevent timing attacks
- FR-9: Request timestamps older than 5 minutes are rejected to prevent replay attacks
- FR-10: All endpoints use Zod for request body validation

## Non-Goals

- No initial history sync (90-day backfill) — system starts from day 0
- No direct UP API calls from Mjolnir — all UP communication goes through n8n
- No UP credential storage in Mjolnir
- No transaction categorisation in this epic (that's B-3)
- No budget tracking in this epic (that's B-2/B-4)
- No UI for viewing transactions (that's B-3/B-4)
- No tag writeback to UP
- No n8n workflow deployment — just JSON templates for manual import

## Technical Considerations

- Use Drizzle ORM for schema definition and migrations (consistent with existing codebase)
- `amount_cents` stored as bigint to avoid floating point issues
- n8n workflow JSON files go in `/n8n/workflows/` directory (new, outside the Next.js app)
- Environment variables needed: `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, `N8N_BASE_URL`
- The Cash (UP) holding uses the existing `holdings` and `snapshots` tables — no new tables needed for net worth integration
- Existing `snapshots` table has a unique constraint on (holding_id, date), so same-day balance updates work via upsert

## Success Metrics

- n8n can POST a transaction to Mjolnir and it appears in the database within 1 second
- Balance sync creates/updates the Cash (UP) holding and snapshot correctly
- Invalid/unsigned requests are rejected with appropriate error codes
- Internal transfers are stored but flagged, not mixed into spending data
- All quality checks pass: `npm run build && npm run lint`

## Open Questions

- Should we add rate limiting to the `/api/up/*` endpoints? (n8n is the only caller, but defence in depth)
- Should the n8n workflow templates use n8n's built-in credential encryption format, or just placeholder strings?
