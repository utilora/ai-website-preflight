import { parseRobotsSitemaps, sitemapDocumentInfo, type Fetcher } from "../scan-engine";
import { publicFetchIssue } from "./errors";
import { toolLimits, toolScanLimits } from "./limits";
import type { SitemapToolResult } from "./types";

function kindFromBody(body: string, parseable: boolean): SitemapToolResult["parseStatus"] {
  if (/<sitemapindex\b/i.test(body) && parseable) return "sitemapindex";
  if (/<urlset\b/i.test(body) && parseable) return "urlset";
  return "invalid";
}

export async function analyzeSitemap(url: URL, fetcher: Fetcher): Promise<SitemapToolResult> {
  const origin = url.origin;
  let robotsStatus: number | undefined;
  let declaredSitemaps: string[] = [];
  try {
    const robots = await fetcher(new URL("/robots.txt", origin), toolScanLimits.textBytes);
    robotsStatus = robots.status;
    if (robots.status < 400) declaredSitemaps = parseRobotsSitemaps(robots.body);
  } catch {
    robotsStatus = undefined;
  }
  const declaredSameOrigin = declaredSitemaps.find((value) => {
    try { return new URL(value).origin === origin; } catch { return false; }
  });
  const sitemapUrl = new URL(declaredSameOrigin ?? "/sitemap.xml", origin);
  try {
    const sitemap = await fetcher(sitemapUrl, toolScanLimits.sitemapBytes);
    if (sitemap.status >= 400) {
      return {
        sitemapFound: false,
        sitemapUrl: sitemap.finalUrl,
        status: sitemap.status,
        parseStatus: sitemap.status === 404 ? "missing" : "error",
        urlCount: 0,
        invalidUrlCount: 0,
        exampleUrls: [],
        robotsDeclaresSitemap: declaredSitemaps.length > 0,
        declaredSitemaps: declaredSitemaps.slice(0, 5),
        robotsStatus,
      };
    }
    const info = sitemapDocumentInfo(sitemap.body, origin, toolScanLimits.sitemapUrls);
    const examples = [...sitemap.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
      .map((match) => match[1].trim())
      .filter(Boolean)
      .slice(0, toolLimits.exampleUrls);
    return {
      sitemapFound: info.parseable,
      sitemapUrl: sitemap.finalUrl,
      status: sitemap.status,
      parseStatus: kindFromBody(sitemap.body, info.parseable),
      urlCount: info.urlCount,
      invalidUrlCount: info.invalidUrlCount,
      exampleUrls: examples,
      robotsDeclaresSitemap: declaredSitemaps.length > 0,
      declaredSitemaps: declaredSitemaps.slice(0, 5),
      robotsStatus,
    };
  } catch (error) {
    return {
      sitemapFound: false,
      sitemapUrl: sitemapUrl.toString(),
      parseStatus: "error",
      urlCount: 0,
      invalidUrlCount: 0,
      exampleUrls: [],
      robotsDeclaresSitemap: declaredSitemaps.length > 0,
      declaredSitemaps: declaredSitemaps.slice(0, 5),
      robotsStatus,
      issue: publicFetchIssue(error),
    };
  }
}
