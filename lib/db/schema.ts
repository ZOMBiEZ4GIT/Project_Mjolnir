/**
 * Mjolnir Database Schema
 *
 * Defines all tables for the personal net worth tracking dashboard. The schema
 * supports two distinct tracking paradigms:
 *
 * 1. **Transaction-based** (stock, etf, crypto): Value is derived from logged
 *    BUY/SELL events. Current value = quantity held x live market price.
 *    Cost basis uses FIFO (first in, first out).
 *
 * 2. **Snapshot-based** (super, cash, debt): Value is a point-in-time balance
 *    recorded during monthly check-ins. One snapshot per holding per month.
 *
 * Entity relationships:
 *   users  -->  holdings  -->  transactions   (tradeable assets)
 *                         -->  snapshots      (non-tradeable assets/liabilities)
 *                         -->  contributions  (super-specific)
 *   users  -->  userPreferences (1:1)
 *   users  -->  importHistory
 *
 * Key design decisions:
 *   - Soft delete via `deletedAt` timestamp on holdings, transactions, snapshots,
 *     and contributions. Queries filter with `isNull(deletedAt)`.
 *   - Snapshot granularity is monthly. Dates are normalized to the first of the
 *     month (YYYY-MM-01) with a unique constraint on (holdingId, date).
 *   - All monetary values stored in native currency (AUD/NZD/USD). Conversion
 *     to the user's display currency happens at query/display time.
 *   - Clerk provides the user ID (text PK, not UUID) as the single source of
 *     identity and authentication.
 */
import { pgTable, text, timestamp, uuid, decimal, date, boolean, pgEnum, unique, integer, bigint, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// ENUMS
// =============================================================================

export const holdingTypeEnum = pgEnum("holding_type", [
  "stock",
  "etf",
  "crypto",
  "super",
  "cash",
  "debt",
]);

export const currencyEnum = pgEnum("currency", ["AUD", "NZD", "USD"]);

export const transactionActionEnum = pgEnum("transaction_action", ["BUY", "SELL", "DIVIDEND", "SPLIT"]);

export const exchangeEnum = pgEnum("exchange", ["ASX", "NZX", "NYSE", "NASDAQ"]);

export const saverTypeEnum = pgEnum("saver_type", [
  "spending",
  "savings_goal",
  "investment",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "paused",
]);

// =============================================================================
// USERS
// =============================================================================

/**
 * Users table -- synced from Clerk.
 *
 * The `id` column stores the Clerk user ID (e.g. "user_2abc...") as the
 * single source of identity. Rows are created/updated via Clerk webhooks
 * or on first authenticated API request. Because Mjolnir is a single-user
 * app, this table will typically contain one row.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Fixed user ID
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Per-user display and notification settings.
 *
 * One record per user (enforced by unique constraint on `userId`). Stores
 * the preferred display currency, whether to show native currency alongside
 * converted values, and email reminder configuration (enabled flag, day of
 * month, last sent timestamp).
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull()
    .unique(), // One preference record per user
  displayCurrency: currencyEnum("display_currency").default("AUD").notNull(),
  showNativeCurrency: boolean("show_native_currency").default(false).notNull(),
  // Email reminder preferences
  emailReminders: boolean("email_reminders").default(true).notNull(),
  reminderDay: integer("reminder_day").default(1).notNull(), // 1-28, day of month to send reminder
  lastReminderSent: timestamp("last_reminder_sent", { withTimezone: true }), // Tracks when last reminder was sent
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// HOLDINGS
// =============================================================================

/**
 * Central registry of all tracked assets and liabilities.
 *
 * Every item the user tracks -- stocks, ETFs, crypto, super funds, cash
 * accounts, and debt -- is a row in this table. The `type` enum determines
 * which tracking paradigm applies (transaction-based for stock/etf/crypto,
 * snapshot-based for super/cash/debt).
 *
 * - `symbol` is required for tradeable types and nullable for super/cash/debt.
 * - `exchange` is free text (not an enum) for flexibility with custom tickers.
 * - `isDormant` flags super funds that no longer receive contributions
 *   (e.g. Kiwisaver), so the check-in modal can skip contribution fields.
 * - `deletedAt` supports soft delete; all queries must filter on `isNull(deletedAt)`.
 */
export const holdings = pgTable("holdings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  type: holdingTypeEnum("type").notNull(),
  symbol: text("symbol"), // Nullable for cash/debt/super
  name: text("name").notNull(),
  currency: currencyEnum("currency").notNull(),
  exchange: text("exchange"), // Nullable, free text for flexibility
  isDormant: boolean("is_dormant").default(false).notNull(), // For dormant super funds
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
});

// =============================================================================
// TRANSACTIONS
// =============================================================================

/**
 * BUY, SELL, DIVIDEND, and SPLIT events for tradeable assets (stock, etf, crypto).
 *
 * Each row represents a single trade or corporate action. The `quantity` and
 * `unitPrice` columns use decimal(18,8) to accommodate sub-cent precision for
 * crypto assets (e.g. 0.00000001 BTC). Fees default to 0 when not provided.
 *
 * Sell transactions are validated to ensure the sell quantity does not exceed
 * the current quantity held (calculated via FIFO from all prior BUY/SELL events).
 * Soft delete supported via `deletedAt`.
 */
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  holdingId: uuid("holding_id")
    .references(() => holdings.id)
    .notNull(),
  date: date("date").notNull(),
  action: transactionActionEnum("action").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 18, scale: 8 }).notNull(),
  fees: decimal("fees", { precision: 18, scale: 8 }).default("0").notNull(),
  currency: currencyEnum("currency").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
});

// =============================================================================
// SNAPSHOTS
// =============================================================================

/**
 * Point-in-time balances for non-tradeable holdings (super, cash, debt).
 *
 * Recorded during the monthly check-in flow. The `balance` column uses
 * decimal(18,2) since these are whole-cent amounts (no sub-cent precision
 * needed, unlike transactions). Dates are normalized to the first of the
 * month (YYYY-MM-01).
 *
 * A unique constraint on (holdingId, date) enforces one snapshot per holding
 * per month. Duplicate submissions for the same month return HTTP 409.
 * For months with missing snapshots, the net worth calculation uses
 * carry-forward logic (most recent snapshot before the target date).
 */
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    holdingId: uuid("holding_id")
      .references(() => holdings.id)
      .notNull(),
    date: date("date").notNull(),
    balance: decimal("balance", { precision: 18, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => ({
    // Unique constraint: one snapshot per holding per date
    uniqueHoldingDate: unique().on(table.holdingId, table.date),
  })
);

// =============================================================================
// CONTRIBUTIONS
// =============================================================================

/**
 * Super-specific employer and employee contributions.
 *
 * Tracks the breakdown of how a super fund's balance changes each month:
 *   - `employerContrib`: Superannuation Guarantee payments from employer
 *   - `employeeContrib`: Salary sacrifice + voluntary personal contributions
 *   - **Investment returns** are derived (not stored):
 *       new_balance - old_balance - employer_contrib - employee_contrib
 *
 * Only linked to holdings of type "super". Dormant super funds skip
 * contribution tracking. A unique constraint on (holdingId, date) enforces
 * one contribution record per holding per month. Soft delete supported.
 */
export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    holdingId: uuid("holding_id")
      .references(() => holdings.id)
      .notNull(),
    date: date("date").notNull(),
    employerContrib: decimal("employer_contrib", { precision: 18, scale: 2 }).default("0").notNull(),
    employeeContrib: decimal("employee_contrib", { precision: 18, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => ({
    // Unique constraint: one contribution per holding per date
    uniqueHoldingDate: unique().on(table.holdingId, table.date),
  })
);

// =============================================================================
// PRICE CACHE
// =============================================================================

export const priceCacheSourceEnum = pgEnum("price_cache_source", ["yahoo", "coingecko"]);

export const importTypeEnum = pgEnum("import_type", ["transactions", "snapshots"]);

/**
 * Cached live prices for tradeable assets with a 15-minute TTL.
 *
 * One row per symbol (unique constraint). Prices are fetched from Yahoo
 * Finance (stocks/ETFs with `.AX` suffix for ASX) or CoinGecko (crypto).
 * The `fetchedAt` timestamp is used to determine staleness -- prices older
 * than 15 minutes are refreshed on the next manual price refresh.
 *
 * Also stores daily change data (`changePercent`, `changeAbsolute`) for
 * display in the dashboard price badges.
 */
export const priceCache = pgTable("price_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  symbol: text("symbol").notNull().unique(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  changePercent: decimal("change_percent", { precision: 10, scale: 4 }),
  changeAbsolute: decimal("change_absolute", { precision: 20, scale: 8 }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  source: priceCacheSourceEnum("source").notNull(),
});

// =============================================================================
// EXCHANGE RATES
// =============================================================================

/**
 * Cached foreign exchange rates with a 1-hour TTL.
 *
 * Stores currency pair conversion rates (e.g. USD->AUD, NZD->AUD) used to
 * convert native-currency values to the user's display currency at query time.
 * A unique constraint on (fromCurrency, toCurrency) ensures one cached rate
 * per pair. Rates older than 1 hour are refreshed on the next calculation.
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one rate per currency pair
    uniqueCurrencyPair: unique().on(table.fromCurrency, table.toCurrency),
  })
);

// =============================================================================
// IMPORT HISTORY
// =============================================================================

/**
 * Audit trail for CSV import operations.
 *
 * Records each import attempt with the file name, import type (transactions
 * or snapshots), and outcome counts (total rows, successfully imported,
 * skipped duplicates). Errors are stored as a JSON text blob for debugging.
 * Imports are designed to be idempotent -- re-running the same CSV file
 * should not create duplicate records.
 */
export const importHistory = pgTable("import_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  type: importTypeEnum("type").notNull(),
  filename: text("filename").notNull(),
  total: integer("total").notNull(),
  imported: integer("imported").notNull(),
  skipped: integer("skipped").notNull(),
  errorsJson: text("errors_json"), // JSON array of errors, stored as text
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// UP BANK INTEGRATION
// =============================================================================

export const upAccountTypeEnum = pgEnum("up_account_type", [
  "TRANSACTIONAL",
  "SAVER",
  "HOME_LOAN",
]);

export const upTransactionStatusEnum = pgEnum("up_transaction_status", [
  "HELD",
  "SETTLED",
]);

/**
 * UP Bank accounts synced via n8n middleware.
 *
 * Stores the current state of each UP account (transactional, saver, home loan).
 * Balances are stored in cents as bigint to avoid floating point issues.
 * The `lastSyncedAt` timestamp tracks data freshness.
 */
export const upAccounts = pgTable("up_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  upAccountId: varchar("up_account_id", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  accountType: upAccountTypeEnum("account_type").notNull(),
  balanceCents: bigint("balance_cents", { mode: "number" }).default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * UP Bank transactions synced via n8n middleware.
 *
 * Stores individual transactions from UP Bank. Amounts are in cents as bigint
 * (negative for debits, positive for credits). Supports HELD -> SETTLED status
 * transitions via upsert on `upTransactionId`.
 *
 * The `mjolnirCategoryId` field allows future budget categorisation linking.
 * Soft delete via `deletedAt` handles transaction reversals from UP.
 */
export const upTransactions = pgTable(
  "up_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    upTransactionId: varchar("up_transaction_id", { length: 255 }).notNull().unique(),
    description: varchar("description", { length: 512 }).notNull(),
    rawText: varchar("raw_text", { length: 512 }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    status: upTransactionStatusEnum("status").notNull(),
    upCategoryId: varchar("up_category_id", { length: 255 }),
    upCategoryName: varchar("up_category_name", { length: 255 }),
    mjolnirCategoryId: varchar("mjolnir_category_id", { length: 255 }),
    transactionDate: date("transaction_date").notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    isTransfer: boolean("is_transfer").default(false).notNull(),
    // Three-tier classification fields (added in BI-A-004)
    saverKey: varchar("saver_key", { length: 50 }),
    categoryKey: varchar("category_key", { length: 50 }),
    tags: jsonb("tags").default([]),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionDateIdx: index("up_transactions_transaction_date_idx").on(table.transactionDate),
    mjolnirCategoryIdIdx: index("up_transactions_mjolnir_category_id_idx").on(table.mjolnirCategoryId),
    statusIdx: index("up_transactions_status_idx").on(table.status),
    saverKeyIdx: index("up_transactions_saver_key_idx").on(table.saverKey),
    categoryKeyIdx: index("up_transactions_category_key_idx").on(table.categoryKey),
    saverCategoryKeyIdx: index("up_transactions_saver_category_key_idx").on(table.saverKey, table.categoryKey),
  })
);

// =============================================================================
// BUDGET CATEGORIES
// =============================================================================

/**
 * Budget spending categories for organising transactions into defined buckets.
 *
 * Each category has a human-readable ID (e.g. 'groceries'), a Lucide icon name,
 * a distinct hex colour for UI display, and a sort order for consistent ordering.
 *
 * - `isIncome` marks the category as an income source (e.g. salary).
 * - `isSystem` marks system-managed categories that cannot be deleted (e.g. 'uncategorised').
 * - The `id` is a short varchar slug used as the primary key for readability.
 */
export const budgetCategories = pgTable(
  "budget_categories",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    icon: varchar("icon", { length: 255 }).notNull(), // Lucide icon name
    colour: varchar("colour", { length: 7 }).notNull(), // Hex colour e.g. #FF5733
    sortOrder: integer("sort_order").notNull(),
    isIncome: boolean("is_income").default(false).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    // Three-tier budget fields (added in BI-A-002)
    saverId: uuid("saver_id").references(() => budgetSavers.id, { onDelete: "cascade" }),
    categoryKey: varchar("category_key", { length: 50 }),
    monthlyBudgetCents: bigint("monthly_budget_cents", { mode: "number" }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSaverCategoryKey: unique().on(table.saverId, table.categoryKey),
  })
);

// =============================================================================
// BUDGET PERIODS
// =============================================================================

/**
 * Budget periods aligned to pay cycles.
 *
 * Each period represents one pay-cycle window (payday to day-before-next-payday).
 * Stores the expected income for that period and links to category allocations
 * via the `budgetAllocations` relation. A unique constraint on `start_date`
 * prevents duplicate periods for the same pay cycle.
 */
export const budgetPeriods = pgTable(
  "budget_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    expectedIncomeCents: bigint("expected_income_cents", { mode: "number" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueStartDate: unique().on(table.startDate),
    startDateIdx: index("budget_periods_start_date_idx").on(table.startDate),
    endDateIdx: index("budget_periods_end_date_idx").on(table.endDate),
  })
);

// =============================================================================
// BUDGET ALLOCATIONS
// =============================================================================

/**
 * Per-category spending allocations within a budget period.
 *
 * Each row assigns an amount (in cents) to a specific category for a specific
 * budget period. A unique constraint on (budget_period_id, category_id) ensures
 * one allocation per category per period. Allocations cascade-delete when their
 * parent budget period is deleted.
 */
export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetPeriodId: uuid("budget_period_id")
      .references(() => budgetPeriods.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: varchar("category_id", { length: 255 })
      .references(() => budgetCategories.id)
      .notNull(),
    allocatedCents: bigint("allocated_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniquePeriodCategory: unique().on(table.budgetPeriodId, table.categoryId),
  })
);

// =============================================================================
// PAYDAY CONFIGURATION
// =============================================================================

/**
 * Payday configuration for budget period alignment.
 *
 * Stores the user's pay cycle settings so budget periods can align with actual
 * pay dates. Since Mjolnir is a single-user app, this table will typically
 * contain one row.
 *
 * - `paydayDay` is the day of month (1-28) when pay arrives.
 * - `adjustForWeekends` shifts Saturday paydays to Friday.
 * - `incomeSourcePattern` is an optional regex/keyword to match income transactions.
 */
export const paydayConfig = pgTable("payday_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  paydayDay: integer("payday_day").notNull(), // 1-28
  adjustForWeekends: boolean("adjust_for_weekends").default(true).notNull(),
  incomeSourcePattern: varchar("income_source_pattern", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// BUDGET SAVERS
// =============================================================================

/**
 * Budget savers representing UP Bank savers — the top-level budget tier.
 *
 * Each saver has a monthly budget amount and a type (spending, savings_goal,
 * or investment). Savers are the first tier in the three-tier budget system:
 *   saver -> category -> transaction tags
 */
export const budgetSavers = pgTable(
  "budget_savers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saverKey: varchar("saver_key", { length: 50 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    monthlyBudgetCents: bigint("monthly_budget_cents", { mode: "number" }).notNull(),
    saverType: saverTypeEnum("saver_type").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    colour: varchar("colour", { length: 7 }).notNull(), // Hex colour e.g. #FF5733
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSaverKey: unique().on(table.saverKey),
  })
);

// =============================================================================
// GOALS
// =============================================================================

/**
 * Savings goals with progress tracking, ETAs, and monthly contributions.
 *
 * Goals link to the saver that funds them (nullable because some goals like
 * debt payoff may not have a direct saver link). The priority field controls
 * display order. currentAmountCents is updated manually or via future automation.
 */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saverId: uuid("saver_id").references(() => budgetSavers.id),
    name: varchar("name", { length: 100 }).notNull(),
    targetAmountCents: bigint("target_amount_cents", { mode: "number" }).notNull(),
    currentAmountCents: bigint("current_amount_cents", { mode: "number" }).default(0).notNull(),
    monthlyContributionCents: bigint("monthly_contribution_cents", { mode: "number" }).notNull(),
    targetDate: date("target_date"),
    status: goalStatusEnum("status").default("active").notNull(),
    priority: integer("priority").default(0).notNull(),
    colour: varchar("colour", { length: 7 }),
    icon: varchar("icon", { length: 10 }),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueName: unique().on(table.name),
  })
);

// =============================================================================
// AI RECOMMENDATIONS
// =============================================================================

/**
 * AI-generated budget recommendations stored from n8n + Claude analysis.
 *
 * Each row stores a complete recommendation payload (suggested budget changes,
 * pay split config, insights, savings projections) as JSONB. The `status`
 * column tracks whether the user has accepted, dismissed, or not yet acted
 * on the recommendation. Linked to a specific budget period.
 */
export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetPeriodId: uuid("budget_period_id")
      .references(() => budgetPeriods.id)
      .notNull(),
    recommendationData: jsonb("recommendation_data").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    // Structured recommendation fields (added in BI-A-005)
    overallStatus: varchar("overall_status", { length: 10 }), // 'green' | 'amber' | 'red'
    saverStatuses: jsonb("saver_statuses"), // Array of per-saver health checks
    goalProgress: jsonb("goal_progress"), // Array of goal updates
    budgetAdjustments: jsonb("budget_adjustments"), // Suggested budget changes
    insights: jsonb("insights"), // Array of insight strings
    actionableTip: text("actionable_tip"), // Specific time-bound action
    savingsProjection: jsonb("savings_projection"), // Savings rate and projections
    rawResponse: jsonb("raw_response"), // Full Claude response for debugging
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    budgetPeriodIdIdx: index("ai_recommendations_budget_period_id_idx").on(table.budgetPeriodId),
  })
);

// =============================================================================
// HEALTH — Apple Health data synced via n8n webhook pipeline
// =============================================================================

/**
 * Daily health metrics from Apple Health.
 *
 * One row per day, keyed by `log_date`. All metric columns are nullable
 * because not every metric is available every day (e.g. body fat requires
 * a smart scale reading). Energy values are stored in kilojoules (native
 * Apple Health unit) and converted to kilocalories at the API layer.
 *
 * Sleep start/end are TIME columns stored as text strings ("HH:MM:SS").
 */
export const healthDaily = pgTable("health_daily", {
  logDate: date("log_date").primaryKey(),
  // Body composition
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }),
  bodyFatPct: decimal("body_fat_pct", { precision: 5, scale: 2 }),
  leanMassKg: decimal("lean_mass_kg", { precision: 6, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  // Heart & recovery
  restingHr: decimal("resting_hr", { precision: 5, scale: 1 }),
  hrvMs: decimal("hrv_ms", { precision: 6, scale: 1 }),
  vo2Max: decimal("vo2_max", { precision: 5, scale: 1 }),
  respiratoryRate: decimal("respiratory_rate", { precision: 5, scale: 1 }),
  hrAvg: decimal("hr_avg", { precision: 5, scale: 1 }),
  hrMin: decimal("hr_min", { precision: 5, scale: 1 }),
  hrMax: decimal("hr_max", { precision: 5, scale: 1 }),
  // Sleep (durations in hours)
  sleepTotalHrs: decimal("sleep_total_hrs", { precision: 5, scale: 2 }),
  sleepDeepHrs: decimal("sleep_deep_hrs", { precision: 5, scale: 2 }),
  sleepRemHrs: decimal("sleep_rem_hrs", { precision: 5, scale: 2 }),
  sleepCoreHrs: decimal("sleep_core_hrs", { precision: 5, scale: 2 }),
  sleepAwakeHrs: decimal("sleep_awake_hrs", { precision: 5, scale: 2 }),
  sleepStart: text("sleep_start"), // TIME as text, e.g. "22:30:00"
  sleepEnd: text("sleep_end"),     // TIME as text, e.g. "06:45:00"
  wristTempC: decimal("wrist_temp_c", { precision: 5, scale: 2 }),
  breathingDisturbances: decimal("breathing_disturbances", { precision: 5, scale: 1 }),
  // Activity
  steps: integer("steps"),
  activeEnergyKj: decimal("active_energy_kj", { precision: 10, scale: 2 }),
  basalEnergyKj: decimal("basal_energy_kj", { precision: 10, scale: 2 }),
  exerciseMinutes: integer("exercise_minutes"),
  standHours: integer("stand_hours"),
  standMinutes: integer("stand_minutes"),
  distanceKm: decimal("distance_km", { precision: 10, scale: 3 }),
  daylightMinutes: integer("daylight_minutes"),
  // Nutrition (stored in kJ, converted to kcal at API layer)
  caloriesKj: decimal("calories_kj", { precision: 10, scale: 2 }),
  proteinG: decimal("protein_g", { precision: 8, scale: 2 }),
  carbsG: decimal("carbs_g", { precision: 8, scale: 2 }),
  fatG: decimal("fat_g", { precision: 8, scale: 2 }),
  fibreG: decimal("fibre_g", { precision: 8, scale: 2 }),
  waterMl: decimal("water_ml", { precision: 10, scale: 2 }),
  caffeineMg: decimal("caffeine_mg", { precision: 8, scale: 2 }),
  // System
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

/**
 * Individual workout sessions from Apple Health.
 *
 * Each row is a single workout event. Energy values are in kilojoules.
 * A composite unique constraint on (workout_date, start_time, workout_type)
 * prevents duplicate imports from n8n. Indexed on workout_date for range queries.
 */
export const healthWorkouts = pgTable(
  "health_workouts",
  {
    workoutDate: date("workout_date").notNull(),
    workoutType: text("workout_type").notNull(),
    startTime: text("start_time").notNull(), // TIMESTAMPTZ as text
    endTime: text("end_time"),               // TIMESTAMPTZ as text
    durationMinutes: integer("duration_minutes"),
    distanceKm: decimal("distance_km", { precision: 10, scale: 3 }),
    activeEnergyKj: decimal("active_energy_kj", { precision: 10, scale: 2 }),
    isIndoor: boolean("is_indoor"),
    hrAvg: integer("hr_avg"),
    hrMin: integer("hr_min"),
    hrMax: integer("hr_max"),
    hrRecovery: integer("hr_recovery"),
    temperatureC: decimal("temperature_c", { precision: 5, scale: 2 }),
    humidityPct: integer("humidity_pct"),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    workoutDateIdx: index("health_workouts_workout_date_idx").on(table.workoutDate),
    uniqueWorkout: unique().on(table.workoutDate, table.startTime, table.workoutType),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  holdings: many(holdings),
  preferences: one(userPreferences),
  importHistory: many(importHistory),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const holdingsRelations = relations(holdings, ({ one, many }) => ({
  user: one(users, {
    fields: [holdings.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  snapshots: many(snapshots),
  contributions: many(contributions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  holding: one(holdings, {
    fields: [transactions.holdingId],
    references: [holdings.id],
  }),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  holding: one(holdings, {
    fields: [snapshots.holdingId],
    references: [holdings.id],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  holding: one(holdings, {
    fields: [contributions.holdingId],
    references: [holdings.id],
  }),
}));

export const importHistoryRelations = relations(importHistory, ({ one }) => ({
  user: one(users, {
    fields: [importHistory.userId],
    references: [users.id],
  }),
}));

export const budgetPeriodsRelations = relations(budgetPeriods, ({ many }) => ({
  allocations: many(budgetAllocations),
  aiRecommendations: many(aiRecommendations),
}));

export const budgetAllocationsRelations = relations(budgetAllocations, ({ one }) => ({
  budgetPeriod: one(budgetPeriods, {
    fields: [budgetAllocations.budgetPeriodId],
    references: [budgetPeriods.id],
  }),
  category: one(budgetCategories, {
    fields: [budgetAllocations.categoryId],
    references: [budgetCategories.id],
  }),
}));

export const aiRecommendationsRelations = relations(aiRecommendations, ({ one }) => ({
  budgetPeriod: one(budgetPeriods, {
    fields: [aiRecommendations.budgetPeriodId],
    references: [budgetPeriods.id],
  }),
}));

export const budgetSaversRelations = relations(budgetSavers, ({ many }) => ({
  categories: many(budgetCategories),
  goals: many(goals),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ one }) => ({
  saver: one(budgetSavers, {
    fields: [budgetCategories.saverId],
    references: [budgetSavers.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  saver: one(budgetSavers, {
    fields: [goals.saverId],
    references: [budgetSavers.id],
  }),
}));

// =============================================================================
// TYPES (for TypeScript inference)
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

export type Contribution = typeof contributions.$inferSelect;
export type NewContribution = typeof contributions.$inferInsert;

export type PriceCache = typeof priceCache.$inferSelect;
export type NewPriceCache = typeof priceCache.$inferInsert;

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

export type ImportHistory = typeof importHistory.$inferSelect;
export type NewImportHistory = typeof importHistory.$inferInsert;

export type UpAccount = typeof upAccounts.$inferSelect;
export type NewUpAccount = typeof upAccounts.$inferInsert;

export type UpTransaction = typeof upTransactions.$inferSelect;
export type NewUpTransaction = typeof upTransactions.$inferInsert;

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type NewBudgetCategory = typeof budgetCategories.$inferInsert;

export type PaydayConfig = typeof paydayConfig.$inferSelect;
export type NewPaydayConfig = typeof paydayConfig.$inferInsert;

export type BudgetPeriod = typeof budgetPeriods.$inferSelect;
export type NewBudgetPeriod = typeof budgetPeriods.$inferInsert;

export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type NewBudgetAllocation = typeof budgetAllocations.$inferInsert;

export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type NewAiRecommendation = typeof aiRecommendations.$inferInsert;

export type HealthDaily = typeof healthDaily.$inferSelect;
export type NewHealthDaily = typeof healthDaily.$inferInsert;

export type HealthWorkout = typeof healthWorkouts.$inferSelect;
export type NewHealthWorkout = typeof healthWorkouts.$inferInsert;

export type BudgetSaver = typeof budgetSavers.$inferSelect;
export type NewBudgetSaver = typeof budgetSavers.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
