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

This repository is the independent AI Website Preflight project. Keep all changes within its approved Phase 03 scope.

## Current Scope

Phase 03 only: evidence extraction and deterministic detection findings on top of the approved Phase 02 scanner. Do not implement scoring, readiness labels, recommendations, Fix Packs, or advance to Phase 04 without explicit approval.
