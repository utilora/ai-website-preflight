import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
  collectScan,
  createSafeFetcher,
  extractInternalLinks,
  limits,
  parseSitemapUrls,
  requestPinned,
  type Resolver,
  type ScanEvidence,
  type ScanLimits,
  type Transport,
} from "../src/server/scan-engine";

const fixtureLimits: ScanLimits = { ...limits, pages: 4, redirects: 2, timeoutMs: 50, htmlBytes: 256, textBytes: 256, sitemapBytes: 1_000, sitemapUrls: 3 };
let server: http.Server;
let origin: string;

test.before(async () => {
  server = http.createServer((request, response) => {
    const path = request.url ?? "/";
    if (path === "/timeout" || path === "/slow") { setTimeout(() => response.end("late"), 200); return; }
    if (path === "/loop-a" || path === "/loop-b") { response.writeHead(302, { location: path === "/loop-a" ? "/loop-b" : "/loop-a" }).end(); return; }
    if (path === "/private-redirect") { response.writeHead(302, { location: "http://127.0.0.1/private" }).end(); return; }
    if (path === "/oversized-html") { response.writeHead(200, { "content-type": "text/html" }).end("x".repeat(300)); return; }
    if (path === "/oversized-sitemap") { response.writeHead(200, { "content-type": "application/xml" }).end("<urlset>" + "x".repeat(1_200) + "</urlset>"); return; }
    if (path === "/404") { response.writeHead(404).end("missing"); return; }
    if (path === "/500") { response.writeHead(500).end("broken"); return; }
    if (path === "/robots.txt") { response.end(`Sitemap: ${origin}/sitemap.xml`); return; }
    if (path === "/sitemap.xml") { response.end(`<urlset><url><loc>${origin}/slow</loc></url><url><loc>${origin}/ok</loc></url><url><loc>${origin}/ok</loc></url><url><loc>${origin}/page-2</loc></url><url><loc>${origin}/page-3</loc></url><url><loc>${origin}/page-4</loc></url></urlset>`); return; }
    if (path === "/") { response.setHeader("content-type", "text/html"); response.end(`<title>Home</title><a href="/ok">one</a><a href="/ok#again">duplicate</a><a href="/page-5">five</a>`); return; }
    response.setHeader("content-type", "text/html"); response.end(`<title>${path}</title>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("mock server failed");
  origin = `http://safe.test:${address.port}`;
});
test.after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

const resolver: Resolver = async (hostname) => hostname === "127.0.0.1" ? [{ address: "127.0.0.1", family: 4 }] : [{ address: "93.184.216.34", family: 4 }];
const transport: Transport = (url, _address, maxBytes, activeLimits) => requestPinned(url, { address: "127.0.0.1", family: 4 }, maxBytes, activeLimits);
const fetchLocal = createSafeFetcher({ resolver, transport, limits: fixtureLimits });

test("enforces timeout and redirect loop limits", async () => {
  await assert.rejects(fetchLocal(new URL(`${origin}/timeout`), 256), /timed out/i);
  await assert.rejects(fetchLocal(new URL(`${origin}/loop-a`), 256), /redirect limit/i);
});

test("blocks a public URL redirecting to loopback", async () => {
  await assert.rejects(fetchLocal(new URL(`${origin}/private-redirect`), 256), /private|unsafe/i);
});

test("rejects oversized HTML and sitemap responses", async () => {
  await assert.rejects(fetchLocal(new URL(`${origin}/oversized-html`), 128), /size limit/i);
  await assert.rejects(fetchLocal(new URL(`${origin}/oversized-sitemap`), fixtureLimits.sitemapBytes), /size limit/i);
});

test("preserves HTTP 404 and 500 evidence", async () => {
  assert.equal((await fetchLocal(new URL(`${origin}/404`), 256)).status, 404);
  assert.equal((await fetchLocal(new URL(`${origin}/500`), 256)).status, 500);
});

test("deduplicates and limits sitemap and internal URLs", () => {
  const xml = `<loc>${origin}/a</loc><loc>${origin}/a#x</loc><loc>${origin}/b</loc><loc>${origin}/c</loc><loc>${origin}/d</loc><loc>https://other.test/x</loc>`;
  assert.deepEqual(parseSitemapUrls(xml, origin, 3), [`${origin}/a`, `${origin}/b`, `${origin}/c`]);
  assert.deepEqual(extractInternalLinks(`<a href="/a"></a><a href="/a#x"></a><a href="https://other.test/x"></a>`, new URL(origin)), [`${origin}/a`]);
});

test("a failed child page does not abort the scan and page count stays bounded", async () => {
  const scan: ScanEvidence = { id: "fixture", submittedUrl: origin, normalizedUrl: `${origin}/`, status: "running", createdAt: new Date(0).toISOString(), pages: [], warnings: [] };
  await collectScan(scan, fetchLocal, fixtureLimits);
  assert.ok(scan.pages.some((page) => page.error?.includes("timed out")));
  assert.ok(scan.pages.length <= fixtureLimits.pages);
});

test("blocks DNS rebinding before the transport is reached", async () => {
  let calls = 0;
  let transported = false;
  const rebindingResolver: Resolver = async () => ++calls === 1 ? [{ address: "93.184.216.34", family: 4 }] : [{ address: "127.0.0.1", family: 4 }];
  const rebindingFetcher = createSafeFetcher({ resolver: rebindingResolver, transport: async () => { transported = true; throw new Error("transport must not run"); }, limits: fixtureLimits });
  await assert.rejects(rebindingFetcher(new URL("http://rebind.test/"), 256), /unsafe/i);
  assert.equal(transported, false);
});
