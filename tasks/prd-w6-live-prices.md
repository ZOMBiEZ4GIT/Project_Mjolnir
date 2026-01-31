# PRD: W-6 Live Prices & Caching

## Introduction

Live price fetching enables real-time valuation of tradeable assets (stocks, ETFs, crypto). Prices are fetched from Yahoo Finance for stocks/ETFs and CoinGecko for crypto, with a 15-minute cache to respect rate limits and improve performance. Exchange rates (USD/AUD, NZD/AUD) are cached hourly for multi-currency display. When fetches fail, the system gracefully falls back to cached prices with staleness indicators.

## Goals

- Fetch live prices for all tradeable holdings (stocks, ETFs, crypto)
- Cache prices for 15 minutes to respect API rate limits
- Cache exchange rates for 1 hour
- Display daily price change (% and absolute)
- Show cached prices with "as of X ago" when fetch fails
- Provide manual refresh button with retry capability
- Auto-refresh prices on page load

## User Stories

### US-001: Create price cache database schema
**Description:** As a developer, I need a price_cache table to store fetched prices.

**Acceptance Criteria:**
- [ ] Create `price_cache` table with Drizzle schema in `lib/db/schema.ts`
- [ ] Fields: id (uuid), symbol (text), price (decimal), currency (enum: AUD, NZD, USD), change_percent (decimal, nullable), change_absolute (decimal, nullable), fetched_at (timestamp), source (text: 'yahoo' | 'coingecko')
- [ ] Add unique constraint on symbol
- [ ] Generate migration with `npm run db:generate`
- [ ] Run migration with `npm run db:migrate`
- [ ] Typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### US-002: Create exchange rate cache schema
**Description:** As a developer, I need to cache exchange rates for currency conversion.

**Acceptance Criteria:**
- [ ] Create `exchange_rates` table with Drizzle schema
- [ ] Fields: id (uuid), from_currency (text), to_currency (text), rate (decimal), fetched_at (timestamp)
- [ ] Add unique constraint on (from_currency, to_currency)
- [ ] Generate and run migration
- [ ] Typecheck passes
- [ ] Lint passes

### US-003: Create Yahoo Finance price service
**Description:** As a developer, I need a service to fetch stock/ETF prices from Yahoo Finance.

**Acceptance Criteria:**
- [ ] Create `lib/services/yahoo-finance.ts`
- [ ] Function `fetchStockPrice(symbol): Promise<PriceData>`
- [ ] Returns: price, currency, changePercent, changeAbsolute
- [ ] Handles ASX symbols (append .AX if not present)
- [ ] Handles NZX symbols (append .NZ if not present)
- [ ] Throws descriptive error on failure (network, invalid symbol)
- [ ] Uses `yahoo-finance2` npm package
- [ ] Typecheck passes
- [ ] Lint passes

### US-004: Create CoinGecko price service
**Description:** As a developer, I need a service to fetch crypto prices from CoinGecko.

**Acceptance Criteria:**
- [ ] Create `lib/services/coingecko.ts`
- [ ] Function `fetchCryptoPrice(symbol): Promise<PriceData>`
- [ ] Returns: price (in USD), changePercent (24h), changeAbsolute
- [ ] Maps common symbols to CoinGecko IDs (BTC→bitcoin, ETH→ethereum, etc.)
- [ ] Supports optional COINGECKO_API_KEY for higher rate limits
- [ ] Falls back to free tier if no key provided
- [ ] Handles rate limiting gracefully (429 response)
- [ ] Typecheck passes
- [ ] Lint passes

### US-005: Create exchange rate service
**Description:** As a developer, I need a service to fetch exchange rates.

**Acceptance Criteria:**
- [ ] Create `lib/services/exchange-rates.ts`
- [ ] Function `fetchExchangeRate(from, to): Promise<number>`
- [ ] Supports: USD/AUD, NZD/AUD, USD/NZD
- [ ] Uses free exchange rate API (e.g., exchangerate-api.com)
- [ ] Uses EXCHANGE_RATE_API_KEY if provided
- [ ] Returns rate (e.g., 1.53 for USD→AUD)
- [ ] Typecheck passes
- [ ] Lint passes

### US-006: Create price cache service
**Description:** As a developer, I need a service to manage price caching with TTL.

**Acceptance Criteria:**
- [ ] Create `lib/services/price-cache.ts`
- [ ] Function `getCachedPrice(symbol): Promise<CachedPrice | null>`
- [ ] Function `setCachedPrice(symbol, priceData): Promise<void>`
- [ ] Function `isCacheValid(cachedPrice, ttlMinutes): boolean`
- [ ] Default TTL: 15 minutes for prices
- [ ] Returns null if no cache or expired
- [ ] Upserts on symbol (update if exists)
- [ ] Typecheck passes
- [ ] Lint passes

### US-007: Create exchange rate cache service
**Description:** As a developer, I need caching for exchange rates with 1-hour TTL.

**Acceptance Criteria:**
- [ ] Add to `lib/services/exchange-rates.ts`
- [ ] Function `getCachedRate(from, to): Promise<number | null>`
- [ ] Function `getExchangeRate(from, to): Promise<number>` (fetches if not cached/expired)
- [ ] TTL: 1 hour
- [ ] Typecheck passes
- [ ] Lint passes

### US-008: Create unified price fetcher
**Description:** As a developer, I need a unified interface to fetch prices for any holding.

**Acceptance Criteria:**
- [ ] Create `lib/services/price-fetcher.ts`
- [ ] Function `fetchPrice(holding): Promise<PriceResult>`
- [ ] Routes to Yahoo Finance for stock/etf, CoinGecko for crypto
- [ ] Checks cache first, fetches if expired
- [ ] Updates cache on successful fetch
- [ ] Returns cached price with staleness flag on fetch failure
- [ ] PriceResult: { price, currency, changePercent, changeAbsolute, fetchedAt, isStale, error? }
- [ ] Typecheck passes
- [ ] Lint passes

### US-009: Create prices API - refresh endpoint
**Description:** As a developer, I need an API endpoint to refresh prices for holdings.

**Acceptance Criteria:**
- [ ] Create `app/api/prices/route.ts` with POST handler
- [ ] POST /api/prices/refresh accepts optional `holding_ids` array (or refreshes all if omitted)
- [ ] Fetches fresh prices for specified tradeable holdings
- [ ] Returns array of results: { holdingId, symbol, price, changePercent, isStale, error? }
- [ ] Handles partial failures (some succeed, some fail)
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-010: Create prices API - GET endpoint
**Description:** As a developer, I need an API endpoint to get current cached prices.

**Acceptance Criteria:**
- [ ] Add GET handler to `app/api/prices/route.ts`
- [ ] GET /api/prices returns cached prices for all tradeable holdings
- [ ] Includes staleness indicator (fetchedAt, isStale based on TTL)
- [ ] Includes daily change data (percent, absolute)
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-011: Create exchange rates API endpoint
**Description:** As a developer, I need an API endpoint to get exchange rates.

**Acceptance Criteria:**
- [ ] Create `app/api/exchange-rates/route.ts` with GET handler
- [ ] GET /api/exchange-rates returns all cached rates
- [ ] Supports `?refresh=true` to force refresh
- [ ] Returns: { rates: { 'USD/AUD': 1.53, 'NZD/AUD': 0.92 }, fetchedAt }
- [ ] Requires Clerk authentication
- [ ] Typecheck passes
- [ ] Lint passes

### US-012: Add price display to holdings list
**Description:** As Roland, I want to see current prices on my holdings list.

**Acceptance Criteria:**
- [ ] Holdings list shows "Price" column for tradeable holdings (stock, etf, crypto)
- [ ] Displays current price in holding's native currency
- [ ] Shows daily change: +2.5% ($1.23) in green, -1.2% ($0.50) in red
- [ ] Shows "as of X ago" timestamp
- [ ] Stale prices (>15 min) show warning indicator
- [ ] Error state shows last price with error icon
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-013: Add market value to holdings list
**Description:** As Roland, I want to see the market value of each holding.

**Acceptance Criteria:**
- [ ] Holdings list shows "Market Value" column for tradeable holdings
- [ ] Market Value = quantity × current price
- [ ] Displays in holding's native currency
- [ ] Shows "-" if no quantity or no price
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-014: Add unrealized gain/loss display
**Description:** As Roland, I want to see unrealized gain/loss for each holding.

**Acceptance Criteria:**
- [ ] Holdings list shows "Gain/Loss" column for tradeable holdings
- [ ] Gain/Loss = Market Value - Cost Basis
- [ ] Also shows percentage: ((Market Value / Cost Basis) - 1) × 100
- [ ] Green for gains, red for losses
- [ ] Shows "-" if no cost basis or no price
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-015: Add refresh prices button
**Description:** As Roland, I want to manually refresh all prices.

**Acceptance Criteria:**
- [ ] "Refresh Prices" button on holdings page header
- [ ] Shows loading spinner while refreshing
- [ ] Calls POST /api/prices/refresh
- [ ] On success: updates displayed prices, shows success toast
- [ ] On partial failure: shows warning toast with count of failures
- [ ] Button disabled during refresh
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-016: Auto-refresh prices on page load
**Description:** As Roland, I want prices to automatically refresh when I open the holdings page.

**Acceptance Criteria:**
- [ ] Holdings page triggers price refresh on mount
- [ ] Only refreshes if any cached price is stale (>15 min)
- [ ] Shows subtle loading indicator (not blocking)
- [ ] Does not block page render (shows cached prices immediately)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-017: Individual holding price refresh with retry
**Description:** As Roland, I want to retry fetching a price if it failed.

**Acceptance Criteria:**
- [ ] Holdings with fetch errors show retry button/icon
- [ ] Clicking retry refreshes just that holding's price
- [ ] Shows loading state on that row only
- [ ] Updates price on success, shows error toast on repeated failure
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using Playwright

### US-018: Symbol-to-CoinGecko ID mapping
**Description:** As a developer, I need a mapping from common crypto symbols to CoinGecko IDs.

**Acceptance Criteria:**
- [ ] Create `lib/services/crypto-symbols.ts`
- [ ] Map common symbols: BTC→bitcoin, ETH→ethereum, SOL→solana, etc.
- [ ] Function `getCoinGeckoId(symbol): string | null`
- [ ] Cover top 50 cryptocurrencies by market cap
- [ ] Return null for unknown symbols (triggers search fallback)
- [ ] Typecheck passes
- [ ] Lint passes

### US-019: Update environment variables documentation
**Description:** As a developer, I need documentation for new API keys.

**Acceptance Criteria:**
- [ ] Update `.env.example` with COINGECKO_API_KEY (optional)
- [ ] Update `.env.example` with EXCHANGE_RATE_API_KEY
- [ ] Add comments explaining where to get keys and rate limits
- [ ] Typecheck passes
- [ ] Lint passes

## Functional Requirements

- FR-1: Price cache stores: symbol, price, currency, change data, fetched_at, source
- FR-2: Price cache TTL is 15 minutes
- FR-3: Exchange rate cache TTL is 1 hour
- FR-4: Yahoo Finance used for stocks (with .AX/.NZ suffixes) and ETFs
- FR-5: CoinGecko used for crypto prices
- FR-6: Failed fetches return last cached price with staleness indicator
- FR-7: Daily change shown as percentage and absolute value
- FR-8: Market value = quantity × price
- FR-9: Unrealized gain/loss = market value - cost basis
- FR-10: Prices auto-refresh on page load if stale
- FR-11: Manual refresh button available for immediate updates
- FR-12: Individual retry available for failed price fetches

## Non-Goals

- No real-time streaming prices (WebSocket)
- No historical price charts (future epic)
- No price alerts or notifications
- No automatic refresh interval while page is open
- No support for options or futures pricing
- No currency conversion in calculations (display only for W-8)

## Design Considerations

- Green/red coloring for gains/losses consistent across app
- Staleness indicator subtle but visible (yellow/orange warning)
- Loading spinners should not cause layout shift
- Error states should show last known price, not blank
- Consider skeleton loaders for initial price fetch

## Technical Considerations

- yahoo-finance2 package for stock/ETF prices
- CoinGecko free tier: 10-30 calls/min (use API key for more)
- Batch requests where possible to reduce API calls
- Consider request deduplication for same symbol
- Handle timezone differences in "daily" change calculations
- Rate limit handling: exponential backoff on 429 responses

## Success Metrics

- Prices load within 2 seconds on page open
- Cache hit rate >80% during normal usage
- Graceful degradation: stale prices shown, not errors
- No API rate limit errors under normal use
- No TypeScript errors, lint passes

## Open Questions

- Should we support additional exchanges beyond ASX, NZX, NYSE, NASDAQ?
- Should we pre-fetch prices for all holdings on a schedule (cron)?
- Should we show bid/ask spread for stocks, or just last price?
