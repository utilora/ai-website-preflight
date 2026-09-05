# AI Website Preflight Development Rules

## Product Principle

This is a pre-launch verification product, not a generic SEO dashboard.

## MVP Priorities

1. Accurate evidence
2. Fast scan
3. Clear human-readable findings
4. Actionable Codex Fix Pack
5. Rescan loop
6. SEO landing pages

## Do Not Add Without Explicit Approval

- Authentication, payments, subscriptions, or user accounts
- AI API calls
- Dashboards, teams, Agency features, or browser extensions
- Automatic repository modification
- Unrelated utilities

## Engineering Constraints

- Production target is approximately 1 GB RAM. Keep architecture lightweight and avoid unnecessary background processes.
- Treat all scanned URLs and HTML as untrusted input. SSRF protection is mandatory before public URL scanning goes live.
- Every future finding must have reproducible evidence.
- Do not claim complete security auditing or legal compliance certification.
- Detection and scoring rules must have automated tests.

## Repository Boundary

Do not modify the existing financial project outside the `ai-website-preflight` directory.

## Current Scope

Phase 01 only: project initialization, visual skeleton, placeholder routes, health endpoint, minimal data-access contracts, documentation, and validation. Do not implement scanning or advance to Phase 02 without explicit approval.
