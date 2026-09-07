# AI Website Preflight

AI Website Preflight is a pre-launch verification product for people who build websites with Codex, Cursor, Lovable, Replit, Bolt, and related AI tools. It helps users turn reproducible website checks into a clear launch-readiness report and an actionable coding-agent task list.

## Current Development Stage

Phase 05.5 — Public Launch Hardening

This repository provides constrained public URL scans, deterministic findings, a backend-calculated Ready Score, and an evidence-based Fix Pack that users can copy or download for a coding agent. Scan Again creates a new report without overwriting the old result.

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

1. Set `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`, and `LOG_LEVEL` in the deployment environment.
2. Run `npm ci` followed by `npm run build`.
3. Start the single application process with `npm run start`.
4. Configure a reverse proxy and health check against `/api/health`.

The Phase 05.5 architecture intentionally avoids external queues, browser workers, and additional services so it remains suitable for a roughly 1 GB RAM server.

## Scope Boundary

Phase 05.5 includes public-launch hardening: patched Next.js, a process-local scan queue, IP/host rate limits, tighter IPv6 SSRF checks, and minimized scan headers. Do not add AI APIs, GitHub access, automatic repository modification, pull requests, deployment, authentication, payments, subscriptions, dashboards, teams, browser extensions, SEO tool pages, or Phase 06+ features without explicit approval. See [AGENTS.md](AGENTS.md) and the converted requirements under `docs/`.

## Known Limitations

Scan tasks use a process-local queue. If the application process restarts, tasks left in `queued` or `running` state are not automatically resumed. Phase 05.5 does not introduce Redis or a durable queue; recovery is deferred to a separately approved future change.
