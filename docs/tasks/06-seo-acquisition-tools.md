# Phase 06 — SEO Acquisition Tools

This document is the implementation standard for the first public free-tool surface. It sits on top of approved Phase 01–05.5 code.

## Goal

Turn `/tools/[tool]` placeholders into seven useful, indexable, focused checkers that reuse existing scan safety and naturally lead to Full Website Preflight.

This is not a second scan engine. Tools answer one question each. They must not silently run the 8-page Preflight.

## In scope

1. `/tools` hub plus seven tools: sitemap, robots.txt, meta tags, Open Graph, security headers, broken links, AI crawlers.
2. Shared tool infrastructure: registry, runner, analyzers, API, rate limits.
3. Reuse Phase 02–05.5 URL normalization, SSRF-safe fetch, header sanitation, HTML evidence, robots/sitemap parsers, and the AI crawler registry.
4. Server-rendered landing content, unique metadata, self-canonicals, site sitemap/robots, internal links, and a modest homepage teaser.
5. Deterministic tests for each tool, safety, rate limits, and SEO fields.

## Out of scope / prohibited

- Login, OAuth, email gates, Stripe, payments, subscriptions
- AI APIs, GitHub mutation, dashboards, Agency, browser extensions
- Playwright/Puppeteer, full-site crawlers, Redis, durable queues
- Persisted/indexable result URLs, analytics SaaS, bulk SEO landing pages
- Expanding beyond these seven tools
- Claiming complete SEO, security, or indexability audits

## Architecture

```
Tool page (RSC + client form)
  → POST /api/tools/[tool]
  → IP/host rate limit (TRUST_PROXY_HEADERS)
  → normalizePublicUrl + createSafeFetcher
  → tool-specific analyzer
  → JSON result (not stored, not indexed)
```

## Resource limits

- Tool fetches use the existing pinned-IP transport, redirect re-validation, timeouts, and byte caps.
- Broken Link Checker: submitted page only, internal links only, max 20 unique URLs, concurrency 2, no recursion. External links are skipped.
- Sitemap Checker: robots.txt + one sitemap document. Sitemap indexes are identified, not expanded.
- Open Graph image checks use safe fetch. The browser does not load arbitrary remote images.

## Acceptance

- [x] Seven tools return real results from safe fetches.
- [x] Unknown tools 404; scan reports stay `noindex` and out of the project sitemap.
- [x] SSRF and rate-limit tests pass, including trusted-proxy header behavior.
- [x] Unique title, description, canonical, and H1 per tool.
- [x] `npm ci`, lint, typecheck, test, and build pass.

## Completion

Stop after the Phase 06 report. Do not start Phase 07, deploy, buy a domain, or add analytics/auth/payments.
