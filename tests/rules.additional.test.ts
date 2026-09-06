import assert from "node:assert/strict";
import test from "node:test";
import { analyzeHtml } from "../src/server/html-evidence";
import { runRules } from "../src/server/rules";
import type { PageEvidence, ScanEvidence } from "../src/server/scan-engine";

const url = "https://coverage.test/";
const headers = { "strict-transport-security": "max-age=1", "content-security-policy": "frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "same-origin" };
function page(html: string): PageEvidence { return { requestedUrl: url, finalUrl: url, status: 200, redirects: [], headers, internalLinks: [], facts: analyzeHtml(html, new URL(url)), durationMs: 1 }; }
function scan(pageValue?: PageEvidence): ScanEvidence { return { id: "coverage", submittedUrl: url, normalizedUrl: url, status: "completed", createdAt: new Date(0).toISOString(), pages: pageValue ? [pageValue] : [], robots: { status: 200, discoveredSitemaps: [], directives: [] }, sitemap: { url: `${url}sitemap.xml`, status: 200, selectedUrls: [url], parseable: true, urlCount: 1, invalidUrlCount: 0 }, resources: [{ kind: "favicon", url: `${url}favicon.ico`, status: 200 }], missingPage: { url: `${url}missing`, status: 404 }, warnings: [] }; }
const ids = (value: ScanEvidence) => new Set(runRules(value).map((item) => item.ruleId));

test("homepage fetch failure produces one direct availability finding without dependent guesses", () => {
  const result = runRules(scan()); assert.deepEqual(result.map((item) => item.ruleId), ["availability.homepage-fetch"]);
});

test("missing document facts cover metadata, content, and navigation rules", () => {
  const result = ids(scan(page("<html><body>TODO<a>empty</a><img src='/x'><input><p>text</p></body></html>")));
  for (const ruleId of ["title.missing", "description.missing", "canonical.missing", "heading.h1-missing", "open-graph.title-missing", "open-graph.description-missing", "open-graph.image-missing", "viewport.missing", "links.placeholder", "content.placeholder", "accessibility.image-alt-missing", "accessibility.form-label-missing", "accessibility.headings-missing", "navigation.privacy-link-missing", "navigation.terms-link-missing", "navigation.contact-link-missing"]) assert.ok(result.has(ruleId), ruleId);
});

test("sitemap missing and HTTP failures remain conservative and distinct", () => {
  const missing = scan(page("<title>x</title><h1>x</h1>")); missing.sitemap = { url: `${url}sitemap.xml`, status: 404, selectedUrls: [], parseable: false, urlCount: 0, invalidUrlCount: 0 };
  assert.ok(ids(missing).has("sitemap.missing-or-unavailable"));
  const failed = scan(page("<title>x</title><h1>x</h1>")); failed.sitemap = { url: `${url}sitemap.xml`, status: 500, selectedUrls: [], parseable: false, urlCount: 0, invalidUrlCount: 0 };
  assert.ok(ids(failed).has("sitemap.http-error"));
});

test("unavailable declared favicon is reported separately from a missing favicon", () => {
  const value = scan(page("<title>x</title><h1>x</h1><link rel='icon' href='/brand.ico'>")); value.resources = [{ kind: "favicon", url: `${url}brand.ico`, status: 500 }];
  assert.ok(ids(value).has("favicon.unavailable"));
});
