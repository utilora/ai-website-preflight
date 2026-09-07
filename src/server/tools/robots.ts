import { parseRobotsDirectives, parseRobotsSitemaps, type Fetcher } from "../scan-engine";
import { AI_CRAWLERS, explicitCrawlerStatus, universalRobotsStatus } from "../rules/ai-crawlers";
import { publicFetchIssue } from "./errors";
import { toolLimits, toolScanLimits } from "./limits";
import type { RobotsToolResult } from "./types";

export async function analyzeRobots(url: URL, fetcher: Fetcher): Promise<RobotsToolResult> {
  try {
    const robots = await fetcher(new URL("/robots.txt", url.origin), toolScanLimits.textBytes);
    const found = robots.status < 400;
    const directives = found ? parseRobotsDirectives(robots.body) : [];
    const star = directives.filter((item) => item.userAgents.some((agent) => agent === "*"));
    return {
      found,
      status: robots.status,
      sitemapDirectives: found ? parseRobotsSitemaps(robots.body) : [],
      universal: {
        present: star.length > 0,
        status: universalRobotsStatus(directives),
        disallowRoot: star.some((item) => item.disallow.includes("/")),
      },
      crawlers: AI_CRAWLERS.map((bot) => ({ bot, status: explicitCrawlerStatus(directives, bot) })),
      preview: found ? robots.body.slice(0, toolLimits.robotsPreviewChars) : "",
    };
  } catch (error) {
    return {
      found: false,
      sitemapDirectives: [],
      universal: { present: false, status: "no User-agent: * group", disallowRoot: false },
      crawlers: AI_CRAWLERS.map((bot) => ({ bot, status: "not explicitly mentioned" })),
      preview: "",
      issue: publicFetchIssue(error),
    };
  }
}
