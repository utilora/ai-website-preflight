# AI Website Preflight

AI Website Preflight is a pre-launch verification product for people who build websites with Codex, Cursor, Lovable, Replit, Bolt, and related AI tools. It will help users identify launch-blocking issues and prepare an evidence-based Codex Fix Pack.

## Current Development Stage

Phase 03 — Detection Rules

This repository now provides constrained public URL scans plus deterministic, evidence-based Phase 03 findings for indexability, metadata, links, accessibility basics, security observations, and structured data. It does not calculate a score, readiness label, or recommend fixes.

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

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `DATABASE_PATH` | Reserved SQLite database path | `./data/preflight.db` |
| `LOG_LEVEL` | Minimum structured log level | `info` |

## Validation

Run the following before merging or deploying:

```text
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

Do not add scoring, readiness labels, Fix with Codex, authentication, payments, subscriptions, AI APIs, dashboards, teams, browser extensions, or automatic repository modification without explicit approval. See [AGENTS.md](AGENTS.md) and the converted requirements under `docs/`.

## Known Phase 02 Limitation

Scan tasks use a process-local worker. If the application process restarts, tasks left in `queued` or `running` state are not automatically resumed. Phase 02 intentionally does not introduce Redis or a complex queue; recovery is deferred to a separately approved future change.