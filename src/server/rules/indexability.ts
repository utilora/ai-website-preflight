import type { RobotsDirective, ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

const aiBots = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot"];

function statusForBot(directives: RobotsDirective[], bot: string) {
  const relevant = directives.filter((item) => item.userAgents.some((agent) => agent.toLowerCase() === bot.toLowerCase()));
  if (!relevant.length) return "not explicitly mentioned";
  return relevant.some((item) => item.disallow.includes("/")) ? "blocked" : "allowed";
}

export function indexabilityRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = []; const home = scan.pages[0]; const homeUrl = home?.finalUrl ?? scan.normalizedUrl; const robots = scan.robots; if (!home || home.error || !home.status || home.status >= 400) return findings;
  const robotDirectives = robots && !robots.error && robots.status && robots.status < 400 ? robots.directives : [];
  if (!robots || robots.error || !robots.status || robots.status >= 400) findings.push(finding("robots.missing-or-unavailable", "low", "robots.txt was not available", "No successful robots.txt response was observed.", robots?.error ?? `Observed HTTP status: ${robots?.status ?? "none"}`, homeUrl));
  if (robotDirectives.some((group) => group.userAgents.includes("*") && group.disallow.includes("/"))) findings.push(finding("robots.sitewide-block", "critical", "robots.txt blocks the entire site", "A universal crawler group explicitly disallows the root path.", "Observed `User-agent: *` with `Disallow: /`.", homeUrl));
  if (!scan.sitemap || scan.sitemap.error || scan.sitemap.status === 404) findings.push(finding("sitemap.missing-or-unavailable", "low", "Sitemap was not available", "No successful sitemap response was observed.", scan.sitemap?.error ?? `Observed HTTP status: ${scan.sitemap?.status ?? "none"}`, homeUrl));
  else if ((scan.sitemap.status ?? 0) >= 400) findings.push(finding("sitemap.http-error", "medium", "Sitemap request returned an error", `The sitemap returned HTTP ${scan.sitemap.status}.`, `Observed HTTP status: ${scan.sitemap.status}`, scan.sitemap.url ?? homeUrl));
  else if (!scan.sitemap.parseable) findings.push(finding("sitemap.invalid", "medium", "Sitemap could not be parsed", "The response did not contain a recognizable sitemap document.", "No valid urlset or sitemapindex root was observed.", scan.sitemap.url ?? homeUrl));
  else if (scan.sitemap.urlCount === 0) findings.push(finding("sitemap.empty", "low", "Sitemap is empty", "The parsed sitemap did not declare any URLs.", "Parsed URL count: 0", scan.sitemap.url ?? homeUrl));
  for (const page of scan.pages) {
    if (page.error || !page.status || page.status >= 400) continue;
    const url = page.finalUrl ?? page.requestedUrl;
    if (page.facts?.noindexMeta) findings.push(finding("indexability.meta-noindex", "critical", "Page has a noindex meta directive", "A robots meta tag explicitly contains noindex.", "Observed `<meta name=\"robots\" content=\"noindex\">` directive.", url));
    if (/\bnoindex\b/i.test(page.headers?.["x-robots-tag"] ?? "")) findings.push(finding("indexability.header-noindex", "critical", "Page has an X-Robots-Tag noindex directive", "The HTTP response explicitly contains noindex.", `X-Robots-Tag: ${page.headers?.["x-robots-tag"]}`, url));
  }
  const statuses = Object.fromEntries(aiBots.map((bot) => [bot, statusForBot(robotDirectives, bot)]));
  findings.push(finding("robots.ai-crawler-access", "info", "AI crawler access declarations", "robots.txt declarations for common AI crawlers are reported as facts only.", Object.entries(statuses).map(([bot, status]) => `${bot}: ${status}`).join("; "), homeUrl, { statuses }));
  return findings;
}
