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
import { pgTable, text, timestamp, uuid, decimal, date, boolean, pgEnum, unique, integer, bigint, varchar, index } from "drizzle-orm/pg-core";
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
  id: text("id").primaryKey(), // Clerk user ID
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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionDateIdx: index("up_transactions_transaction_date_idx").on(table.transactionDate),
    mjolnirCategoryIdIdx: index("up_transactions_mjolnir_category_id_idx").on(table.mjolnirCategoryId),
    statusIdx: index("up_transactions_status_idx").on(table.status),
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
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }).notNull(), // Lucide icon name
  colour: varchar("colour", { length: 7 }).notNull(), // Hex colour e.g. #FF5733
  sortOrder: integer("sort_order").notNull(),
  isIncome: boolean("is_income").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
