import assert from "node:assert/strict";
import test from "node:test";
import { calculateScore, groupFindings, readinessStatus } from "../src/server/scoring";
import type { Finding, Severity } from "../src/server/rules";

function finding(ruleId: string, severity: Severity, affectedUrl = `https://site.test/${ruleId}`): Finding { return { ruleId, severity, title: ruleId, message: "Observed issue", evidence: "Deterministic fixture evidence", affectedUrl }; }

test("score applies fixed severity deductions", () => {
  assert.equal(calculateScore([]).score, 100);
  assert.equal(calculateScore([finding("critical", "critical")]).score, 85);
  assert.equal(calculateScore([finding("high", "high")]).score, 92);
  assert.equal(calculateScore([finding("medium", "medium")]).score, 96);
  assert.equal(calculateScore([finding("low", "low")]).score, 99);
  assert.equal(calculateScore([finding("info", "info")]).score, 100);
});

test("score is clamped to the inclusive 0 to 100 range", () => {
  const findings = Array.from({ length: 20 }, (_, index) => finding(`critical-${index}`, "critical"));
  assert.equal(calculateScore(findings).score, 0); assert.ok(calculateScore([]).score <= 100);
});

test("status thresholds and critical hard blocker are exact", () => {
  assert.equal(readinessStatus(100, 0), "ready"); assert.equal(readinessStatus(90, 0), "ready");
  assert.equal(readinessStatus(89, 0), "almost-ready"); assert.equal(readinessStatus(75, 0), "almost-ready");
  assert.equal(readinessStatus(74, 0), "not-ready"); assert.equal(readinessStatus(95, 1), "not-ready");
});

test("page-level deductions are capped while affected count remains exact", () => {
  const findings = Array.from({ length: 8 }, (_, index) => finding("description.missing", "medium", `https://site.test/${index}`));
  const result = calculateScore(findings); const deduction = result.deductions[0];
  assert.equal(deduction.affectedCount, 8); assert.equal(deduction.countedOccurrences, 3); assert.equal(deduction.deduction, 12); assert.equal(result.score, 88);
});

test("site-wide rules deduct only once across multiple affected URLs", () => {
  const result = calculateScore([finding("security.header.csp", "low", "https://site.test/"), finding("security.header.csp", "low", "https://site.test/about")]);
  assert.equal(result.deductions[0].affectedCount, 2); assert.equal(result.deductions[0].countedOccurrences, 1); assert.equal(result.deductions[0].deduction, 1);
});

test("result grouping maps severities to Must Fix, Warnings, and Info", () => {
  const groups = groupFindings([finding("a", "critical"), finding("b", "high"), finding("c", "medium"), finding("d", "low"), finding("e", "info")]);
  assert.deepEqual(groups.mustFix.map((item) => item.ruleId), ["a", "b"]); assert.deepEqual(groups.warnings.map((item) => item.ruleId), ["c", "d"]); assert.deepEqual(groups.info.map((item) => item.ruleId), ["e"]);
});

test("minor UX fixture stays high-scoring while a critical finding hard-blocks readiness", () => {
  const minor = calculateScore([finding("open-graph.image-missing", "low"), finding("favicon.missing", "low"), finding("navigation.contact-link-missing", "low")]);
  assert.equal(minor.score, 97); assert.equal(minor.status, "ready");
  const blocker = calculateScore([finding("robots.sitewide-block", "critical")]); assert.equal(blocker.score, 85); assert.equal(blocker.status, "not-ready");
});
