import { TOOL_IDS, type ToolDefinition, type ToolId } from "./types";

export const TOOLS: ToolDefinition[] = [
  {
    id: "sitemap-checker",
    name: "Sitemap Checker",
    h1: "Free Sitemap Checker",
    title: "Free Sitemap Checker — Test sitemap.xml | AI Website Preflight",
    description: "Check whether a website exposes a readable sitemap, where it is located, and whether it can be parsed.",
    summary: "See if a site publishes a readable sitemap.xml and whether robots.txt points to it.",
    what: "This checker requests robots.txt and one sitemap document on the site origin. It reports whether the sitemap is a urlset or a sitemap index, a bounded URL count, and a few example loc values. It does not crawl the website.",
    why: "A reachable sitemap helps crawlers discover URLs you already publish. A missing or unreadable sitemap is a fact, not proof that a site cannot be indexed.",
    how: [
      "Publish an XML sitemap at a stable URL such as /sitemap.xml.",
      "Declare that URL with a Sitemap line in robots.txt.",
      "Keep loc values absolute and on the same origin.",
    ],
    faqs: [
      { question: "Does a missing sitemap mean Google cannot index my site?", answer: "No. This checker only reports whether a sitemap document was found and parsed. Crawlers can still discover pages through links." },
      { question: "Do you download every URL in the sitemap?", answer: "No. The checker reads one sitemap document, counts loc entries, and shows a short example list." },
      { question: "What is a sitemap index?", answer: "A sitemap index lists other sitemap files. This tool identifies that document type but does not fetch every child sitemap." },
      { question: "Will this modify my website?", answer: "No. It only requests public files." },
    ],
    related: ["robots-txt-checker", "ai-crawler-checker", "meta-tag-checker"],
    featured: true,
    loading: "Checking sitemap and robots.txt…",
  },
  {
    id: "robots-txt-checker",
    name: "Robots.txt Checker",
    h1: "Free Robots.txt Checker",
    title: "Free Robots.txt Checker — Inspect crawler rules | AI Website Preflight",
    description: "See whether a website publishes robots.txt, if it blocks the whole site, and which sitemap and crawler rules it declares.",
    summary: "Inspect robots.txt for a sitewide block, sitemap lines, and crawler groups.",
    what: "This checker fetches only /robots.txt. It reports HTTP status, Sitemap directives, the User-agent: * group, and a bounded preview. Bot-specific rules are not treated as a sitewide block.",
    why: "robots.txt is a public crawler preference file. A universal Disallow: / is an important launch fact; a missing file is common and not automatically a failure.",
    how: [
      "Serve robots.txt at the site origin with HTTP 200 and text/plain.",
      "Use User-agent: * with Disallow: / only when you intend to block ordinary crawlers.",
      "Add Sitemap: lines for sitemap documents you actually publish.",
    ],
    faqs: [
      { question: "Is a missing robots.txt an error?", answer: "It is reported as missing. Many sites operate without one; crawlers then use their default behavior." },
      { question: "Does Disallow: / for one bot block the whole site?", answer: "No. This checker treats a sitewide block only for User-agent: * with Disallow: /." },
      { question: "Is this a complete indexability audit?", answer: "No. It inspects robots.txt only, not meta robots, sitemaps, or rendering." },
      { question: "Do you follow robots.txt when checking?", answer: "The checker reads the file as evidence. It does not impersonate a search engine crawler." },
    ],
    related: ["sitemap-checker", "ai-crawler-checker", "security-headers-checker"],
    loading: "Checking robots.txt…",
  },
  {
    id: "meta-tag-checker",
    name: "Meta Tag Checker",
    h1: "Free Meta Tag Checker",
    title: "Free Meta Tag Checker — Title, description, canonical | AI Website Preflight",
    description: "Inspect a page’s title, meta description, canonical, robots, viewport, and H1 exactly as they appear in the HTML.",
    summary: "Read the title, description, canonical, robots, viewport, and H1 on one page.",
    what: "This checker fetches only the URL you submit and extracts observed document tags. Potential issues use the same conservative rules as Preflight: missing title, missing description, noindex, missing or invalid canonical, missing viewport, and missing H1. It does not grade title length.",
    why: "These tags are what browsers and crawlers can read without guessing. A noindex directive or missing title is a launch-relevant fact.",
    how: [
      "Give each important page a unique, non-empty title and description.",
      "Add a canonical URL when you have a preferred address for the page.",
      "Avoid noindex on pages you want listed in search results.",
    ],
    faqs: [
      { question: "Do you check title character counts?", answer: "No. Length formulas vary by display and are easy to overfit. This tool reports what is present." },
      { question: "Does it crawl the whole website?", answer: "No. Only the submitted URL is fetched." },
      { question: "What is a potential issue?", answer: "A conservative observation such as a missing title or a noindex directive, not a ranking prediction." },
      { question: "Are JavaScript-only tags included?", answer: "Only tags present in the fetched HTML response are observed." },
    ],
    related: ["open-graph-checker", "sitemap-checker", "robots-txt-checker"],
    featured: true,
    loading: "Checking page meta tags…",
  },
  {
    id: "open-graph-checker",
    name: "Open Graph Checker",
    h1: "Free Open Graph Checker",
    title: "Free Open Graph Checker — Preview social tags | AI Website Preflight",
    description: "Check og:title, og:description, og:image, and Twitter tags on a page, then preview an approximate share card.",
    summary: "Inspect Open Graph and Twitter tags and preview an approximate share card.",
    what: "This checker fetches the submitted page and, when og:image is present, validates that URL through the same safe fetch used for Preflight. The on-page preview is approximate and does not load arbitrary remote images in your browser.",
    why: "Link unfurls use these tags. Missing or invalid image URLs are a common pre-launch miss on AI-generated sites.",
    how: [
      "Set og:title, og:description, and an absolute og:image URL.",
      "Make sure the image URL is publicly reachable over HTTPS.",
      "Add Twitter tags if you care about X/Twitter-specific cards.",
    ],
    faqs: [
      { question: "Is the share preview exact?", answer: "No. Preview is approximate. Actual rendering varies by platform." },
      { question: "Why isn’t the image shown?", answer: "The server checks the image URL safely. The browser does not load untrusted remote files as a substitute for that check." },
      { question: "Do you crawl other pages?", answer: "No. Only the submitted page and, if present, its og:image URL." },
      { question: "Does a missing og:image block Google?", answer: "This tool does not claim that. It reports whether the tag was observed and whether the image URL could be requested." },
    ],
    related: ["meta-tag-checker", "security-headers-checker", "broken-link-checker"],
    loading: "Checking Open Graph tags…",
  },
  {
    id: "security-headers-checker",
    name: "Security Headers Checker",
    h1: "Free Security Headers Checker",
    title: "Free Security Headers Checker — HSTS, CSP, and more | AI Website Preflight",
    description: "See whether a page response includes HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and frame controls.",
    summary: "Observe common HTTP security headers without assigning a security score.",
    what: "This checker fetches only the submitted URL and reports whether selected response headers were present. Missing headers are facts. This is a limited HTTP response-header check, not a vulnerability assessment.",
    why: "AI-built sites often ship without HSTS, CSP, or clickjacking controls. Observing those headers is a cheap pre-launch sanity check.",
    how: [
      "Add the headers your host or framework already supports.",
      "Prefer a CSP you can maintain over a copied strict policy that breaks the site.",
      "Treat this report as a header inventory, then verify behavior in your own environment.",
    ],
    faqs: [
      { question: "Do you give a security score?", answer: "No. There is no 100% score and no vulnerability claim." },
      { question: "If a header is missing, am I hacked?", answer: "No. Not observed means the header was not in the response we received." },
      { question: "Will you generate a CSP for me?", answer: "No. A strict CSP depends on how the site loads scripts and assets." },
      { question: "Is this a penetration test?", answer: "No. It is a limited HTTP response-header check, not a vulnerability assessment." },
    ],
    related: ["meta-tag-checker", "robots-txt-checker", "open-graph-checker"],
    loading: "Checking response headers…",
  },
  {
    id: "broken-link-checker",
    name: "Broken Link Checker",
    h1: "Free Broken Link Checker",
    title: "Free Broken Link Checker — Internal links on one page | AI Website Preflight",
    description: "Check up to 20 unique internal links on a single page for HTTP errors. External links are skipped.",
    summary: "Check up to 20 internal links on one page. No sitewide crawl.",
    what: "This checker fetches the submitted page, collects unique same-origin links, and requests at most 20 of them with low concurrency. It does not recurse, and it skips external links in this version.",
    why: "Broken internal links are a concrete pre-launch defect. Checking one page keeps the tool fast enough for a small server and matches a single-question search.",
    how: [
      "Replace hash, javascript:, and empty hrefs with real paths.",
      "Confirm important navigation URLs return HTTP 200.",
      "Run Full Website Preflight if you need a broader sample of pages.",
    ],
    faqs: [
      { question: "Do you crawl the entire website?", answer: "No. Only the submitted page and up to 20 unique internal links from that page." },
      { question: "Why are some links skipped?", answer: "External links are skipped in this version. Extra internal links beyond 20 are also skipped." },
      { question: "What counts as broken?", answer: "HTTP 400+ responses, timeouts, and fetch failures on the checked internal URLs." },
      { question: "Are JavaScript-rendered links included?", answer: "Only href values present in the fetched HTML are checked." },
    ],
    related: ["meta-tag-checker", "sitemap-checker", "open-graph-checker"],
    featured: true,
    loading: "Checking up to 20 internal links…",
  },
  {
    id: "ai-crawler-checker",
    name: "AI Crawler Checker",
    h1: "Free AI Crawler Checker",
    title: "Free AI Crawler Checker — GPTBot, ClaudeBot, and more | AI Website Preflight",
    description: "See whether robots.txt explicitly allows, blocks, or ignores GPTBot, ClaudeBot, Google-Extended, and PerplexityBot.",
    summary: "Read explicit robots.txt rules for the AI crawlers Preflight already tracks.",
    what: "This checker fetches robots.txt and reports explicit rules for the current Preflight AI crawler list: GPTBot, ClaudeBot, Google-Extended, and PerplexityBot. A bot-specific group takes precedence over User-agent: *. Absence of a named group is reported as no explicit rule.",
    why: "People often want a factual read of AI crawler preferences without assuming that robots.txt controls every AI product.",
    how: [
      "Add a User-agent group for a crawler only when you have a real preference.",
      "Use Allow: / or Disallow: / explicitly; do not assume * applies to a named bot in this report.",
      "Remember that robots.txt expresses crawler preferences, not a guarantee about AI products.",
    ],
    faqs: [
      { question: "Is my site optimized for ChatGPT?", answer: "This tool does not say that. It only reports robots.txt declarations for listed crawlers." },
      { question: "If a bot is not mentioned, is it allowed?", answer: "There is no explicit rule for that bot. Many crawlers then fall back to their own defaults or to User-agent: *." },
      { question: "Which bots are included?", answer: "The same registry used by Full Website Preflight: GPTBot, ClaudeBot, Google-Extended, and PerplexityBot." },
      { question: "Does robots.txt stop training on my content?", answer: "No. Directives express crawler preferences and do not guarantee whether content will appear in AI products." },
    ],
    related: ["robots-txt-checker", "sitemap-checker", "meta-tag-checker"],
    featured: true,
    loading: "Checking AI crawler rules…",
  },
];

const byId = new Map(TOOLS.map((tool) => [tool.id, tool]));

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export function getTool(id: ToolId): ToolDefinition {
  const tool = byId.get(id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export function relatedTools(id: ToolId): ToolDefinition[] {
  return getTool(id).related.map(getTool);
}
