import assert from "node:assert/strict";
import test from "node:test";
import { collectScan, sitemapDocumentInfo, type Fetcher, type FetchResult, type ScanEvidence } from "../src/server/scan-engine";

test("sitemap indexes are parsed but not treated as page URLs", () => {
  const info = sitemapDocumentInfo('<sitemapindex><sitemap><loc>https://site.test/child.xml</loc></sitemap></sitemapindex>', "https://site.test", 10);
  assert.equal(info.parseable, true); assert.equal(info.urlCount, 1); assert.deepEqual(info.selectedUrls, []);
});

test("non-HTML responses do not produce HTML document facts", async () => {
  const origin = "https://site.test"; const fetcher: Fetcher = async (url): Promise<FetchResult> => {
    if (url.pathname === "/robots.txt") return { status: 200, headers: { "content-type": "text/plain" }, body: "User-agent: *\nAllow: /", finalUrl: url.toString(), redirects: [] };
    if (url.pathname === "/sitemap.xml") return { status: 200, headers: { "content-type": "application/xml" }, body: `<urlset><url><loc>${origin}/data</loc></url></urlset>`, finalUrl: url.toString(), redirects: [] };
    if (url.pathname === "/data") return { status: 200, headers: { "content-type": "application/json" }, body: '{"title":"not HTML"}', finalUrl: url.toString(), redirects: [] };
    if (url.pathname.startsWith("/__preflight_missing_")) return { status: 404, headers: {}, body: "", finalUrl: url.toString(), redirects: [] };
    return { status: 200, headers: { "content-type": "text/html" }, body: '<title>Home</title><meta name="description" content="Home"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://site.test/"><h1>Home</h1>', finalUrl: url.toString(), redirects: [] };
  };
  const scan: ScanEvidence = { id: "contenttype", submittedUrl: `${origin}/`, normalizedUrl: `${origin}/`, status: "running", createdAt: new Date(0).toISOString(), pages: [], warnings: [] };
  await collectScan(scan, fetcher); const data = scan.pages.find((page) => page.requestedUrl === `${origin}/data`)!;
  assert.equal(data.facts, undefined); assert.deepEqual(data.internalLinks, []);
});
