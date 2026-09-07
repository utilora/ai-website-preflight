# Production Deployment

Single-instance layout for a roughly 1 GB RAM VPS:

```text
Internet → Nginx or Caddy (80/443) → 127.0.0.1:3000 → Next.js → SQLite
```

Do not expose port 3000. Do not enable `TRUST_PROXY_HEADERS` until the proxy overwrites forwarding headers.

This repository ships the deploy kit. Applying it requires SSH to a host you already control, plus a hostname you already own. This phase does not buy a domain and does not add CD.

## Prerequisites

- Ubuntu/Debian-style Linux with systemd
- Node.js 22.16+ LTS (`node:sqlite` `backup()` required)
- Nginx **or** Caddy, not both
- Git, npm (`/usr/bin/npm` on the systemd PATH)
- A public hostname you already control (do not buy a domain from this phase)
- Ports 80, 443, and SSH only on the public interface

Inspect the host first. Do not remove unrelated sites, steal ports, or rewrite an existing SSH setup.

## Layout

```text
/var/www/ai-website-preflight/app      # git checkout
/var/www/ai-website-preflight/data     # SQLite, not in git
/var/www/ai-website-preflight/backups  # daily DB copies
/etc/ai-website-preflight.env          # secrets stay off git
```

## First install

```bash
sudo useradd --system --home /var/www/ai-website-preflight --shell /usr/sbin/nologin preflight
sudo mkdir -p /var/www/ai-website-preflight/{app,data,backups}
sudo git clone https://github.com/utilora/ai-website-preflight.git /var/www/ai-website-preflight/app
sudo cp /var/www/ai-website-preflight/app/deploy/env.production.example /etc/ai-website-preflight.env
sudo $EDITOR /etc/ai-website-preflight.env   # set NEXT_PUBLIC_APP_URL to https://YOUR_DOMAIN
sudo chmod 640 /etc/ai-website-preflight.env
sudo chown -R preflight:preflight /var/www/ai-website-preflight
sudo chown root:preflight /etc/ai-website-preflight.env

cd /var/www/ai-website-preflight/app
sudo -u preflight -H bash -lc 'set -a; . /etc/ai-website-preflight.env; set +a; npm ci && npm run lint && npm run typecheck && npm run test && npm run build'

sudo cp deploy/ai-website-preflight.service /etc/systemd/system/
sudo cp deploy/ai-website-preflight-cleanup.service /etc/systemd/system/
sudo cp deploy/ai-website-preflight-cleanup.timer /etc/systemd/system/
sudo cp deploy/ai-website-preflight-backup.service /etc/systemd/system/
sudo cp deploy/ai-website-preflight-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ai-website-preflight.service
sudo systemctl enable --now ai-website-preflight-cleanup.timer
sudo systemctl enable --now ai-website-preflight-backup.timer
```

Record the SHA before the first start:

```bash
git -C /var/www/ai-website-preflight/app rev-parse HEAD
```

## Nginx

If the host already runs Nginx, reuse it. Copy `deploy/nginx-ai-website-preflight.conf`, replace `YOUR_DOMAIN`, enable the site, then issue a Let's Encrypt certificate:

```bash
sudo certbot --nginx -d YOUR_DOMAIN
sudo nginx -t && sudo systemctl reload nginx
```

Required proxy headers (overwrite, do not append):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

Never append a client-supplied forwarded chain. After this is live, keep `TRUST_PROXY_HEADERS=true`.

HTTP must redirect to HTTPS. Certbot handles renewal via `certbot.timer`.

## Caddy

Use Caddy only when Nginx is not already the host proxy. Copy `deploy/Caddyfile`, replace `YOUR_DOMAIN`, then:

```bash
sudo caddy validate --config deploy/Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy must overwrite `X-Forwarded-For` and `X-Real-IP` with `{remote_host}` (see the sample file). Automatic HTTPS is built in.

## Node bind address

`NEXT_PUBLIC_APP_URL` is inlined at `npm run build`. Source `/etc/ai-website-preflight.env` before building, or robots.txt and sitemap.xml will keep `localhost`. Runtime-only systemd env is enough for `DATABASE_PATH`, rate limits, and `TRUST_PROXY_HEADERS`.

`npm run start` listens on `127.0.0.1:3000` only. Confirm with `ss -tlnp | grep 3000`.

## Update

```bash
cd /var/www/ai-website-preflight/app
sudo -u preflight git fetch origin
sudo -u preflight git checkout main
sudo -u preflight git pull --ff-only
PREVIOUS=$(git rev-parse HEAD@{1})
sudo -u preflight -H bash -lc 'set -a; . /etc/ai-website-preflight.env; set +a; npm ci && npm run build'
sudo systemctl restart ai-website-preflight
curl -fsS https://YOUR_DOMAIN/api/health
```

Optional before restart: `npm run lint && npm run typecheck && npm run test`.

## Rollback

```bash
cd /var/www/ai-website-preflight/app
sudo -u preflight git checkout "$PREVIOUS"
sudo -u preflight -H bash -lc 'set -a; . /etc/ai-website-preflight.env; set +a; npm ci && npm run build'
sudo systemctl restart ai-website-preflight
```

## Backup and cleanup

- Daily backup: `npm run backup-scans` → `$BACKUP_DIR/preflight-YYYY-MM-DD.db`, keep 14 days
- Daily cleanup: `npm run cleanup-old-scans` deletes **completed** scans older than 30 days
- Queued, running, failed, and recent completed rows are kept
- Restore: stop the service, copy a backup over `DATABASE_PATH`, start the service

## Health and logs

```bash
curl -fsS https://YOUR_DOMAIN/api/health
journalctl -u ai-website-preflight -e
```

Health must return HTTP 200. It reports status/phase only; it does not include filesystem paths or secrets.

Prefer journald. Do not log full HTML, secrets, cookies, or Authorization headers. If journald is unbounded on a 1 GB / 50 GB host, set `SystemMaxUse=200M` in a drop-in; do not rewrite a host that already has limits.

## Smoke tests after DNS is live

1. `https://YOUR_DOMAIN/`
2. `/tools`, `/tools/sitemap-checker`, `/tools/meta-tag-checker`, `/tools/broken-link-checker`, `/tools/ai-crawler-checker`
3. `/robots.txt`, `/sitemap.xml` (canonical host must not be localhost)
4. `/api/health`
5. Create a Full Preflight against a site you own, wait for completed, open Fix Pack, Scan Again
6. Send a forged `X-Forwarded-For` through the public HTTPS URL; limiter identity must follow the proxy-set IP
7. Submit `http://127.0.0.1/` and `http://localhost/`; expect a 400-class user error, not a stack trace

## Search Console

Once HTTPS works, verify the property and submit `https://YOUR_DOMAIN/sitemap.xml`. Do not start 30-day SEO operations in this phase.

## Secrets

Never commit `/etc/ai-website-preflight.env`, backups, SQLite files, SSH keys, or DNS tokens.
