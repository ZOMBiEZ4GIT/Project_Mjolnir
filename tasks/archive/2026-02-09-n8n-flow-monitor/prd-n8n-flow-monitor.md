# PRD: n8n Flow Monitor

## Introduction

Add an n8n workflow monitoring feature to Mjolnir so Roland can check the status of his self-hosted n8n automations without leaving the dashboard. The n8n instance runs on a Digital Ocean Linux droplet with 3-6 workflows. This feature provides read-only visibility into workflow health, execution history, and errors — surfaced as both a dashboard card and a dedicated automations page.

## Goals

- Provide at-a-glance automation health on the main dashboard
- Surface failed executions quickly so issues can be caught early
- Show 30 days of execution history per workflow
- Keep n8n credentials server-side (API key in env var, proxied through Next.js API routes)
- Read-only — no triggering, retrying, or editing workflows from Mjolnir

## User Stories

### US-001: Add n8n API proxy route
**Description:** As a developer, I need a server-side API route that proxies requests to the n8n instance so that credentials stay secure and are never exposed to the client.

**Acceptance Criteria:**
- [ ] `N8N_API_URL` and `N8N_API_KEY` environment variables added to `.env.local` / `.env.example`
- [ ] API route at `app/api/n8n/workflows/route.ts` fetches workflows from n8n REST API using the API key
- [ ] API route at `app/api/n8n/executions/route.ts` fetches executions with optional `workflowId` query param
- [ ] Both routes use `withAuth()` HOF pattern consistent with existing API routes
- [ ] Returns cleaned/mapped response (not raw n8n payloads) — only fields the UI needs
- [ ] Handles n8n unreachable gracefully (returns 502 with friendly error message)
- [ ] Typecheck and lint pass

### US-002: Add TanStack Query hooks for n8n data
**Description:** As a developer, I need query hooks and query keys for fetching n8n data so the UI can consume it with loading/error states.

**Acceptance Criteria:**
- [ ] Add `n8n` namespace to `lib/query-keys.ts` with keys for `workflows` and `executions`
- [ ] Create `lib/hooks/use-n8n.ts` with:
  - `useN8nWorkflows()` — fetches all workflows with status
  - `useN8nExecutions(workflowId?: string)` — fetches executions, optionally filtered by workflow
- [ ] Hooks follow existing patterns (conditional `enabled`, error handling)
- [ ] Stale time set to 30 seconds for near-real-time feel
- [ ] Typecheck and lint pass

### US-003: Create n8n status dashboard card
**Description:** As a user, I want a card on the main dashboard showing automation health at a glance so I know if any workflows have failed recently.

**Acceptance Criteria:**
- [ ] New `components/dashboard/n8n-status-card.tsx` component
- [ ] Card displays: total workflow count, active workflow count, failure count in last 24 hours
- [ ] Shows "All systems operational" or "X failures in last 24h" status line
- [ ] Shows timestamp of most recent execution
- [ ] Includes link/button to navigate to `/automations` page
- [ ] Loading skeleton while data is being fetched
- [ ] Graceful error state if n8n is unreachable ("n8n unavailable" with muted styling)
- [ ] Card added to `dashboard-content.tsx` in appropriate position (after summary cards)
- [ ] Matches existing card styling (dark mode, consistent borders/padding)
- [ ] Typecheck and lint pass
- [ ] Verify in browser using dev-browser skill

### US-004: Create automations page with workflow list
**Description:** As a user, I want a dedicated `/automations` page that lists all my n8n workflows with their status and recent execution info.

**Acceptance Criteria:**
- [ ] New page at `app/(dashboard)/automations/page.tsx`
- [ ] Page header with title "Automations" and manual refresh button
- [ ] Lists all workflows as cards or rows, each showing:
  - Workflow name
  - Active/inactive badge
  - Last execution time (relative, e.g. "2 hours ago")
  - Last execution status (success/error badge)
  - Total executions in last 30 days
- [ ] Loading skeletons for the list
- [ ] Empty state if no workflows found
- [ ] Error state if n8n is unreachable
- [ ] Typecheck and lint pass
- [ ] Verify in browser using dev-browser skill

### US-005: Add navigation item for automations page
**Description:** As a user, I want to access the automations page from the sidebar navigation.

**Acceptance Criteria:**
- [ ] Add "Automations" entry to `lib/navigation.ts` using an appropriate Lucide icon (e.g. `Workflow` or `Zap`)
- [ ] Appears in both desktop sidebar and mobile nav
- [ ] Position: after existing nav items, before settings (if applicable)
- [ ] Typecheck and lint pass
- [ ] Verify in browser using dev-browser skill

### US-006: Add execution history detail view
**Description:** As a user, I want to click into a workflow and see its recent execution history so I can check for patterns of failures.

**Acceptance Criteria:**
- [ ] Clicking a workflow on the automations page expands or navigates to show execution history
- [ ] Shows list of recent executions (last 30 days) with: timestamp, status (success/error), duration
- [ ] Failed executions show the error message and the name of the node that failed
- [ ] Visual pass/fail indicator for each execution (green/red status dot or badge)
- [ ] Execution list is scrollable if many entries
- [ ] Typecheck and lint pass
- [ ] Verify in browser using dev-browser skill

### US-007: Add pass/fail timeline visualisation
**Description:** As a user, I want a visual timeline showing execution outcomes over the last 30 days so I can quickly spot reliability trends.

**Acceptance Criteria:**
- [ ] Each workflow's detail view includes a compact visual timeline
- [ ] Timeline shows executions as small coloured indicators (green = success, red = error)
- [ ] Hovering or tapping an indicator shows execution timestamp and status
- [ ] Design is compact and fits within the workflow detail section
- [ ] Designer's choice on exact visualisation (dot grid, mini bar chart, or heatmap — whatever looks best in dark mode)
- [ ] Typecheck and lint pass
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add `N8N_API_URL` and `N8N_API_KEY` environment variables for connecting to the self-hosted n8n instance
- FR-2: Create API proxy routes under `app/api/n8n/` that authenticate with Clerk and forward requests to n8n
- FR-3: API routes must map n8n REST API responses to lean DTOs — only send fields the UI needs
- FR-4: Dashboard card shows workflow count, active count, 24h failure count, and last execution time
- FR-5: Dashboard card links to the `/automations` page
- FR-6: Automations page lists all workflows with name, active status, last run, last status, and 30-day execution count
- FR-7: Workflow detail view shows execution history with timestamp, status, duration, and error details for failures
- FR-8: Pass/fail timeline visualisation for each workflow over the last 30 days
- FR-9: All data fetched via TanStack Query with 30-second stale time
- FR-10: Manual refresh button on automations page to force refetch
- FR-11: Graceful degradation when n8n is unreachable — show "unavailable" state, don't crash

## Non-Goals

- No triggering, retrying, or re-running workflows from Mjolnir
- No editing workflow configuration
- No webhook-based real-time updates (polling only)
- No n8n user management or credential management
- No notifications or alerts for failures (future consideration)
- No historical data storage — always fetched live from n8n API

## Technical Considerations

- **n8n REST API:** Uses header-based auth (`X-N8N-API-KEY`). Key endpoints:
  - `GET /api/v1/workflows` — list all workflows
  - `GET /api/v1/executions` — list executions with filters (workflowId, status, limit)
- **Proxy pattern:** All n8n API calls go through Next.js API routes to keep the n8n URL and API key server-side
- **Error handling:** n8n may be temporarily unreachable (droplet restarting, network issues). UI must handle this gracefully
- **Existing patterns to follow:**
  - `withAuth()` HOF for API route auth
  - `queryKeys` namespace for TanStack Query keys
  - `components/dashboard/` for dashboard cards
  - `lib/navigation.ts` for adding nav items
  - Error boundaries around dashboard sections
- **n8n API rate limits:** Not a concern at 3-6 workflows with manual/30s polling

## Success Metrics

- Dashboard card shows current automation health within 30 seconds of page load
- Failed executions are visible with error details within 2 clicks from the dashboard
- n8n being unreachable does not break the main dashboard (graceful degradation)
- All existing dashboard functionality unaffected

## Open Questions

- Should we add a browser notification or toast when a new failure is detected? (deferred — can add later)
- Should execution history be paginated or just capped at last 30 days? (start with 30-day cap, paginate if needed)
