import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/tools/[tool]/route";
import { SlidingWindowLimiter, UNTRUSTED_CLIENT_IP, clientIpFromHeaders } from "../src/server/rate-limit";
import { resetToolRateLimiters } from "../src/server/tools/rate-limit";

const originalTrustProxy = process.env.TRUST_PROXY_HEADERS;

test.afterEach(() => {
  resetToolRateLimiters();
  if (originalTrustProxy === undefined) delete process.env.TRUST_PROXY_HEADERS;
  else process.env.TRUST_PROXY_HEADERS = originalTrustProxy;
});

async function postTool(url: string, headers: Record<string, string> = {}) {
  return POST(new NextRequest("http://localhost/api/tools/sitemap-checker", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ url }),
  }), { params: Promise.resolve({ tool: "sitemap-checker" }) });
}

test("tool rate limiter allows normal use and restores after TTL", () => {
  let now = 1_000;
  const limiter = new SlidingWindowLimiter({ maxHits: 2, windowMs: 100, maxKeys: 8, now: () => now });
  assert.equal(limiter.allow("tool-ip:direct"), true);
  assert.equal(limiter.allow("tool-ip:direct"), true);
  assert.equal(limiter.allow("tool-ip:direct"), false);
  now = 1_200;
  limiter.cleanup();
  assert.equal(limiter.allow("tool-ip:direct"), true);
});

test("tool create API returns 429 when the IP limiter is exhausted", async () => {
  const limiter = new SlidingWindowLimiter({ maxHits: 1, windowMs: 60_000, maxKeys: 8, now: () => 10_000 });
  assert.equal(limiter.allow(`tool-ip:${UNTRUSTED_CLIENT_IP}`), true);
  resetToolRateLimiters({ ip: limiter, host: new SlidingWindowLimiter({ maxHits: 10, windowMs: 60_000, maxKeys: 8, now: () => 10_000 }) });
  const response = await postTool("https://site.test/", { "x-forwarded-for": "203.0.113.10" });
  assert.equal(response.status, 429);
  const payload = await response.json() as { error?: { code?: string } };
  assert.equal(payload.error?.code, "rate_limited");
  assert.equal(response.headers.get("retry-after"), "60");
});

test("default tool IP identity ignores forged forwarding headers", () => {
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.10" })), UNTRUSTED_CLIENT_IP);
  assert.equal(clientIpFromHeaders(new Headers({ "x-forwarded-for": "198.51.100.20" })), UNTRUSTED_CLIENT_IP);
});

test("trusted proxy mode continues to use the last forwarded hop for tools", async () => {
  process.env.TRUST_PROXY_HEADERS = "true";
  const limiter = new SlidingWindowLimiter({ maxHits: 1, windowMs: 60_000, maxKeys: 8, now: () => 10_000 });
  assert.equal(limiter.allow("tool-ip:198.51.100.20"), true);
  resetToolRateLimiters({ ip: limiter, host: new SlidingWindowLimiter({ maxHits: 10, windowMs: 60_000, maxKeys: 8, now: () => 10_000 }) });
  const response = await postTool("https://site.test/", { "x-forwarded-for": "203.0.113.1, 198.51.100.20" });
  assert.equal(response.status, 429);
});
