# PRD: AI Pay Split Recommendations (Epic B-5)

## Introduction

Add AI-powered budget recommendations to Mjolnir by routing spending data through n8n to Claude. The system analyses actual spending patterns against the budget, suggests adjustments, and generates UP Bank Pay Split percentages so the user can automate their budget via UP's saver accounts. This is a "get smarter" feature — the AI sees what you actually spend and tells you how to adjust.

## Goals

- Trigger AI analysis of spending patterns from the budget dashboard
- Send structured spending data to Claude via n8n
- Display actionable budget adjustment recommendations
- Generate UP Pay Split percentages based on analysis
- Allow accepting, modifying, or dismissing recommendations
- Apply accepted recommendations to update budget allocations

## User Stories

### US-001: Recommendation request API endpoint
**Description:** As a developer, I need an endpoint that gathers spending data and triggers an AI recommendation request via n8n.

**Acceptance Criteria:**
- [ ] Create `POST /api/budget/recommendations` endpoint
- [ ] Gathers: current budget period income and allocations, actual spending per category for current period, 3-month average spending per category (if enough data exists, otherwise use available data), savings goal percentage (default 30%), payday config
- [ ] Sends this data as a POST to the n8n recommendation webhook URL (`N8N_BASE_URL` + configured webhook path)
- [ ] Returns 202 Accepted immediately (async process)
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-002: Recommendation callback endpoint
**Description:** As a developer, I need an endpoint for n8n to return AI recommendations to Mjolnir after Claude processes them.

**Acceptance Criteria:**
- [ ] Create `POST /api/budget/recommendations/callback` endpoint
- [ ] Uses n8n middleware for authentication (same HMAC signing as UP endpoints)
- [ ] Accepts structured recommendation payload: suggestedBudget (array of category adjustments with reasons), paySplitConfig (array of saver names with percentages and amounts), insights (array of strings), savingsProjection (currentRate, projectedRate, monthlyIncrease), actionableTip (string), generatedAt (timestamp)
- [ ] Stores the recommendation (in-memory or database — latest recommendation per period)
- [ ] Validated with Zod
- [ ] `npm run build && npm run lint` passes

### US-003: Recommendation storage and retrieval
**Description:** As a developer, I need to store and retrieve AI recommendations so the UI can display them.

**Acceptance Criteria:**
- [ ] Create `ai_recommendations` table with columns: id, budget_period_id (FK), recommendation_data (jsonb), status ('pending' | 'accepted' | 'dismissed'), created_at
- [ ] Create `GET /api/budget/recommendations` — returns the latest recommendation for a given period_id (or current period)
- [ ] Create `PUT /api/budget/recommendations/[id]/status` — update status to 'accepted' or 'dismissed'
- [ ] Generate and run migration
- [ ] Protected by Clerk auth
- [ ] `npm run build && npm run lint` passes

### US-004: AI recommendation trigger button
**Description:** As a user, I want a button on the budget dashboard to request AI-powered recommendations so I can get advice on optimising my budget.

**Acceptance Criteria:**
- [ ] Create `components/budget/AIRecommendationButton.tsx`
- [ ] Button text: "Get AI Recommendation" with a sparkles icon
- [ ] States: idle (clickable), loading (spinner + "Analysing your spending..."), error (retry option)
- [ ] Clicking triggers POST to `/api/budget/recommendations`
- [ ] Polls `GET /api/budget/recommendations` every 3 seconds until a new recommendation appears (or 60 second timeout)
- [ ] On success, opens the recommendation modal
- [ ] Disabled if a recommendation already exists for current period (show "View Recommendation" instead)
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-005: Recommendation display modal
**Description:** As a user, I want to see AI recommendations in a clear modal so I can understand the suggestions and decide what to act on.

**Acceptance Criteria:**
- [ ] Create `components/budget/RecommendationModal.tsx` — full-screen modal or slide-over
- [ ] Section 1 — Insights: bullet list of spending observations (from insights array)
- [ ] Section 2 — Suggested Budget: table showing category, current allocation, suggested allocation, difference, and AI reasoning per row. Green for increases, red for decreases
- [ ] Section 3 — Pay Split Config: table showing UP saver name, percentage of income, dollar amount. Formatted as a ready-to-use Pay Split setup guide
- [ ] Section 4 — Savings Projection: current rate vs projected rate with the monthly savings increase highlighted
- [ ] Section 5 — Tip: actionable tip displayed as a callout card
- [ ] Footer actions: "Accept All" (applies suggestions), "Dismiss" (closes modal)
- [ ] Dark mode styling
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-006: Apply recommendations to budget
**Description:** As a user, I want to accept AI recommendations and have them update my budget allocations so I don't have to manually re-enter everything.

**Acceptance Criteria:**
- [ ] "Accept All" button in modal updates budget_allocations for the current period with the suggested amounts
- [ ] After applying, marks the recommendation status as 'accepted'
- [ ] Dashboard refreshes to show new allocation amounts
- [ ] Shows a success toast: "Budget updated with AI recommendations"
- [ ] If user navigates to budget setup, they see the updated allocations
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

### US-007: n8n Claude recommendation workflow template
**Description:** As a developer, I need an n8n workflow template that receives spending data, calls Claude, and returns structured recommendations.

**Acceptance Criteria:**
- [ ] Create `n8n/workflows/claude-recommendation.json` — importable n8n workflow
- [ ] Workflow: Webhook trigger (receives spending data from Mjolnir) → Code node (formats Claude prompt with spending data) → HTTP Request node (calls Claude API with structured prompt) → Code node (parses Claude JSON response) → HTTP Request node (POSTs recommendations back to Mjolnir callback URL with signing)
- [ ] Claude prompt template included in the Code node: instructs Claude to analyse Australian spending patterns, suggest budget adjustments, recommend Pay Split percentages, and provide insights — all as structured JSON
- [ ] Prompt specifies JSON-only response format
- [ ] Error handling: if Claude call fails, sends error callback to Mjolnir
- [ ] Placeholder credentials for Claude API key and Mjolnir webhook secret
- [ ] File is valid JSON

### US-008: Pay Split configuration display
**Description:** As a user, I want the recommended Pay Split percentages displayed in a format I can directly apply in the UP app so I can automate my budget.

**Acceptance Criteria:**
- [ ] Create `components/budget/PaySplitConfig.tsx` — formatted Pay Split guide
- [ ] Shows each recommended saver: name (e.g. "Rent"), percentage (e.g. "23.3%"), dollar amount (e.g. "$2,129")
- [ ] Total percentages shown with remainder going to spending account
- [ ] Visual layout mirrors UP's Pay Split interface for easy reference
- [ ] Copy button to copy the configuration as text for reference
- [ ] `npm run build && npm run lint` passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Recommendation requests are async — Mjolnir sends data to n8n and polls for the response
- FR-2: Only one recommendation per budget period (requesting again replaces the previous one)
- FR-3: Claude prompt must specify JSON-only response format to ensure parseable output
- FR-4: Pay Split percentages must sum to <= 100% (remainder stays in spending account)
- FR-5: "Accept All" applies changes atomically — all allocations update together
- FR-6: Recommendation data is stored as JSONB for flexibility
- FR-7: n8n callback uses the same HMAC signing as other n8n → Mjolnir endpoints

## Non-Goals

- No automatic recommendation generation (always user-triggered)
- No direct UP API integration for Pay Split (user applies manually in UP app)
- No partial acceptance (accept individual suggestions) — it's all or nothing for v1
- No recommendation history or comparison
- No feedback loop to improve recommendations

## Technical Considerations

- Claude API called from n8n, not from Mjolnir (Mjolnir never has the Claude API key)
- Polling approach (3s interval, 60s timeout) is simpler than WebSocket for v1
- JSONB column for recommendation data provides schema flexibility as the AI output evolves
- The Claude prompt should use the latest model available in n8n's HTTP Request node

## Success Metrics

- AI recommendation generated and displayed within 30 seconds of clicking the button
- Pay Split percentages are mathematically correct (sum ≤ 100%)
- Accepting recommendations updates budget allocations correctly
- All quality checks pass: `npm run build && npm run lint`

## Open Questions

- Should there be a monthly prompt to re-run recommendations?
- Should the user be able to edit individual suggested amounts before accepting?
