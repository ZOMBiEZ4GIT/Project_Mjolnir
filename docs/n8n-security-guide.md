# n8n Security Guide — Self-Hosted (Digital Ocean)

Your n8n instance is self-hosted on a Digital Ocean droplet. Since n8n's built-in credential store requires a paid plan, secrets are managed via **environment variables** on the droplet itself.

---

## 1. Where Secrets Live

| Secret | Environment Variable | Used By |
|--------|---------------------|---------|
| UP Bank API Token | `UP_API_TOKEN` | n8n workflows (Header Auth) |
| Mjolnir API Key | `N8N_API_KEY` | n8n → Mjolnir requests |
| Mjolnir Webhook Secret | `N8N_WEBHOOK_SECRET` | HMAC signature verification |
| Claude API Key (B-5) | `ANTHROPIC_API_KEY` | n8n AI recommendation workflow |

## 2. Setting Environment Variables

### If n8n runs via Docker (most common DO setup)

Edit your docker-compose or `.env` file on the droplet:

```bash
ssh root@YOUR_DROPLET_IP

# Find your n8n directory (common locations)
cd /root/n8n  # or /opt/n8n, wherever you set it up

# Edit the .env file
nano .env
```

Add these lines:

```env
# UP Bank
UP_API_TOKEN=up:yeah:YOUR_TOKEN_HERE

# Mjolnir integration
N8N_API_KEY=YOUR_GENERATED_KEY
N8N_WEBHOOK_SECRET=YOUR_GENERATED_SECRET

# AI (add later for B-5)
# ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
```

Then restart n8n:

```bash
docker compose down && docker compose up -d
```

### If n8n runs via systemd

```bash
ssh root@YOUR_DROPLET_IP

# Edit the n8n environment file
sudo nano /etc/n8n/.env
# OR edit the systemd override
sudo systemctl edit n8n
```

Add the same variables, then restart:

```bash
sudo systemctl restart n8n
```

## 3. Using Env Vars in n8n Workflows

In any n8n node, reference environment variables with the expression:

```
{{ $env.UP_API_TOKEN }}
```

For example, in an HTTP Request node's Header Auth:
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{ $env.UP_API_TOKEN }}`

For the Mjolnir API key in outgoing requests:
- **Header Name:** `X-API-Key`
- **Header Value:** `{{ $env.N8N_API_KEY }}`

## 4. Droplet Hardening Checklist

### SSH
- [ ] Disable password auth — use SSH keys only
- [ ] Change default SSH port (optional, reduces noise)
- [ ] Disable root login if you have a non-root user set up

```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin no  # only if you have another sudo user
```

### Firewall (UFW)
- [ ] Only allow necessary ports

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh           # or your custom SSH port
sudo ufw allow 443/tcp       # HTTPS for n8n
sudo ufw allow 80/tcp        # HTTP (for Let's Encrypt renewal)
sudo ufw enable
```

**Do NOT expose n8n on port 5678 directly.** Use a reverse proxy with HTTPS.

### Reverse Proxy (Nginx/Caddy)
- [ ] Terminate TLS at the proxy — n8n should only be accessible over HTTPS
- [ ] If using Caddy (simplest):

```
your-n8n-domain.com {
    reverse_proxy localhost:5678
}
```

Caddy handles TLS automatically via Let's Encrypt.

### n8n-Specific Settings

Add these to your n8n environment:

```env
# Disable public registration (critical — single user)
N8N_USER_MANAGEMENT_DISABLED=false
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=roland
N8N_BASIC_AUTH_PASSWORD=A_STRONG_PASSWORD_HERE

# Restrict webhook access by path prefix (optional)
WEBHOOK_URL=https://your-n8n-domain.com/

# Disable public API if not needed
N8N_PUBLIC_API_DISABLED=true
```

### File Permissions
- [ ] `.env` file should be readable only by the n8n process owner

```bash
chmod 600 .env
chown root:root .env  # or whichever user runs n8n
```

## 5. Secrets Rotation

| When | Action |
|------|--------|
| UP token compromised | Regenerate in UP app, update `UP_API_TOKEN` on droplet, restart n8n |
| Mjolnir keys compromised | Generate new keys, update on droplet AND in Vercel env vars, restart both |
| Claude key compromised | Regenerate at console.anthropic.com, update `ANTHROPIC_API_KEY` on droplet |
| Routine rotation | Every 6 months, rotate `N8N_API_KEY` and `N8N_WEBHOOK_SECRET` (update both sides) |

## 6. Backup

- [ ] Back up your n8n workflows periodically: **Settings > Export All Workflows**
- [ ] Your `.env` file is the only place secrets live — include it in your backup strategy (encrypted)
- [ ] Digital Ocean droplet snapshots are an easy way to back up the whole instance

## 7. Monitoring

- [ ] Set up Digital Ocean uptime monitoring for your n8n URL
- [ ] n8n logs: `docker compose logs -f` or `journalctl -u n8n -f`
- [ ] If n8n goes down, UP webhook retries are limited — check for missed transactions after any outage

---

## Quick Setup Sequence

1. SSH into your droplet
2. Generate your keys locally: `openssl rand -hex 32` (run twice — one for API key, one for webhook secret)
3. Add all env vars to your n8n `.env` file
4. Restart n8n
5. Verify in n8n: create a test workflow with a Code node that outputs `{{ $env.UP_API_TOKEN }}` — confirm it resolves, then delete the test workflow
6. Add `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, and `N8N_BASE_URL` to Vercel env vars
7. Add the same three to your local `.env`
