import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/scans/[id]/route";
import { sanitizeResponseHeaders, scanHasDisallowedHeaders } from "../src/server/headers";
import { collectScan, createQueuedScan, getScan, saveScan, type Fetcher, type FetchResult, type ScanEvidence } from "../src/server/scan-engine";

test("sanitizeResponseHeaders keeps detection headers and drops credentials", () => {
  const sanitized = sanitizeResponseHeaders({
    "Set-Cookie": "session=secret",
    cookie: "session=secret",
    authorization: "Bearer secret-token",
    "proxy-authorization": "Basic abc",
    "content-security-policy": "default-src 'self'",
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex",
    "content-type": "text/html",
    location: "https://site.test/",
    server: "secret-stack",
  });
  assert.deepEqual(sanitized, {
    "content-security-policy": "default-src 'self'",
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex",
    "content-type": "text/html",
    location: "https://site.test/",
  });
  assert.equal(scanHasDisallowedHeaders(sanitized), false);
});

test("collectScan and the public scan API never expose credential headers", async () => {
  const origin = "https://headers.test";
  const fetcher: Fetcher = async (url): Promise<FetchResult> => {
    const headers = {
      "content-type": url.pathname.endsWith(".xml") ? "application/xml" : url.pathname.endsWith(".txt") ? "text/plain" : "text/html",
      "set-cookie": "session=super-secret",
      authorization: "Bearer leaked",
      "x-robots-tag": "all",
    };
    if (url.pathname === "/robots.txt") return { status: 200, headers, body: "User-agent: *\nAllow: /", finalUrl: url.toString(), redirects: [] };
    if (url.pathname === "/sitemap.xml") return { status: 200, headers, body: `<urlset><url><loc>${origin}/</loc></url></urlset>`, finalUrl: url.toString(), redirects: [] };
    if (url.pathname.startsWith("/__preflight_missing_")) return { status: 404, headers, body: "", finalUrl: url.toString(), redirects: [] };
    return { status: 200, headers, body: "<title>Safe</title><h1>Safe</h1>", finalUrl: url.toString(), redirects: [] };
  };
  const scan: ScanEvidence = { ...createQueuedScan(`${origin}/`, `${origin}/`, "header-min"), status: "running" };
  await collectScan(scan, fetcher);
  saveScan(scan);
  const stored = getScan(scan.id)!;
  assert.equal(scanHasDisallowedHeaders(stored), false);
  assert.equal(stored.pages[0]?.headers?.["x-robots-tag"], "all");
  assert.equal(stored.pages[0]?.headers?.["content-type"], "text/html");
  const response = await GET(new Request(`http://localhost/api/scans/${scan.id}`), { params: Promise.resolve({ id: scan.id }) });
  const body = await response.json();
  assert.equal(scanHasDisallowedHeaders(body), false);
});
