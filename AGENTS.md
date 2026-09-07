# AI Website Preflight Development Rules

## Product Principle

This is a pre-launch verification product, not a generic SEO dashboard.

## MVP Priorities

1. Accurate evidence
2. Fast scan
3. Clear human-readable findings
4. Deterministic and explainable scoring
5. Actionable deterministic Fix Pack
6. Rescan loop
7. SEO landing pages

## Do Not Add Without Explicit Approval

- Authentication, payments, subscriptions, or user accounts
- AI API calls
- Dashboards, teams, Agency features, or browser extensions
- Automatic repository modification
- Unrelated utilities

## Engineering Constraints

- Production target is approximately 1 GB RAM. Keep architecture lightweight and avoid unnecessary background processes.
- Treat all scanned URLs and HTML as untrusted input. SSRF protection is mandatory before public URL scanning goes live.
- Every finding, score deduction, and Fix Pack task must have reproducible evidence.
- Do not claim complete security auditing or legal compliance certification.
- Detection, scoring, and Fix Pack templates must have automated tests.
- Scan execution uses a process-local queue with a conservative active-scan cap. Process restart does not recover queued or running scans.
- Do not trust client-supplied `X-Forwarded-For` or `X-Real-IP` unless `TRUST_PROXY_HEADERS=true` and the reverse proxy overwrites those headers.

## Repository Boundary

This repository is the independent AI Website Preflight project. Keep all changes within its approved Phase 05.5 scope.

## Current Scope

Phase 05.5 only: public-launch hardening on top of approved scans, findings, Ready Scores, and Fix Packs. Upgrade patched Next.js, cap process-local scan concurrency, rate-limit public scan creation, tighten IPv6 SSRF embeddings, and minimize stored/returned scan headers. Do not call an AI API, inspect or modify user repositories, open pull requests, deploy code, add authentication or payment, create dashboards, implement SEO tool pages, or start Phase 06 without explicit approval.
