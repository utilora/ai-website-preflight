import { normalizePublicUrl, type Fetcher } from "../scan-engine";
import { analyzeAiCrawlers } from "./ai-crawlers";
import { analyzeBrokenLinks } from "./broken-links";
import { ToolUserError, normalizeToolError } from "./errors";
import { fetchTool } from "./limits";
import { analyzeMetadata } from "./metadata";
import { analyzeOpenGraph } from "./open-graph";
import { isToolId } from "./registry";
import { analyzeRobots } from "./robots";
import { analyzeSecurityHeaders } from "./security-headers";
import { analyzeSitemap } from "./sitemap";
import type { ToolRunSuccess } from "./types";

const analyzers = {
  "sitemap-checker": analyzeSitemap,
  "robots-txt-checker": analyzeRobots,
  "meta-tag-checker": analyzeMetadata,
  "open-graph-checker": analyzeOpenGraph,
  "security-headers-checker": analyzeSecurityHeaders,
  "broken-link-checker": analyzeBrokenLinks,
  "ai-crawler-checker": analyzeAiCrawlers,
} as const;

export async function runTool(tool: string, rawUrl: string, options: { fetcher?: Fetcher } = {}): Promise<ToolRunSuccess> {
  if (!isToolId(tool)) throw new ToolUserError("failed", "Unknown tool.");
  const started = Date.now();
  let normalized: URL;
  try {
    normalized = await normalizePublicUrl(rawUrl);
  } catch (error) {
    throw normalizeToolError(error);
  }
  const fetcher = options.fetcher ?? fetchTool;
  const data = await analyzers[tool](normalized, fetcher);
  return { ok: true, tool, url: rawUrl, normalizedUrl: normalized.toString(), durationMs: Date.now() - started, data };
}

