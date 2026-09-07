import type { RobotsDirective } from "../scan-engine";

export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot"] as const;
export type AiCrawler = (typeof AI_CRAWLERS)[number];
export type ExplicitCrawlerStatus = "allowed" | "blocked" | "not explicitly mentioned";

export function explicitCrawlerStatus(directives: RobotsDirective[], bot: string): ExplicitCrawlerStatus {
  const relevant = directives.filter((item) => item.userAgents.some((agent) => agent.toLowerCase() === bot.toLowerCase()));
  if (!relevant.length) return "not explicitly mentioned";
  return relevant.some((item) => item.disallow.includes("/")) ? "blocked" : "allowed";
}

export function universalRobotsStatus(directives: RobotsDirective[]) {
  const star = directives.filter((item) => item.userAgents.some((agent) => agent === "*"));
  if (!star.length) return "no User-agent: * group";
  if (star.some((item) => item.disallow.includes("/"))) return "blocks /";
  return "does not block /";
}
