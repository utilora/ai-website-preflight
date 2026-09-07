# AI Website Preflight Development Rules

## Product Principle

This is a pre-launch verification product, not a generic SEO dashboard.

## MVP Priorities

1. Accurate evidence
2. Fast scan
3. Clear human-readable findings
4. Deterministic and explainable scoring
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
- Every finding and score deduction must have reproducible evidence.
- Do not claim complete security auditing or legal compliance certification.
- Detection and scoring rules must have automated tests.

## Repository Boundary

This repository is the independent AI Website Preflight project. Keep all changes within its approved Phase 04 scope.

## Current Scope

Phase 04 only: deterministic Ready Score calculation, readiness labels, grouped results, scan lifecycle states, report privacy metadata, and Scan Again on top of the approved Phase 03 findings. Do not implement Fix with Codex, PRELAUNCH_FIX.md, AI-generated recommendations, automatic fixes, authentication, payments, dashboards, or any Phase 05+ functionality without explicit approval.
