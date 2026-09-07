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

test("decodes embedded private IPv4 from IPv6 NAT64, compatible, 6to4, and Teredo forms", () => {
  for (const address of ["64:ff9b::7f00:1", "64:ff9b::a9fe:a9fe", "::7f00:1", "::10.0.0.1", "2002:0a00:0001::1", "2002:a9fe:a9fe::1", "2001:0:808:808:0:0:80ff:fffe", "2001:0:7f00:1:0:0:f7f7:f7f7"]) {
    assert.equal(isForbiddenIp(address), true, address);
  }
});

test("does not block ordinary public IPv6 or public embeddings", () => {
  for (const address of ["2606:2800:220:1:248:1893:25c8:1946", "64:ff9b::808:808", "2002:0808:0808::1", "::ffff:93.184.216.34", "2001:0:101:101:0:0:f7f7:f7f7"]) {
    assert.equal(isForbiddenIp(address), false, address);
  }
});

test("rejects NAT64 and IPv4-compatible literals before scanning", async () => {
  await assert.rejects(normalizePublicUrl("http://[64:ff9b::7f00:1]/"), UnsafeUrlError);
  await assert.rejects(normalizePublicUrl("http://[::7f00:1]/"), UnsafeUrlError);
});
