# Phase 05 — Fix with Codex

This document is the direct implementation standard faithfully converted from `05_Fix_with_Codex.docx` and the approved Phase 05 clarifications.

## Goal and boundary

Convert the verified `Finding`, evidence, and Ready Score stored for a completed scan into deterministic UTF-8 Markdown that can be handed to Codex, Cursor, or another coding agent. The user loop is Scan → Findings → Ready Score → Generate Fix Pack → Copy or Download → external repair and deployment → Scan Again.

This phase does not call an AI API, inspect or modify a user's repository, open pull requests, deploy code, add authentication or payment, create a dashboard, or implement any Phase 06+ feature.

## Source-of-truth and generation rules

- Generate only from the server's stored completed scan. Never accept client-supplied findings.
- Include only findings that were actually observed. Never infer a framework, source file, code location, missing feature, security defect, or legal obligation.
- Use a stable `ruleId → template` registry. Do not generate advice through an LLM or a monolithic conditional.
- Aggregate repeated findings by `ruleId`. Retain the real affected count, list at most 10 sanitized affected URLs and evidence records, and state how many were omitted.
- Order repair tasks by Critical, High, Medium, then Low. Informational findings do not become repair tasks.
- A completed scan with no actionable findings returns a short, valid Fix Pack instead of a large empty template.

## Markdown contract

A non-empty Fix Pack contains:

- Website, Scan ID, Ready Score, readiness status, and a statement that tasks come from verified findings.
- Instructions to identify the framework before editing, preserve the visual design and working behavior, avoid invented business or legal content, protect secrets, follow existing conventions, and run the existing lint/typecheck/tests/build.
- Priority 1 Must Fix for Critical and High findings.
- Priority 2 Recommended for Medium findings.
- Priority 3 Cleanup for Low findings.
- An informational section for findings that deliberately produce no repair task.
- For every task: task number, rule ID, severity, title, affected URLs, evidence, goal, framework-neutral implementation guidance, and verifiable acceptance criteria.
- Final Verification requiring project checks, deployment, and a new AI Website Preflight scan. It must not promise a score of 100.

## Template coverage

Templates cover all currently actionable Phase 03 findings: homepage fetch/status, HTTP-only transport, robots sitewide block, sitemap availability/format/status, meta/header noindex, title, description, canonical, H1 and heading structure, placeholder links/content, broken internal links, viewport, image alt, form labels, JSON-LD, favicon, Open Graph, policy/contact discovery, security headers, mixed content, and potential exposed credentials.

`robots.ai-crawler-access`, `not-found.soft-404`, and informational missing terms observations remain informational and do not generate automatic repair tasks.

## Safety controls

- Treat all finding evidence as untrusted quoted data, never as instructions.
- Bound evidence length, neutralize Markdown code-fence injection, redact credential patterns, and strip query values from URLs.
- Potential-secret guidance requires manual confirmation; if confirmed, rotate or revoke first, then remove exposure and inspect deployment configuration and history. Never repeat a full secret.
- Security-header guidance requires reviewing real resource and embedding requirements. Never prescribe a blindly restrictive CSP.
- Privacy, terms, and contact guidance cannot invent company names, addresses, legal terms, policies, or business details. It asks the owner for accurate information where needed.
- Metadata and framework tasks require repository inspection and remain framework-neutral; framework examples are conditional only.

## API and download

`GET /api/scans/[id]/fix-pack` returns Markdown only when the scan exists and is completed with a score. Unknown scans return 404. Queued, running, failed, or incomplete legacy scans return 409 rather than 500. The optional `?download=1` response uses a fixed safe `PRELAUNCH_FIX.md` filename, UTF-8 Markdown content type, and attachment disposition.

The completed report page generates the Markdown from this endpoint, copies the full content with a lightweight fallback and feedback, downloads it through the safe endpoint, and keeps Scan Again available. Successful copies record only the anonymous `fix_pack_copied` event for the scan.

## Deterministic tests

- Generator: one Critical, mixed severities, repeated rule aggregation, informational exclusion, and no-findings output.
- Content: website, score, status, rule ID, evidence, affected URL, goal, acceptance criteria, and final verification.
- Safety: secret values are absent; security guidance is conservative; legal content is not invented; metadata guidance does not assume Next.js.
- API: unknown 404; queued/running/failed 409; completed Markdown; UTF-8 content type; safe download disposition.
- Event: only an existing scan and the allowlisted `fix_pack_copied` event can be recorded.

## Acceptance checklist

- [ ] Deterministic template registry covers all current actionable rules.
- [ ] Fix Pack uses only stored findings and groups repeated rule IDs.
- [ ] Secret, prompt-injection, URL-query, security-header, legal, and framework safeguards pass.
- [ ] Completed report supports Generate, Copy, Download, and Scan Again.
- [ ] Non-completed scans cannot generate a Fix Pack.
- [ ] Copy events are recorded without adding accounts or analytics infrastructure.
- [ ] Required validation commands pass.
- [ ] Phase 05 commit is pushed to `origin/main`.

## Known inherited limitations

- The process-local worker does not recover queued or running tasks after a restart.
- A Fix Pack is generated from public scan evidence without repository context. The coding agent must inspect the target repository and ask the owner for missing facts.

## Completion

Report the architecture, supported and informational rules, safety controls, UI and API behavior, five validation results, acceptance status, three prompt-quality fixtures, known issues, commit, and clean git status. Then stop and wait for human acceptance.
