# Decisions

## Phase 05.5 — Public launch hardening

- Stay on the Next.js 15.5.x line and upgrade only to a patched release; do not jump to Next 16 in this phase.
- Cap active scans with a process-local FIFO queue. Default concurrency is 1. This is not a durable queue and does not survive process restart.
- Rate-limit `POST /api/scans` in process memory by client IP and target hostname, with TTL and a maximum key count.
- Decode deterministic embedded IPv4 from IPv6 (NAT64, IPv4-compatible, 6to4, Teredo) and reuse the existing IPv4 BlockList instead of rewriting fetch.
- Persist and return only allowlisted response headers required for detection evidence.
