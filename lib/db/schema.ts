import { pgTable, text, timestamp, uuid, decimal, date, boolean, pgEnum, unique } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// HOLDINGS
// =============================================================================

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
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  holdings: many(holdings),
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

// =============================================================================
// TYPES (for TypeScript inference)
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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
