import assert from "node:assert/strict";
import test from "node:test";
import { generateFixPack } from "../src/server/fix-pack/generate";
import { fixTemplateRegistry, informationalOnlyRuleIds } from "../src/server/fix-pack/registry";
import { calculateScore } from "../src/server/scoring";
import type { Finding, Severity } from "../src/server/rules";

function finding(ruleId: string, severity: Severity, affectedUrl = `https://site.test/${ruleId}`, evidence = "Verified fixture evidence"): Finding {
  return { ruleId, severity, title: `Title for ${ruleId}`, message: "Observed issue", evidence, affectedUrl };
}
function scan(findings: Finding[]) {
  return { id: "phase05-fixture", normalizedUrl: "https://site.test/", status: "completed" as const, findings, score: calculateScore(findings) };
}

test("single critical Fix Pack contains the complete deterministic task contract", () => {
  const result = generateFixPack(scan([finding("robots.sitewide-block", "critical", "https://site.test/", "User-agent: * with Disallow: /")]));
  assert.equal(result.taskCount, 1);
  for (const expected of ["Website: https://site.test/", "Ready Score: 85 / 100", "Status: NOT READY", "Task 1", "robots.sitewide-block", "Severity: CRITICAL", "Problem:", "Affected URLs", "Evidence", "Goal:", "Implementation guidance:", "Acceptance criteria:", "Final Verification"]) assert.ok(result.markdown.includes(expected), expected);
});

test("mixed severities are ordered by priority", () => {
  const result = generateFixPack(scan([finding("favicon.missing", "low"), finding("description.missing", "medium"), finding("title.missing", "high")]));
  assert.ok(result.markdown.indexOf("Priority 1") < result.markdown.indexOf("Priority 2"));
  assert.ok(result.markdown.indexOf("Priority 2") < result.markdown.indexOf("Priority 3"));
  assert.equal(result.taskCount, 3);
});

test("repeated rule IDs aggregate affected URLs and bound displayed evidence", () => {
  const findings = Array.from({ length: 12 }, (_, index) => finding("description.missing", "medium", `https://site.test/page-${index}`));
  const result = generateFixPack(scan(findings));
  assert.equal(result.taskCount, 1);
  assert.ok(result.markdown.includes("Affected URLs: 12"));
  assert.ok(result.markdown.includes("…and 2 more affected URL(s)."));
  assert.ok(result.markdown.includes("2 additional evidence record(s) omitted."));
});

test("info findings do not become repair tasks and empty scans stay concise", () => {
  const info = generateFixPack(scan([finding("robots.ai-crawler-access", "info")]));
  assert.equal(info.taskCount, 0);
  assert.ok(!info.markdown.includes("### Task"));
  assert.ok(info.markdown.includes("No repair tasks were generated"));
  assert.deepEqual(info.informationalRuleIds, ["robots.ai-crawler-access"]);

  const empty = generateFixPack(scan([]));
  assert.equal(empty.taskCount, 0);
  assert.ok(empty.markdown.includes("Run another scan after future site changes."));
});

test("secret and URL query values are removed while conservative security guidance remains", () => {
  const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
  const result = generateFixPack(scan([finding("security.potential-exposed-secret", "critical", `https://site.test/debug?token=${token}`, `Potential value ${token}; source https://site.test/debug?api_key=${token}`)]));
  assert.ok(!result.markdown.includes(token));
  assert.ok(result.markdown.includes("[REDACTED_GITHUB_TOKEN]"));
  assert.ok(result.markdown.includes("?redacted"));
  assert.ok(result.markdown.includes("rotate or revoke"));
  assert.ok(result.markdown.includes("Manually verify"));
});

test("legal, framework, and CSP templates remain conservative", () => {
  const result = generateFixPack(scan([
    finding("navigation.privacy-link-missing", "low"),
    finding("title.missing", "high"),
    finding("security.header.csp", "low"),
  ]));
  assert.ok(result.markdown.includes("Ask the site owner"));
  assert.ok(result.markdown.includes("Do not invent legal"));
  assert.ok(result.markdown.includes("identify the framework"));
  assert.ok(!result.markdown.includes("src/app/page.tsx"));
  assert.ok(!result.markdown.includes("default-src 'self'"));
  assert.ok(result.markdown.includes("Do not apply a blindly restrictive Content-Security-Policy"));
});

test("non-completed scans cannot be passed to the generator", () => {
  const failed = { ...scan([]), status: "failed" as const };
  assert.throws(() => generateFixPack(failed), /completed scan/i);
});

test("registry explicitly covers every current actionable Phase 03 rule", () => {
  const actionableRuleIds = [
    "availability.homepage-fetch", "availability.homepage-status", "transport.https",
    "robots.missing-or-unavailable", "robots.sitewide-block", "sitemap.missing-or-unavailable", "sitemap.http-error", "sitemap.invalid", "sitemap.empty",
    "indexability.meta-noindex", "indexability.header-noindex",
    "title.missing", "title.default-template", "title.duplicate",
    "description.missing", "description.duplicate",
    "canonical.missing", "canonical.invalid", "canonical.cross-origin",
    "heading.h1-missing", "heading.h1-duplicate", "viewport.missing",
    "links.broken-internal", "links.placeholder", "content.placeholder",
    "accessibility.image-alt-missing", "accessibility.form-label-missing", "accessibility.headings-missing", "accessibility.heading-level-jump",
    "structured-data.jsonld-invalid",
    "open-graph.title-missing", "open-graph.description-missing", "open-graph.image-missing", "open-graph.image-invalid", "open-graph.image-unavailable",
    "favicon.missing", "favicon.unavailable",
    "navigation.privacy-link-missing", "navigation.contact-link-missing",
    "security.header.hsts", "security.header.csp", "security.header.nosniff", "security.header.referrer-policy", "security.header.frame-protection",
    "security.mixed-content", "security.potential-exposed-secret",
  ];
  assert.deepEqual(Object.keys(fixTemplateRegistry).sort(), actionableRuleIds.sort());
  assert.deepEqual([...informationalOnlyRuleIds].sort(), ["navigation.terms-link-missing", "not-found.soft-404", "robots.ai-crawler-access"].sort());
});
