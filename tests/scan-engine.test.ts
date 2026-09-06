import assert from "node:assert/strict";
import test from "node:test";
import { UnsafeUrlError, isForbiddenIp, limits, normalizePublicUrl } from "../src/server/scan-engine";

test("blocks SSRF address ranges", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) assert.equal(isForbiddenIp(address), true, address);
});
test("allows representative public addresses", () => { assert.equal(isForbiddenIp("93.184.216.34"), false); assert.equal(isForbiddenIp("2606:2800:220:1:248:1893:25c8:1946"), false); });
test("rejects malformed and non-HTTP URL schemes before scanning", async () => { for (const value of ["not a url", "file:///etc/passwd", "ftp://example.com", "http://2130706433", "http://0177.0.0.1", "http://[::ffff:7f00:1]"]) await assert.rejects(normalizePublicUrl(value), UnsafeUrlError); });
test("rejects loopback redirect targets deterministically", async () => { await assert.rejects(normalizePublicUrl("http://127.0.0.1/private"), UnsafeUrlError); await assert.rejects(normalizePublicUrl("http://[::1]/private"), UnsafeUrlError); });
test("keeps crawl and response limits deliberately small", () => { assert.equal(limits.pages, 8); assert.equal(limits.redirects, 4); assert.ok(limits.htmlBytes <= 1_000_000); assert.ok(limits.sitemapUrls <= 50); });