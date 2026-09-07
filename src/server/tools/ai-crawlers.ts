import { parseRobotsDirectives, type Fetcher } from "../scan-engine";
import { AI_CRAWLERS, explicitCrawlerStatus, universalRobotsStatus } from "../rules/ai-crawlers";
import { publicFetchIssue } from "./errors";
import { toolLimits, toolScanLimits } from "./limits";
import type { AiCrawlerToolResult } from "./types";

function label(status: ReturnType<typeof explicitCrawlerStatus>): AiCrawlerToolResult["crawlers"][number]["status"] {
  if (status === "allowed") return "explicitly allowed";
  if (status === "blocked") return "explicitly blocked";
  return "no explicit rule";
}

export async function analyzeAiCrawlers(url: URL, fetcher: Fetcher): Promise<AiCrawlerToolResult> {
  const note = "robots.txt directives express crawler preferences but do not guarantee whether content will or will not appear in AI products.";
  try {
    const robots = await fetcher(new URL("/robots.txt", url.origin), toolScanLimits.textBytes);
    const found = robots.status < 400;
    const directives = found ? parseRobotsDirectives(robots.body) : [];
    return {
      found,
      status: robots.status,
      universal: universalRobotsStatus(directives),
      crawlers: AI_CRAWLERS.map((bot) => ({ bot, status: found ? label(explicitCrawlerStatus(directives, bot)) : "no explicit rule" })),
      preview: found ? robots.body.slice(0, toolLimits.robotsPreviewChars) : "",
      note,
    };
  } catch (error) {
    return {
      found: false,
      universal: "no User-agent: * group",
      crawlers: AI_CRAWLERS.map((bot) => ({ bot, status: "no explicit rule" })),
      preview: "",
      note,
      issue: publicFetchIssue(error),
    };
  }
}
