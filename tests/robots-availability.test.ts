import assert from "node:assert/strict";
import test from "node:test";
import { analyzeHtml } from "../src/server/html-evidence";
import { runRules } from "../src/server/rules";
import type { ScanEvidence } from "../src/server/scan-engine";

test("reports unavailable robots.txt without treating it as a sitewide block", () => {
  const url = "https://robots.test/"; const html = "<title>Page</title><h1>Page</h1>";
  const scan: ScanEvidence = { id: "robots", submittedUrl: url, normalizedUrl: url, status: "completed", createdAt: new Date(0).toISOString(), pages: [{ requestedUrl: url, finalUrl: url, status: 200, redirects: [], headers: {}, internalLinks: [], facts: analyzeHtml(html, new URL(url)), durationMs: 1 }], robots: { status: 404, discoveredSitemaps: [], directives: [] }, sitemap: { url: `${url}sitemap.xml`, status: 200, selectedUrls: [url], parseable: true, urlCount: 1, invalidUrlCount: 0 }, resources: [{ kind: "favicon", url: `${url}favicon.ico`, status: 200 }], missingPage: { url: `${url}missing`, status: 404 }, warnings: [] };
  const ids = runRules(scan).map((item) => item.ruleId);
  assert.ok(ids.includes("robots.missing-or-unavailable"));
  assert.ok(!ids.includes("robots.sitewide-block"));
});
