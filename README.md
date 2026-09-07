# AI Website Preflight

AI Website Preflight is a pre-launch verification product for people who build websites with Codex, Cursor, Lovable, Replit, Bolt, and related AI tools. It helps users turn reproducible website checks into a clear launch-readiness report.

## Current Development Stage

Phase 04 — Ready Score and Results

This repository provides constrained public URL scans, deterministic Phase 03 findings, and a backend-calculated Ready Score with READY TO LAUNCH, ALMOST READY, or NOT READY status. The private result page groups evidence into Must Fix, Warnings, and Info and can start a new scan without overwriting the old report.

Fix with Codex, PRELAUNCH_FIX.md, AI-generated repair guidance, automatic code changes, authentication, payments, and dashboards are not implemented.

## Technology Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Lightweight Node.js runtime with a process-local Phase 02 worker

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

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `DATABASE_PATH` | SQLite scan database path | `./data/preflight.db` |
| `LOG_LEVEL` | Minimum structured log level | `info` |

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

The Phase 02 architecture intentionally avoids external queues, browser workers, and additional services so it remains suitable for a roughly 1 GB RAM server.

## Scope Boundary

Phase 04 includes deterministic scoring, readiness labels, result grouping, report states, and rescan. Do not add Fix with Codex, Fix Packs, authentication, payments, subscriptions, AI APIs, dashboards, teams, browser extensions, or automatic repository modification without explicit approval. See [AGENTS.md](AGENTS.md) and the converted requirements under `docs/`.

## Known Phase 02 Limitation

Scan tasks use a process-local worker. If the application process restarts, tasks left in `queued` or `running` state are not automatically resumed. Phase 02 intentionally does not introduce Redis or a complex queue; recovery is deferred to a separately approved future change.
