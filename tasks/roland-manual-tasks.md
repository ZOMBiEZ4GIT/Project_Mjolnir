# Roland's Manual Tasks — Phase 3

Things Ralph can't do for you. Check these off as you go.

---

## Before B-1 (UP Bank Integration)

### Infrastructure
- [x] **n8n instance** — Already set up, hosted, and running.

### UP Bank
- [ ] **Generate UP API token** — In the UP app: Settings > API Access. Use minimum permissions: `accounts:read`, `transactions:read`, `webhooks:manage`.
- [ ] **Register UP webhook** — Point UP webhooks at your n8n webhook URL. Events needed: `TRANSACTION_CREATED`, `TRANSACTION_SETTLED`, `TRANSACTION_DELETED`.

### Credentials & Env Vars
- [ ] **Generate N8N_API_KEY** — Create a strong random key (e.g. `openssl rand -hex 32`). This authenticates n8n -> Mjolnir requests.
- [ ] **Generate N8N_WEBHOOK_SECRET** — Another random key for HMAC signatures (e.g. `openssl rand -hex 32`).
- [ ] **Add env vars to Vercel** — `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, `N8N_BASE_URL` (your n8n instance URL).
- [ ] **Add env vars to local .env** — Same three variables for local development.

### n8n Configuration
- [ ] **Secure your n8n droplet** — Follow [`docs/n8n-security-guide.md`](../docs/n8n-security-guide.md) to harden the droplet and set up env vars.
- [ ] **Add secrets as env vars on droplet** — Add `UP_API_TOKEN`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET` to the `.env` file on your droplet (see security guide). n8n's built-in credential store requires a paid plan, so we use env vars instead.
- [ ] **Import n8n workflow templates** — Ralph will create JSON files in `n8n/workflows/`. Import them into your n8n instance.
- [ ] **Set Mjolnir base URL in n8n** — Update the HTTP Request nodes to point at your Vercel deployment URL.
- [ ] **Test webhook connectivity** — Send a test transaction in UP and verify it arrives in Mjolnir.

---

## Before B-2 (Budget Categories & Setup)

- [ ] **Decide your payday day** — What day of the month do you get paid? (Ralph needs this as a default value)
- [ ] **Confirm budget categories** — Review the default categories in the plan (Bills & Fixed, Groceries, Transport, Eating Out, Shopping, Health, Fun). Want to add/remove any?

---

## Before B-3 (Transaction Categorisation)

- [ ] **Review categorisation rules** — Ralph will create default rules mapping UP categories to Mjolnir categories. Review and customize for your merchants (e.g. salary description pattern "THE WORKWEARGRO").
- [ ] **Update n8n categorisation workflow** — If Ralph creates a categorisation rules JSON, import/update it in n8n.

---

## Before B-5 (AI Recommendations)

- [ ] **Add Claude API key to n8n** — Create an Anthropic API key and add `ANTHROPIC_API_KEY` to your droplet's `.env` file (see [security guide](../docs/n8n-security-guide.md)). Mjolnir never sees this key.
- [ ] **Import AI recommendation workflow** — Ralph will create the n8n workflow template. Import into n8n.

---

## Ongoing / As-Needed

- [ ] **Monitor n8n uptime** — If n8n goes down, webhooks from UP will be lost (UP does retry, but limited).
- [ ] **Rotate UP API token** — If compromised, regenerate in the UP app and update n8n credential.
- [ ] **Review uncategorised transactions** — Periodically check for transactions that didn't auto-categorise and fix the rules.
- [ ] **Adjust budget allocations** — As spending patterns change, update budget amounts.

---

## Quick Reference: Credential Locations

| Credential | Stored In | Mjolnir Knows? |
|-----------|-----------|----------------|
| UP API Token | n8n only | Never |
| Claude API Key | n8n only | Never |
| N8N_API_KEY | n8n + Mjolnir (Vercel env) | Yes |
| N8N_WEBHOOK_SECRET | n8n + Mjolnir (Vercel env) | Yes |
| Clerk keys | Mjolnir only (Vercel env) | Yes |
