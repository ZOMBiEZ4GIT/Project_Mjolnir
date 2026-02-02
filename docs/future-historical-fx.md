# Future: Historical Exchange Rate Support

This document outlines the schema design and implementation approach for adding historical exchange rate support to Mjolnir. This feature would enable accurate historical net worth calculations using the exchange rates that were in effect at each point in time.

## Current Implementation

The current system uses **live exchange rates** for all conversions:

- Exchange rates are fetched from the Exchange Rate API
- Rates are cached with a 1-hour TTL in `lib/services/exchange-rates.ts`
- All historical calculations use current exchange rates
- This means historical net worth values may not reflect actual values at the time

## Proposed Schema

### `exchange_rate_history` Table

```typescript
// lib/db/schema.ts

export const exchangeRateHistory = pgTable(
  "exchange_rate_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromCurrency: currencyEnum("from_currency").notNull(),
    toCurrency: currencyEnum("to_currency").notNull(),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    date: date("date", { mode: "date" }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Unique constraint: one rate per currency pair per date
    uniqueRate: unique().on(table.fromCurrency, table.toCurrency, table.date),
    // Index for efficient date-range queries
    dateIdx: index("exchange_rate_date_idx").on(table.date),
    // Composite index for currency pair lookups
    currencyDateIdx: index("exchange_rate_currency_date_idx").on(
      table.fromCurrency,
      table.toCurrency,
      table.date
    ),
  })
);

export type ExchangeRateHistory = typeof exchangeRateHistory.$inferSelect;
export type ExchangeRateHistoryInsert = typeof exchangeRateHistory.$inferInsert;
```

### Key Design Decisions

1. **Daily Granularity**: Rates are stored per day, not per minute/hour. This is sufficient for personal finance tracking and reduces storage requirements.

2. **Decimal Precision**: Using `decimal(18, 8)` allows for precise rate storage (8 decimal places) while supporting large rate values.

3. **Unique Constraint**: Ensures one rate per currency pair per date, preventing duplicate entries.

4. **Both Directions**: Store rates for both directions (e.g., USD/AUD and AUD/USD) to enable direct lookups without calculation.

## Data Collection Strategy

### Option 1: Daily Cron Job (Recommended)

Run a daily job to capture and store current exchange rates:

```typescript
// app/api/cron/capture-fx-rates/route.ts

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const pairs = [
    { from: "USD", to: "AUD" },
    { from: "NZD", to: "AUD" },
    { from: "AUD", to: "USD" },
    { from: "AUD", to: "NZD" },
  ];

  for (const pair of pairs) {
    const rate = await fetchExchangeRate(pair.from, pair.to);
    await db
      .insert(exchangeRateHistory)
      .values({
        fromCurrency: pair.from,
        toCurrency: pair.to,
        rate: rate.toString(),
        date: today,
        fetchedAt: new Date(),
      })
      .onConflictDoNothing(); // Skip if already captured today
  }

  return Response.json({ success: true, date: today });
}
```

### Option 2: Backfill from External API

Some exchange rate APIs offer historical data. This could be used to backfill rates:

```typescript
// scripts/backfill-fx-rates.ts

async function backfillRates(startDate: Date, endDate: Date) {
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    // Fetch historical rate from API (e.g., Open Exchange Rates, Fixer.io)
    const rates = await fetchHistoricalRates(dateStr);
    // Store in database
    // ...
    current.setDate(current.getDate() + 1);
  }
}
```

## Calculation Changes

### 1. Helper Function: Get Rate for Date

```typescript
// lib/queries/exchange-rates.ts

export async function getHistoricalRate(
  from: Currency,
  to: Currency,
  date: Date
): Promise<number | null> {
  // Normalize to date only (no time)
  const targetDate = date.toISOString().split("T")[0];

  // Try exact date match first
  const exactMatch = await db.query.exchangeRateHistory.findFirst({
    where: and(
      eq(exchangeRateHistory.fromCurrency, from),
      eq(exchangeRateHistory.toCurrency, to),
      eq(exchangeRateHistory.date, targetDate)
    ),
  });

  if (exactMatch) {
    return Number(exactMatch.rate);
  }

  // Fall back to most recent rate before the target date
  const nearestRate = await db.query.exchangeRateHistory.findFirst({
    where: and(
      eq(exchangeRateHistory.fromCurrency, from),
      eq(exchangeRateHistory.toCurrency, to),
      lte(exchangeRateHistory.date, targetDate)
    ),
    orderBy: desc(exchangeRateHistory.date),
  });

  return nearestRate ? Number(nearestRate.rate) : null;
}

export async function getHistoricalRates(
  date: Date
): Promise<ExchangeRates | null> {
  const usdRate = await getHistoricalRate("USD", "AUD", date);
  const nzdRate = await getHistoricalRate("NZD", "AUD", date);

  if (usdRate === null || nzdRate === null) {
    return null;
  }

  return {
    "USD/AUD": usdRate,
    "NZD/AUD": nzdRate,
  };
}
```

### 2. Updated Historical Net Worth Calculation

```typescript
// lib/calculations/net-worth-history.ts

export async function calculateHistoricalNetWorth(
  userId: string,
  months: number = 12
): Promise<HistoricalNetWorthResult> {
  const history: HistoryPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = getEndOfMonth(i);

    // Get historical exchange rates for this date
    const rates = await getHistoricalRates(date);

    // If no historical rates available, fall back to current rates
    // and flag the data point as estimated
    const effectiveRates = rates ?? (await fetchExchangeRates());
    const isEstimated = rates === null;

    // Calculate net worth using historical rates
    const result = await calculateNetWorthAtDate(userId, date, effectiveRates);

    history.push({
      date: date.toISOString(),
      netWorth: result.netWorth,
      totalAssets: result.totalAssets,
      totalDebt: result.totalDebt,
      isEstimated, // New field to indicate rate estimation
    });
  }

  return { history };
}
```

### 3. Updated Transaction Cost Basis

For accurate capital gains calculations, transaction values may need historical rates:

```typescript
// lib/calculations/cost-basis.ts

export async function calculateCostBasisWithHistoricalRates(
  transactions: Transaction[],
  displayCurrency: Currency
): Promise<CostBasisResult> {
  let totalCost = 0;

  for (const tx of transactions) {
    if (tx.action === "BUY") {
      const txCost = tx.quantity * tx.unitPrice + (tx.fees ?? 0);

      if (tx.currency !== displayCurrency) {
        // Get rate for transaction date
        const rate = await getHistoricalRate(
          tx.currency,
          displayCurrency,
          tx.date
        );
        totalCost += rate ? txCost * rate : txCost; // Fall back to no conversion
      } else {
        totalCost += txCost;
      }
    }
  }

  return { totalCost, currency: displayCurrency };
}
```

## Migration Path

### Phase 1: Schema & Collection

1. Create the `exchange_rate_history` table migration
2. Set up daily cron job to capture rates going forward
3. Backfill historical rates (optional, depends on API availability)

### Phase 2: Optional Historical Features

1. Add `useHistoricalRates` option to calculation functions
2. Update historical net worth chart to use historical rates when available
3. Add UI indicator for estimated vs actual historical values

### Phase 3: Capital Gains (Future)

1. Use historical rates for transaction cost basis in foreign currencies
2. Calculate capital gains using acquisition-date exchange rates
3. Generate tax reports with accurate FX conversions

## API Considerations

### Exchange Rate API Options

| Provider | Historical Data | Free Tier | Notes |
|----------|-----------------|-----------|-------|
| Open Exchange Rates | Yes (paid) | 1000 req/mo | Good historical coverage |
| Fixer.io | Yes (paid) | 100 req/mo | EU-based |
| ExchangeRate-API | No | 1500 req/mo | Current only |
| RBA (AUD specific) | Yes | Unlimited | Australian rates only |

### Recommendation

For a personal finance app:
1. Continue using ExchangeRate-API for live rates (current implementation)
2. Add RBA historical data for AUD pairs (free, official source)
3. Capture rates daily via cron job going forward

## Storage Estimates

With daily rates for 2 currency pairs:
- 2 pairs x 365 days x 5 years = 3,650 rows
- Estimated size: ~150 KB (negligible)

## Not In Scope

This design does **not** include:
- Intraday rate fluctuations
- Bid/ask spreads
- Rate source comparison
- Automatic rate arbitrage detection

These features are unnecessary for personal net worth tracking.
