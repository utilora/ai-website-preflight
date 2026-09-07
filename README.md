# AI Website Preflight

AI Website Preflight is a pre-launch verification product for people who build websites with Codex, Cursor, Lovable, Replit, Bolt, and related AI tools. It helps users turn reproducible website checks into a clear launch-readiness report and an actionable coding-agent task list.

## Current Development Stage

Phase 07 — Production Deployment

This repository provides constrained public URL scans, deterministic findings, a backend-calculated Ready Score, an evidence-based Fix Pack, and seven free focused website checks. Scan Again creates a new report without overwriting the old result.

The Fix Pack is generated from stable templates and the server's stored findings. It does not call an AI API and does not inspect, clone, or modify the user's repository.

## Technology Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Lightweight Node.js runtime with a process-local scan queue

## Local Development

1. Copy `.env.example` to `.env.local` and adjust values if needed.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open `http://localhost:3000`.

## Ready Score v1

Scores start at 100 and use fixed deductions: critical 15, high 8, medium 4, low 1, and info 0. Deductions are aggregated by `ruleId`: site-wide rules count once, while page-level rules are capped at one critical, two high, three medium, or three low occurrences. The report still preserves the true number of affected URLs.

- READY TO LAUNCH: no critical findings and score 90–100
- ALMOST READY: no critical findings and score 75–89
- NOT READY: any critical finding or score below 75

Ready Score summarizes automated checks from the sampled pages; it is not a complete security, compliance, or website-quality assessment.

## Fix Pack

Completed reports can generate UTF-8 `PRELAUNCH_FIX.md` content. Repeated findings are grouped by rule, evidence and affected URLs are sanitized and bounded, and every repair task includes a goal, framework-neutral guidance, and acceptance criteria. Informational observations do not become automatic repair tasks.

The Fix Pack is deterministic and does not modify the user's repository. Users should review the tasks, let their coding agent inspect the real framework and source structure, deploy through their normal process, and then run Scan Again.

## Free Tools

`/tools` hosts seven focused checkers: sitemap, robots.txt, meta tags, Open Graph, security headers, broken internal links, and AI crawler rules. Each page is indexable, answers one question, and links to Full Website Preflight. Results are shown on the current page and are not stored as public URLs.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `DATABASE_PATH` | SQLite scan database path | `./data/preflight.db` |
| `LOG_LEVEL` | Minimum structured log level | `info` |
| `MAX_ACTIVE_SCANS` | Process-local concurrent scans | `1` (hard cap 4) |
| `SCAN_RATE_LIMIT_IP_MAX` | Scan creates allowed per IP window | `5` |
| `SCAN_RATE_LIMIT_HOST_MAX` | Scan creates allowed per target host window | `3` |
| `SCAN_RATE_LIMIT_IP_WINDOW_MS` | IP window length | `600000` |
| `SCAN_RATE_LIMIT_HOST_WINDOW_MS` | Host window length | `600000` |
| `SCAN_RATE_LIMIT_MAX_KEYS` | Maximum in-memory rate-limit keys | `2048` |
| `TRUST_PROXY_HEADERS` | Trust reverse-proxy IP headers | `false` |
| `MAX_ACTIVE_TOOL_RUNS` | Concurrent free-tool checks | `2` (hard cap 4) |
| `TOOL_RATE_LIMIT_IP_MAX` | Tool runs allowed per IP window | `20` |
| `TOOL_RATE_LIMIT_IP_WINDOW_MS` | Tool IP window length | `600000` |
| `TOOL_RATE_LIMIT_HOST_MAX` | Tool runs allowed per target host window | `8` |
| `TOOL_RATE_LIMIT_HOST_WINDOW_MS` | Tool host window length | `600000` |
| `TOOL_RATE_LIMIT_MAX_KEYS` | Maximum in-memory tool rate-limit keys | `2048` |
| `BACKUP_DIR` | Daily SQLite backup directory | `./data/backups` |
| `BACKUP_KEEP_DAYS` | Backup retention | `14` |

## Validation

Run the following before merging or deploying:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

## Production Deployment

Full operator steps: [docs/deployment/production.md](docs/deployment/production.md).

Prerequisites: Node.js 22 LTS, systemd, Nginx or Caddy, a public hostname you already control.

1. Copy `deploy/env.production.example` to `/etc/ai-website-preflight.env` and set `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN`.
2. Source that file, then `npm ci && npm run build` as the `preflight` user (`NEXT_PUBLIC_APP_URL` is inlined at build time).
3. `npm run start` binds `127.0.0.1:3000` only. Do not publish that port.
4. Reverse-proxy with the overwrite headers in `deploy/nginx-ai-website-preflight.conf`, then set `TRUST_PROXY_HEADERS=true`.
5. Enable `ai-website-preflight.service` plus the daily backup and 30-day cleanup timers.
6. Health check: `GET /api/health`.

Rollback: `git checkout <previous-sha> && npm ci && npm run build && systemctl restart ai-website-preflight`.

GitHub Actions runs lint/typecheck/test/build on push and pull request. It does not deploy.

## Scope Boundary

Phase 07 is production operations for the existing Preflight + seven free tools. Do not add AI APIs, GitHub mutation, authentication, payments, dashboards, new SEO tools, or automatic CD without explicit approval. See [AGENTS.md](AGENTS.md).

## Known Limitations

Scan tasks use a process-local queue. If the application process restarts, tasks left in `queued` or `running` state are not automatically resumed. Rate limits are process-local. Completed scans older than 30 days can be pruned; queued, running, and failed rows are kept.
