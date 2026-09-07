# Phase 07 — Production Deployment

This document is the implementation standard for putting the approved Phase 01–06 product on a single public host. It is not a product-feature phase.

## Goal

Ship a maintainable production layout: reverse proxy → `127.0.0.1:3000` → Next.js → SQLite, with CI, backups, 30-day completed-scan cleanup, HTTPS, and a documented rollback.

## In scope

1. Repository deploy kit: systemd unit, Nginx site, env example, backup/cleanup scripts.
2. GitHub Actions CI (`npm ci`, lint, typecheck, test, build). No CD.
3. Bind the Node process to localhost; keep SQLite off `/tmp` and out of Git.
4. Conservative security headers that do not add a strict CSP.
5. Operator documentation for VPS, proxy trust headers, HTTPS, backups, and rollback.

## Out of scope / prohibited

- Login, payments, AI APIs, dashboards, new SEO tools, bulk landing pages
- Redis, Kubernetes, multi-instance, load balancers, PM2 (unless systemd is unavailable)
- Automatic deploy from GitHub Actions
- Buying a domain or committing secrets
- Changing SSH hardening on an already-configured server

## Trust boundary

`TRUST_PROXY_HEADERS=true` only after Nginx/Caddy **overwrites** `X-Forwarded-For` and `X-Real-IP` with `$remote_addr`. Never `$proxy_add_x_forwarded_for`.

## Acceptance

- [x] CI workflow exists and runs the five validation commands.
- [x] `npm start` listens on `127.0.0.1:3000`.
- [x] Cleanup deletes completed scans older than 30 days and preserves queued, running, failed, and recent completed rows.
- [x] Backup and rollback steps are documented.
- [x] Production docs do not contain secrets.
- [ ] Live VPS systemd/HTTPS/smoke tests — require operator SSH, a hostname already owned, and DNS. This environment has no target host.

## Completion

Stop after the Phase 07 report. Do not start Phase 08, Search Console operations, or new features.
