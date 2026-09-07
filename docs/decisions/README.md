# Decisions

## Phase 05.5 — Public launch hardening

- Stay on the Next.js 15.5.x line and upgrade only to a patched release; do not jump to Next 16 in this phase.
- Cap active scans with a process-local FIFO queue. Default concurrency is 1. This is not a durable queue and does not survive process restart.
- Rate-limit `POST /api/scans` in process memory by client IP and target hostname, with TTL and a maximum key count.
- Decode deterministic embedded IPv4 from IPv6 (NAT64, IPv4-compatible, 6to4, Teredo) and reuse the existing IPv4 BlockList instead of rewriting fetch.
- Persist and return only allowlisted response headers required for detection evidence.
- IP rate limits do not trust `X-Forwarded-For` or `X-Real-IP` unless `TRUST_PROXY_HEADERS=true`. A reverse proxy must overwrite those headers; untrusted mode uses a single `direct` identity so forged headers cannot mint new limiter keys. Trusted mode uses the last forwarded hop.

## Phase 06 — SEO acquisition tools

- Ship seven focused free tools, not a second scan engine. Each tool fetches only what that question needs.
- Reuse `normalizePublicUrl` and `createSafeFetcher`. Tools never call raw `fetch(userUrl)`.
- Rate-limit tool runs separately from full scans, still using `clientIpFromHeaders` and `TRUST_PROXY_HEADERS`.
- Do not persist tool results as public URLs. Broken Link Checker stays internal-only, max 20 links, concurrency 2, no recursion.
- AI crawler names stay on the Phase 03 registry: GPTBot, ClaudeBot, Google-Extended, PerplexityBot.
