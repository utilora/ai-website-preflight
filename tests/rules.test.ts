import assert from "node:assert/strict";
import test from "node:test";
import { analyzeHtml } from "../src/server/html-evidence";
import { runRules } from "../src/server/rules";
import { parseRobotsDirectives, type PageEvidence, type ScanEvidence } from "../src/server/scan-engine";

const origin = "https://site.test";
const goodHtml = `<title>Useful page</title><meta name="description" content="A useful description"><meta name="viewport" content="width=device-width"><link rel="canonical" href="${origin}/"><link rel="icon" href="/favicon.ico"><meta property="og:title" content="Useful page"><meta property="og:description" content="A useful description"><meta property="og:image" content="/og.png"><h1>Useful page</h1><h2>Details</h2><img src="/hero.png" alt=""><label for="email">Email</label><input id="email"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a><script type="application/ld+json">{"@type":"WebSite"}</script>`;
const goodHeaders = { "strict-transport-security": "max-age=31536000", "content-security-policy": "default-src 'self'; frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin" };

function page(html = goodHtml, url = `${origin}/`, overrides: Partial<PageEvidence> = {}): PageEvidence {
  return { requestedUrl: url, finalUrl: url, status: 200, redirects: [], headers: goodHeaders, internalLinks: [], facts: analyzeHtml(html, new URL(url)), durationMs: 1, ...overrides };
}
function scan(pages = [page()], overrides: Partial<ScanEvidence> = {}): ScanEvidence {
  return { id: "fixture", submittedUrl: `${origin}/`, normalizedUrl: `${origin}/`, status: "completed", createdAt: new Date(0).toISOString(), pages, robots: { status: 200, discoveredSitemaps: [], directives: parseRobotsDirectives("User-agent: *\nAllow: /") }, sitemap: { url: `${origin}/sitemap.xml`, status: 200, selectedUrls: [`${origin}/`], parseable: true, urlCount: 1, invalidUrlCount: 0 }, resources: [{ kind: "favicon", url: `${origin}/favicon.ico`, status: 200 }, { kind: "og-image", url: `${origin}/og.png`, status: 200 }], missingPage: { url: `${origin}/missing`, status: 404 }, warnings: [], ...overrides };
}
const ids = (value: ScanEvidence) => runRules(value).map((item) => item.ruleId);

test("clean fixture does not trigger problem findings", () => assert.deepEqual(ids(scan()), ["robots.ai-crawler-access"]));

test("title rules cover present, missing, default, and duplicate titles", () => {
  assert.ok(!ids(scan()).includes("title.missing"));
  assert.ok(ids(scan([page(goodHtml.replace(/<title>[\s\S]*?<\/title>/, ""))])).includes("title.missing"));
  assert.ok(ids(scan([page(goodHtml.replace("Useful page</title>", "Vite + React</title>"))])).includes("title.default-template"));
  assert.ok(ids(scan([page(), page(goodHtml, `${origin}/two`)])).includes("title.duplicate"));
});

test("description rules cover present, missing, and duplicate values", () => {
  assert.ok(!ids(scan()).includes("description.missing"));
  assert.ok(ids(scan([page(goodHtml.replace(/<meta name="description"[^>]*>/, ""))])).includes("description.missing"));
  assert.ok(ids(scan([page(), page(goodHtml.replace("Useful page</title>", "Other</title>"), `${origin}/two`)])).includes("description.duplicate"));
});

test("robots distinguishes universal blocks from bot-specific blocks", () => {
  const universal = scan(undefined, { robots: { status: 200, discoveredSitemaps: [], directives: parseRobotsDirectives("User-agent: *\nDisallow: /") } });
  const specific = scan(undefined, { robots: { status: 200, discoveredSitemaps: [], directives: parseRobotsDirectives("User-agent: ExampleBot\nDisallow: /") } });
  assert.ok(ids(universal).includes("robots.sitewide-block")); assert.ok(!ids(specific).includes("robots.sitewide-block"));
});

test("AI crawler report covers explicit allow, explicit block, and no mention", () => {
  const value = scan(undefined, { robots: { status: 200, discoveredSitemaps: [], directives: parseRobotsDirectives("User-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nDisallow: /") } });
  const report = runRules(value).find((item) => item.ruleId === "robots.ai-crawler-access")!;
  assert.match(report.evidence, /GPTBot: allowed/); assert.match(report.evidence, /ClaudeBot: blocked/); assert.match(report.evidence, /PerplexityBot: not explicitly mentioned/);
});

test("noindex rules cover meta, response header, and normal pages", () => {
  assert.ok(!ids(scan()).some((id) => id.includes("noindex")));
  assert.ok(ids(scan([page(goodHtml.replace("<h1>", '<meta name="robots" content="noindex,follow"><h1>'))])).includes("indexability.meta-noindex"));
  assert.ok(ids(scan([page(goodHtml, `${origin}/`, { headers: { ...goodHeaders, "x-robots-tag": "noindex" } })])).includes("indexability.header-noindex"));
});

test("canonical rules cover normal, missing, empty, and cross-origin values", () => {
  assert.ok(!ids(scan()).some((id) => id.startsWith("canonical.")));
  assert.ok(ids(scan([page(goodHtml.replace(/<link rel="canonical"[^>]*>/, ""))])).includes("canonical.missing"));
  assert.ok(ids(scan([page(goodHtml.replace(`href="${origin}/"`, 'href=""'))])).includes("canonical.invalid"));
  assert.ok(ids(scan([page(goodHtml.replace(`${origin}/`, "https://other.test/"))])).includes("canonical.cross-origin"));
});

test("broken internal links cover 200, 404, 500, and fetch failure", () => {
  const source = page(goodHtml, `${origin}/`, { internalLinks: [`${origin}/ok`, `${origin}/404`, `${origin}/500`, `${origin}/failed`] });
  const value = scan([source, page(goodHtml, `${origin}/ok`), page(goodHtml, `${origin}/404`, { status: 404 }), page(goodHtml, `${origin}/500`, { status: 500 }), { requestedUrl: `${origin}/failed`, redirects: [], internalLinks: [], durationMs: 1, error: "timeout" }]);
  const broken = runRules(value).filter((item) => item.ruleId === "links.broken-internal"); assert.equal(broken.length, 3); assert.ok(broken.every((item) => item.evidence.includes("Source:")));
});

test("placeholder link rules cover hash, javascript, empty, and normal anchors", () => {
  const html = goodHtml + `<a href="#">hash</a><a href="javascript:void(0)">js</a><a href="">empty</a><a href="/ok">ok</a>`;
  const result = runRules(scan([page(html)])).find((item) => item.ruleId === "links.placeholder")!; assert.equal(result.metadata?.count, 3);
});

test("Open Graph rules cover complete, missing image, invalid image, and failed fetch", () => {
  assert.ok(!ids(scan()).some((id) => id.startsWith("open-graph.")));
  assert.ok(ids(scan([page(goodHtml.replace(/<meta property="og:image"[^>]*>/, ""))], { resources: [{ kind: "favicon", url: `${origin}/favicon.ico`, status: 200 }] })).includes("open-graph.image-missing"));
  assert.ok(ids(scan([page(goodHtml.replace('content="/og.png"', 'content="http://["'))])).includes("open-graph.image-invalid"));
  assert.ok(ids(scan(undefined, { resources: [{ kind: "favicon", url: `${origin}/favicon.ico`, status: 200 }, { kind: "og-image", url: `${origin}/og.png`, status: 404 }] })).includes("open-graph.image-unavailable"));
});

test("accessibility basics distinguish missing alt, empty alt, labeled, and unlabeled controls", () => {
  assert.ok(!ids(scan()).includes("accessibility.image-alt-missing")); assert.ok(!ids(scan()).includes("accessibility.form-label-missing"));
  const html = goodHtml.replace('alt=""', "").replace('<label for="email">Email</label>', ""); const result = ids(scan([page(html)]));
  assert.ok(result.includes("accessibility.image-alt-missing")); assert.ok(result.includes("accessibility.form-label-missing"));
});

test("security rules cover observed headers, missing headers, and mixed content", () => {
  assert.ok(!ids(scan()).some((id) => id.startsWith("security.header")));
  const value = scan([page(goodHtml + '<script src="http://cdn.test/app.js"></script>', `${origin}/`, { headers: {} })]); const result = ids(value);
  assert.ok(result.includes("security.header.csp")); assert.ok(result.includes("security.header.frame-protection")); assert.ok(result.includes("security.mixed-content"));
});

test("secret patterns are redacted and carry the audit limitation", () => {
  const finding = runRules(scan([page(goodHtml + " AKIA1234567890ABCDEF")])).find((item) => item.ruleId === "security.potential-exposed-secret")!;
  assert.ok(finding); assert.doesNotMatch(finding.evidence, /AKIA123/); assert.match(finding.message, /not a complete security audit/i);
});

test("JSON-LD reports invalid JSON but accepts valid JSON", () => {
  assert.ok(!ids(scan()).includes("structured-data.jsonld-invalid"));
  assert.ok(ids(scan([page(goodHtml.replace('{"@type":"WebSite"}', "{broken"))])).includes("structured-data.jsonld-invalid"));
});

test("availability, sitemap, H1, heading, favicon, 404, and policy rules use explicit evidence", () => {
  assert.ok(ids(scan([page(goodHtml, "http://site.test/")])).includes("transport.https"));
  assert.ok(ids(scan([page(goodHtml, `${origin}/`, { status: 500 })])).includes("availability.homepage-status"));
  assert.ok(ids(scan(undefined, { sitemap: { url: `${origin}/sitemap.xml`, status: 200, selectedUrls: [], parseable: false, urlCount: 0, invalidUrlCount: 0 } })).includes("sitemap.invalid"));
  assert.ok(ids(scan(undefined, { sitemap: { url: `${origin}/sitemap.xml`, status: 200, selectedUrls: [], parseable: true, urlCount: 0, invalidUrlCount: 0 } })).includes("sitemap.empty"));
  const sparse = goodHtml.replace(/<h1>[\s\S]*?<\/h1>/, "").replace("<h2>Details</h2>", "<h1>One</h1><h1>One</h1><h4>Jump</h4>").replace(/<a href="\/(privacy|terms|contact)">[^<]+<\/a>/g, "");
  const result = ids(scan([page(sparse)], { resources: [{ kind: "favicon", url: `${origin}/favicon.ico`, status: 404 }], missingPage: { url: `${origin}/missing`, status: 200 } }));
  for (const id of ["heading.h1-duplicate", "accessibility.heading-level-jump", "favicon.missing", "not-found.soft-404", "navigation.privacy-link-missing", "navigation.terms-link-missing", "navigation.contact-link-missing"]) assert.ok(result.includes(id), id);
});

test("every emitted problem finding contains stable evidence fields", () => {
  const findings = runRules(scan([page("<html><body>TODO<a href=\"#\">x</a></body></html>", "http://site.test/", { headers: {} })], { resources: [], missingPage: { url: "http://site.test/missing", status: 200 } }));
  for (const item of findings) { assert.ok(item.ruleId); assert.ok(item.severity); assert.ok(item.message); assert.ok(item.evidence); assert.ok(item.affectedUrl); }
});
