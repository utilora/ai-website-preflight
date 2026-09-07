import assert from "node:assert/strict";
import test from "node:test";
import { completeScan, createQueuedScan, failScan, getScan, saveScan, type ScanEvidence } from "../src/server/scan-engine";
import type { Finding } from "../src/server/rules";

function baseScan(id: string): ScanEvidence {
  return createQueuedScan("https://site.test", "https://site.test/", id, "2026-09-07T00:00:00.000Z");
}

test("Scan Again creates a distinct persisted scan and preserves the original", () => {
  const original = baseScan("phase04-rescan-original");
  original.status = "completed";
  saveScan(original);

  const rescan = createQueuedScan(original.normalizedUrl, original.normalizedUrl, "phase04-rescan-new", "2026-09-07T00:01:00.000Z");
  saveScan(rescan);

  assert.notEqual(rescan.id, original.id);
  assert.equal(rescan.submittedUrl, original.normalizedUrl);
  assert.equal(rescan.normalizedUrl, original.normalizedUrl);
  assert.equal(rescan.status, "queued");
  assert.equal(getScan(original.id)?.status, "completed");
  assert.equal(getScan(rescan.id)?.status, "queued");
});

test("completed scans receive backend score and grouped results", () => {
  const scan = baseScan("phase04-completed");
  const finding: Finding = { ruleId: "metadata.description-missing", severity: "medium", title: "Description missing", message: "No description was observed.", evidence: "descriptionPresent=false", affectedUrl: scan.normalizedUrl };
  scan.findings = [finding];

  completeScan(scan, "2026-09-07T00:02:00.000Z");

  assert.equal(scan.status, "completed");
  assert.equal(scan.score?.score, 96);
  assert.equal(scan.score?.status, "ready");
  assert.equal(scan.resultGroups?.warnings[0].ruleId, finding.ruleId);
});

test("failed scans never receive a Ready Score or READY status", () => {
  const scan = baseScan("phase04-failed");
  scan.score = { score: 100, status: "ready", criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0, totalFindings: 0, deductions: [] };

  failScan(scan, new Error("Fixture fetch failed"), "2026-09-07T00:03:00.000Z");

  assert.equal(scan.status, "failed");
  assert.equal(scan.errorSummary, "Fixture fetch failed");
  assert.equal(scan.score, undefined);
  assert.equal(scan.resultGroups, undefined);
});
