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

## Repository Boundary

This repository is the independent AI Website Preflight project. Keep all changes within its approved Phase 05 scope.

## Current Scope

Phase 05 only: deterministic, evidence-based Fix Pack Markdown generation, safe copy/download, and Scan Again on top of approved scans, findings, and Ready Scores. Do not call an AI API, inspect or modify user repositories, open pull requests, deploy code, add authentication or payment, create dashboards, or implement any Phase 06+ functionality without explicit approval.
