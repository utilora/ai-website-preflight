import assert from "node:assert/strict";
import test from "node:test";
import type { Fetcher, FetchResult } from "../src/server/scan-engine";
import { analyzeAiCrawlers } from "../src/server/tools/ai-crawlers";
import { analyzeBrokenLinks } from "../src/server/tools/broken-links";
import { analyzeMetadata } from "../src/server/tools/metadata";
import { analyzeOpenGraph } from "../src/server/tools/open-graph";
import { analyzeRobots } from "../src/server/tools/robots";
import { analyzeSecurityHeaders } from "../src/server/tools/security-headers";
import { analyzeSitemap } from "../src/server/tools/sitemap";

const origin = "https://site.test";

function fetcher(routes: Record<string, Partial<FetchResult> & { error?: Error }>): Fetcher {
  return async (url) => {
    const route = routes[url.toString()] ?? routes[`${url.origin}${url.pathname}`];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    if (route.error) throw route.error;
    return {
      status: route.status ?? 200,
      headers: route.headers ?? { "content-type": "text/html" },
      body: route.body ?? "",
      finalUrl: route.finalUrl ?? url.toString(),
      redirects: route.redirects ?? [],
    };
  };
}

test("sitemap checker handles urlset, index, missing, invalid XML, and oversized responses", async () => {
  const urlset = await analyzeSitemap(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { body: `Sitemap: ${origin}/sitemap.xml\n`, headers: { "content-type": "text/plain" } },
    [`${origin}/sitemap.xml`]: { body: `<urlset><url><loc>${origin}/a</loc></url><url><loc>${origin}/b</loc></url></urlset>`, headers: { "content-type": "application/xml" } },
  }));
  assert.equal(urlset.sitemapFound, true);
  assert.equal(urlset.parseStatus, "urlset");
  assert.equal(urlset.urlCount, 2);
  assert.equal(urlset.robotsDeclaresSitemap, true);
  assert.deepEqual(urlset.exampleUrls, [`${origin}/a`, `${origin}/b`]);

  const index = await analyzeSitemap(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { status: 404, body: "missing" },
    [`${origin}/sitemap.xml`]: { body: `<sitemapindex><sitemap><loc>${origin}/s1.xml</loc></sitemap></sitemapindex>`, headers: { "content-type": "application/xml" } },
  }));
  assert.equal(index.parseStatus, "sitemapindex");
  assert.equal(index.robotsDeclaresSitemap, false);

  const missing = await analyzeSitemap(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { status: 404, body: "" },
    [`${origin}/sitemap.xml`]: { status: 404, body: "no" },
  }));
  assert.equal(missing.parseStatus, "missing");
  assert.equal(missing.sitemapFound, false);

  const invalid = await analyzeSitemap(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { body: "" },
    [`${origin}/sitemap.xml`]: { body: "<html>not xml sitemap</html>" },
  }));
  assert.equal(invalid.parseStatus, "invalid");

  const oversized = await analyzeSitemap(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { body: "" },
    [`${origin}/sitemap.xml`]: { error: new Error("Response exceeded the configured size limit.") },
  }));
  assert.equal(oversized.parseStatus, "error");
  assert.equal(oversized.issue?.code, "too_large");
});

test("robots checker covers missing, universal allow, Disallow /, bot-specific block, and sitemap directives", async () => {
  const missing = await analyzeRobots(new URL(`${origin}/`), fetcher({ [`${origin}/robots.txt`]: { status: 404, body: "no" } }));
  assert.equal(missing.found, false);

  const allow = await analyzeRobots(new URL(`${origin}/`), fetcher({ [`${origin}/robots.txt`]: { body: "User-agent: *\nAllow: /\nSitemap: https://site.test/sitemap.xml\n" } }));
  assert.equal(allow.found, true);
  assert.equal(allow.universal.disallowRoot, false);
  assert.deepEqual(allow.sitemapDirectives, [`${origin}/sitemap.xml`]);

  const blocked = await analyzeRobots(new URL(`${origin}/`), fetcher({ [`${origin}/robots.txt`]: { body: "User-agent: *\nDisallow: /\n" } }));
  assert.equal(blocked.universal.disallowRoot, true);
  assert.match(blocked.preview, /Disallow: \//);

  const specific = await analyzeRobots(new URL(`${origin}/`), fetcher({ [`${origin}/robots.txt`]: { body: "User-agent: ExampleBot\nDisallow: /\nUser-agent: *\nAllow: /\n" } }));
  assert.equal(specific.universal.disallowRoot, false);
  assert.equal(specific.crawlers.find((item) => item.bot === "GPTBot")?.status, "not explicitly mentioned");
});

test("meta tag checker covers normal, missing title, noindex, canonical, and viewport", async () => {
  const normalHtml = `<title>Ready</title><meta name="description" content="Desc"><meta name="viewport" content="width=device-width"><link rel="canonical" href="${origin}/"><h1>Ready</h1>`;
  const normal = await analyzeMetadata(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: normalHtml } }));
  assert.equal(normal.observed.title, "Ready");
  assert.equal(normal.issues.length, 0);

  const missingTitle = await analyzeMetadata(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: `<meta name="description" content="Desc"><h1>X</h1>` } }));
  assert.ok(missingTitle.issues.some((item) => item.label === "Missing title"));

  const noindex = await analyzeMetadata(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: `<title>Hidden</title><meta name="robots" content="noindex"><h1>Hidden</h1>` } }));
  assert.ok(noindex.issues.some((item) => item.label === "noindex meta"));
  assert.equal(noindex.observed.robotsMeta, "noindex");

  const canonical = await analyzeMetadata(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: `<title>C</title><link rel="canonical" href="${origin}/page">` } }));
  assert.equal(canonical.observed.canonical, `${origin}/page`);

  const viewport = await analyzeMetadata(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: `<title>V</title>` } }));
  assert.ok(viewport.issues.some((item) => item.label === "Missing viewport"));
});

test("open graph checker covers complete tags, missing fields, invalid image URL, and Twitter fields", async () => {
  const complete = await analyzeOpenGraph(new URL(`${origin}/`), fetcher({
    [`${origin}/`]: { body: `<title>T</title><meta property="og:title" content="OG Title"><meta property="og:description" content="OG Desc"><meta property="og:image" content="/og.png"><meta property="og:url" content="${origin}/"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Tweet">` },
    [`${origin}/og.png`]: { status: 200, headers: { "content-type": "image/png" }, body: "img" },
  }));
  assert.equal(complete.openGraph.title, "OG Title");
  assert.equal(complete.twitter.card, "summary_large_image");
  assert.equal(complete.imageCheck?.status, 200);
  assert.equal(complete.issues.length, 0);

  const missing = await analyzeOpenGraph(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: "<title>T</title>" } }));
  assert.ok(missing.issues.some((item) => item.label.includes("og:title")));
  assert.ok(missing.issues.some((item) => item.label.includes("og:image")));

  const invalid = await analyzeOpenGraph(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: `<meta property="og:image" content="http://[">` } }));
  assert.ok(invalid.issues.some((item) => item.label.includes("invalid")));
});

test("security headers checker reports present and missing headers without a vulnerability score", async () => {
  const all = await analyzeSecurityHeaders(new URL(`${origin}/`), fetcher({
    [`${origin}/`]: { body: "<title>T</title>", headers: { "strict-transport-security": "max-age=1", "content-security-policy": "default-src 'self'; frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY", "set-cookie": "secret=1" } },
  }));
  assert.ok(all.headers.every((item) => item.present));
  assert.equal(all.frameAncestors, "'none'");
  assert.match(all.disclaimer, /not a vulnerability assessment/i);
  assert.equal(JSON.stringify(all).includes("set-cookie"), false);
  assert.equal("score" in all, false);

  const missing = await analyzeSecurityHeaders(new URL(`${origin}/`), fetcher({ [`${origin}/`]: { body: "<title>T</title>", headers: { "content-type": "text/html" } } }));
  assert.ok(missing.headers.some((item) => !item.present));
});

test("broken link checker covers 200, 404, 500, timeout, duplicates, max 20, and no recursion", async () => {
  const anchors = Array.from({ length: 22 }, (_, index) => `<a href="/p${index}">${index}</a>`).join("");
  const html = `<title>Home</title><a href="/ok">ok</a><a href="/ok">dup</a><a href="/missing">404</a><a href="/error">500</a><a href="/slow">slow</a><a href="https://other.test/x">ext</a>${anchors}`;
  let inFlight = 0;
  let maxFlight = 0;
  const seen: string[] = [];
  const custom: Fetcher = async (url) => {
    seen.push(url.pathname);
    inFlight += 1;
    maxFlight = Math.max(maxFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    const emptyHeaders: Record<string, string> = {};
    if (url.pathname === "/") return { status: 200, headers: { "content-type": "text/html" }, body: html, finalUrl: `${origin}/`, redirects: [] };
    if (url.pathname === "/missing") return { status: 404, headers: emptyHeaders, body: "no", finalUrl: url.toString(), redirects: [] };
    if (url.pathname === "/error") return { status: 500, headers: emptyHeaders, body: "no", finalUrl: url.toString(), redirects: [] };
    if (url.pathname === "/slow") throw new Error("Request timed out.");
    if (url.pathname.startsWith("/p") || url.pathname === "/ok") return { status: 200, headers: { "content-type": "text/html" }, body: `<a href="/deeper">nope</a>`, finalUrl: url.toString(), redirects: [] };
    throw new Error(`unexpected ${url}`);
  };
  const result = await analyzeBrokenLinks(new URL(`${origin}/`), custom);
  assert.equal(result.checked.some((item) => item.url.endsWith("/ok") && item.state === "working"), true);
  assert.equal(result.checked.some((item) => item.url.endsWith("/missing") && item.state === "broken" && item.status === "404"), true);
  assert.equal(result.checked.some((item) => item.url.endsWith("/error") && item.status === "500"), true);
  assert.equal(result.checked.some((item) => item.url.endsWith("/slow") && item.state === "timeout"), true);
  assert.equal(result.summary.checked, 20);
  assert.ok(result.skipped.some((item) => item.reason === "external"));
  assert.ok(result.skipped.some((item) => item.reason === "limit"));
  assert.ok(maxFlight <= 2);
  assert.equal(seen.includes("/deeper"), false);
  assert.equal(seen.filter((path) => path === "/ok").length, 1);
});

test("AI crawler checker covers allow, block, no explicit mention, and user-agent precedence", async () => {
  const mixed = await analyzeAiCrawlers(new URL(`${origin}/`), fetcher({
    [`${origin}/robots.txt`]: { body: "User-agent: *\nDisallow: /\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nDisallow: /\n" },
  }));
  assert.equal(mixed.crawlers.find((item) => item.bot === "GPTBot")?.status, "explicitly allowed");
  assert.equal(mixed.crawlers.find((item) => item.bot === "ClaudeBot")?.status, "explicitly blocked");
  assert.equal(mixed.crawlers.find((item) => item.bot === "PerplexityBot")?.status, "no explicit rule");
  assert.match(mixed.universal, /blocks \//);
  assert.match(mixed.note, /do not guarantee/);
});
