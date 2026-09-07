import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/scans/route";
import { SlidingWindowLimiter, UNTRUSTED_CLIENT_IP, clientIpFromHeaders, hostKeyFromUrl, resetScanRateLimiters } from "../src/server/rate-limit";

const originalTrustProxy = process.env.TRUST_PROXY_HEADERS;

test.afterEach(() => {
  resetScanRateLimiters();
  if (originalTrustProxy === undefined) delete process.env.TRUST_PROXY_HEADERS;
  else process.env.TRUST_PROXY_HEADERS = originalTrustProxy;
});

test("normal use is allowed and the window restores after TTL", () => {
  let now = 1_000;
  const limiter = new SlidingWindowLimiter({ maxHits: 2, windowMs: 100, maxKeys: 8, now: () => now });
  assert.equal(limiter.allow("ip:1.1.1.1"), true);
  assert.equal(limiter.allow("ip:1.1.1.1"), true);
  assert.equal(limiter.allow("ip:1.1.1.1"), false);
  now = 1_200;
  limiter.cleanup();
  assert.equal(limiter.allow("ip:1.1.1.1"), true);
});

test("cleanup evicts expired keys and never grows past maxKeys", () => {
  let now = 5_000;
  const limiter = new SlidingWindowLimiter({ maxHits: 1, windowMs: 50, maxKeys: 2, now: () => now });
  assert.equal(limiter.allow("a"), true);
  assert.equal(limiter.allow("b"), true);
  assert.equal(limiter.size, 2);
  assert.equal(limiter.allow("c"), true);
  assert.ok(limiter.size <= 2);
  now = 5_200;
  limiter.cleanup();
  assert.equal(limiter.size, 0);
});

test("host keys come from the public hostname only", () => {
  assert.equal(hostKeyFromUrl("https://Example.com./path?q=1"), "example.com");
  assert.equal(hostKeyFromUrl("http://[64:ff9b::7f00:1]/"), "64:ff9b::7f00:1");
  assert.equal(hostKeyFromUrl("ftp://example.com"), null);
  assert.equal(hostKeyFromUrl("not a url"), null);
});

test("default mode ignores forged forwarding headers and uses one shared identity", () => {
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.10" })), UNTRUSTED_CLIENT_IP);
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "198.51.100.20" })), UNTRUSTED_CLIENT_IP);
  assert.equal(clientIpFromHeaders(new Headers({ "x-real-ip": "192.0.2.1" })), UNTRUSTED_CLIENT_IP);
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "1.1.1.1, 8.8.8.8", "x-real-ip": "9.9.9.9" }), { trustProxy: false }), UNTRUSTED_CLIENT_IP);
});

test("trusted proxy mode reads the last forwarded hop and falls back to X-Real-IP", () => {
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.10" }), { trustProxy: true }), "203.0.113.10");
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.1, 198.51.100.20" }), { trustProxy: true }), "198.51.100.20");
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "  203.0.113.1 ,  198.51.100.20  " }), { trustProxy: true }), "198.51.100.20");
  assert.equal(clientIpFromHeaders(new Headers({ "x-real-ip": "203.0.113.80" }), { trustProxy: true }), "203.0.113.80");
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.10", "x-real-ip": "192.0.2.1" }), { trustProxy: true }), "203.0.113.10");
  assert.equal(clientIpFromHeaders(new Headers(), { trustProxy: true }), UNTRUSTED_CLIENT_IP);
});

test("scan create API returns 429 when the IP limiter is already exhausted", async () => {
  const limiter = new SlidingWindowLimiter({ maxHits: 1, windowMs: 60_000, maxKeys: 8, now: () => 10_000 });
  assert.equal(limiter.allow(`ip:${UNTRUSTED_CLIENT_IP}`), true);
  resetScanRateLimiters({ ip: limiter, host: new SlidingWindowLimiter({ maxHits: 10, windowMs: 60_000, maxKeys: 8, now: () => 10_000 }) });
  const response = await POST(new NextRequest("http://localhost/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify({ url: "https://site.test/" }),
  }));
  assert.equal(response.status, 429);
  const payload = await response.json() as { error?: string };
  assert.match(payload.error ?? "", /too many/i);
  assert.equal(response.headers.get("retry-after"), "60");
});

test("trusted proxy mode rate-limits the proxy-provided client IP", async () => {
  process.env.TRUST_PROXY_HEADERS = "true";
  const limiter = new SlidingWindowLimiter({ maxHits: 1, windowMs: 60_000, maxKeys: 8, now: () => 10_000 });
  assert.equal(limiter.allow("ip:198.51.100.20"), true);
  resetScanRateLimiters({ ip: limiter, host: new SlidingWindowLimiter({ maxHits: 10, windowMs: 60_000, maxKeys: 8, now: () => 10_000 }) });
  const response = await POST(new NextRequest("http://localhost/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1, 198.51.100.20" },
    body: JSON.stringify({ url: "https://site.test/" }),
  }));
  assert.equal(response.status, 429);
});
