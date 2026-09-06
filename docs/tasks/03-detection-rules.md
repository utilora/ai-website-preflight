# Phase 03 Detection Rules

AI Website Preflight independent execution task. This Markdown file is the faithful implementation standard converted from `03_检测规则.docx`, with the explicit acceptance clarifications supplied for Phase 03.

## Goal

Implement the first set of explainable, reproducible, low-false-positive pre-launch checks on top of Phase 02 scan evidence. Every reported finding must contain a stable `ruleId`, `severity`, `title`, `message`, concrete `evidence`, and `affectedUrl`; optional metadata may preserve structured facts for later approved phases.

This phase detects and reports observed facts only. It must not calculate a Ready Score, total score, weighted status, READY/NOT READY label, Fix with Codex output, automatic fixes, or use an AI API.

## Evidence and severity principles

- Do not report a problem without direct evidence from the sampled response, headers, parsed HTML, robots.txt, sitemap, or safe resource request.
- When interpretation is uncertain, lower severity, narrow the trigger, or defer the rule.
- Severities are `critical`, `high`, `medium`, `low`, and `info`; Phase 03 does not attach numerical weights.
- Never claim legal compliance, complete security auditing, credential validity, or that a site is safe or vulnerable.
- Keep full HTML transient. Persist only bounded structured facts and short, non-sensitive evidence. Never retain matched secret values.

## Required rule groups

### Availability and indexability

- Homepage fetch failure and explicit 4xx/5xx status.
- Report HTTP only when the final homepage URL remains HTTP; an HTTP submission that redirects to HTTPS passes.
- Report a sitewide robots block only for a universal `User-agent: *` group with `Disallow: /`; do not treat bot-specific blocks as sitewide.
- Detect explicit meta robots and `X-Robots-Tag` noindex directives.
- Report AI crawler declarations for GPTBot, ClaudeBot, Google-Extended, and PerplexityBot as allowed, blocked, or not explicitly mentioned.

### Sitemap

- Report missing/unavailable, HTTP error, unparseable, and empty sitemap states with conservative severity.
- Record parsed URL counts and invalid URL counts. Do not treat a missing sitemap as critical.

### Metadata and document structure

- Canonical: missing, empty/invalid, and obvious cross-origin target.
- Title: missing, exact high-confidence starter-template values, and exact duplicates across sampled pages.
- Meta description: missing/empty and exact duplicates. Do not add subjective length scoring.
- H1: missing and repeated identical H1 values. Multiple distinct H1 elements are not automatically an error.
- Viewport presence.
- Obvious missing headings and heading-level jumps only; do not build an accessibility score.

### Links, content, and common resources

- Broken internal links only when a sampled source link maps to an explicit 4xx/5xx response or fetch error. Evidence includes source URL, target URL, and status/error.
- Placeholder anchors: missing/empty href, `href="#"`, and `javascript:void(0)`; ordinary anchors pass.
- High-confidence placeholder content: Lorem ipsum, uppercase TODO/FIXME, or a page title/H1 exactly equal to Coming soon.
- Favicon discovery/accessibility using a declared icon or the standard `/favicon.ico` fallback.
- Open Graph title, description, image URL validity, and safe image request status. Missing OG fields remain low severity.
- Privacy, terms, and contact/support/about links are factual homepage-link observations only and never legal conclusions.
- A deterministic unknown-path request may report a basic soft-404 signal at info severity and must use the Phase 02 safe fetch path.

### Accessibility basics

- Count only `<img>` elements that completely lack an `alt` attribute; `alt=""` passes this basic rule.
- Check input, textarea, and select controls for `<label for>`, `aria-label`, or `aria-labelledby`; hidden inputs are excluded.
- Bound examples in evidence rather than emitting hundreds of records.

### Security observations

- Factually report absence of HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and frame controls with conservative severity.
- Detect explicit HTTP resource URLs in HTTPS page markup as mixed content.
- Detect only high-confidence AWS access key, GitHub token, and private-key-header patterns in public page source. Redact values and say manual verification is required and this is not a complete security audit.

### Structured data

- Parse `<script type="application/ld+json">` blocks as JSON and report syntax failures only.
- Do not perform complete Schema.org semantic validation.

## Architecture

Rules are grouped under `src/server/rules/`. Each group is a pure function from `ScanEvidence` to `Finding[]`. The scan engine extracts bounded `PageFacts` while response bodies are transient, safely probes only required resources, runs the rule registry, and persists findings with scan evidence. Do not create a monolithic rules file or introduce a headless browser, Redis, external service, or AI dependency.

## Deterministic tests

Use fixtures and the existing local mock server only. Cover passing and failing cases for title, description, robots, noindex, canonical, broken links, placeholder links/content, Open Graph, image alt, form labels, security headers, mixed content, JSON-LD, AI crawler access, availability, HTTPS, sitemap, favicon, 404 behavior, headings, and policy-link observations. Include a clean-fixture false-positive review and assert every emitted finding has all required evidence fields.

## UI boundary

The `/scan/[id]` page may display Rule, Severity, Message, Evidence, and URL. It must not display or calculate a score, readiness status, weights, or Fix with Codex output.

## Acceptance

- At least 20 core rules operate deterministically.
- Every failure includes `ruleId`, `severity`, `message`, `evidence`, and `affectedUrl`.
- Every core rule has passing/failing fixture coverage appropriate to its trigger.
- False-positive-prone rules are conservative, narrowed, or deferred.
- `npm ci`, lint, typecheck, test, and build all pass.
- Phase 04 functionality is absent.

## Completion

Report the Phase 03 summary, rule inventory, architecture, false-positive controls, five validation results, acceptance status, known issues, deferred rules, and git status. Then stop and wait for human acceptance.
