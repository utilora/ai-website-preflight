# Phase 04 — Ready Score and Results

This document is the direct implementation standard faithfully converted from `04_评分结果页.docx` for the independent AI Website Preflight repository.

## Goal and boundary

Turn Phase 03 findings into an explainable pre-launch report with a deterministic Ready Score, readiness status, grouped evidence, complete scan lifecycle states, and Scan Again. Phase 04 does not include Fix with Codex, PRELAUNCH_FIX.md, AI APIs or repair guidance, automatic code changes, authentication, payments, dashboards, teams, or any Phase 05+ feature.

## Deterministic scoring model

Every completed scan starts at 100 points. Findings deduct fixed points by severity:

| Severity | Deduction per counted occurrence | Page-level cap per rule | Site-wide cap per rule |
| --- | ---: | ---: | ---: |
| critical | 15 | 1 | 1 |
| high | 8 | 2 | 1 |
| medium | 4 | 3 | 1 |
| low | 1 | 3 | 1 |
| info | 0 | 0 | 0 |

Deductions aggregate by stable `ruleId`. Site-wide rules deduct at most once. Page-level rules may represent repeated impact but stop deducting at the stated cap. `affectedCount` remains the number of distinct affected URLs even when only some occurrences count toward the score. The total is clamped to the inclusive range 0–100. Scoring is calculated and persisted by the backend only.

## Readiness status

- `READY TO LAUNCH`: no critical findings and score is at least 90.
- `ALMOST READY`: no critical findings and score is between 75 and 89.
- `NOT READY`: at least one critical finding or score is below 75.

A critical finding is a hard blocker even when the numeric score would otherwise be high. Ready Score is an explainable summary of automated checks, not an absolute quality, security, or compliance measurement.

## Result page

`/scan/[id]` uses the unpredictable UUID created for each scan and must be `noindex, nofollow`. It is not included in the sitemap.

- `queued`: explain that the task is waiting to start.
- `running`: explain that sampled public pages are being checked.
- `completed`: show domain, completion time, sample count, score, readiness status, plain-language summary, per-rule deductions, and grouped evidence.
- `failed`: do not show a score or readiness status; show a bounded error summary, submitted URL, and Scan Again.

Polling uses a reasonable interval and stops after `completed` or `failed`, and it stops when the page unmounts.

## Result grouping and evidence

- Must Fix: critical and high findings.
- Warnings: medium and low findings.
- Info: informational findings that deduct no points.

Do not invent passed checks. Repeated findings are grouped by `ruleId`, show the true affected URL count, and expand to retain every finding's evidence and affected URL. The UI may explain why an observation matters using the Phase 03 message, but must not generate repair steps.

## Scan Again

Scan Again submits the original normalized URL to the scan creation endpoint, creates a new UUID and report, preserves the old scan, and navigates to the new `/scan/[id]`. It does not create a history dashboard.

## Deterministic test requirements

- Score: no findings; each severity; info has no deduction; inclusive 0–100 clamp.
- Status: exact 90, 89, 75, and 74 thresholds; critical hard blocker.
- Aggregation: repeated `ruleId` respects its cap while preserving distinct affected URL count.
- Grouping: critical/high to Must Fix, medium/low to Warnings, info to Info.
- Rescan: new ID, old record unchanged, original normalized/submitted URL retained.
- Failure: failed scan has no score and can never be displayed as READY.
- UX fixtures: a clean scan, a few small issues, and a true launch blocker produce proportionate outcomes.

## Acceptance checklist

- [x] Fixed deterministic deductions and 0–100 clamp.
- [x] Critical hard blocker and exact readiness thresholds.
- [x] Rule-level aggregation caps with separate affected URL counts.
- [x] Backend-calculated and persisted score and groups.
- [x] Queued, running, completed, and failed result states.
- [x] Grouped cards retain severity, title, message, evidence, and affected URL.
- [x] Scan Again creates a new scan ID without overwriting the prior report.
- [x] Terminal-state/unmount polling stop.
- [x] Result route `noindex, nofollow` and absent from sitemap.
- [x] Deterministic tests and false-UX fixtures.
- [x] Scope and stage documentation updated for Phase 04.
- [x] Required validation commands pass in the final Phase 04 commit.
- [x] Phase 04 commit is pushed to `origin/main`.

## Known inherited limitation

The scan worker and queue are process-local. Restarting the application does not resume scans left in `queued` or `running`. Redis or a more complex queue remains outside this phase.
