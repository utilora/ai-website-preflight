import { extractInternalLinks, type Fetcher } from "../scan-engine";
import { publicFetchIssue } from "./errors";
import { toolLimits, toolScanLimits } from "./limits";
import type { BrokenLinkToolResult } from "./types";

function extractExternalLinks(html: string, base: URL) {
  const found = new Set<string>();
  for (const match of html.matchAll(/href\s*=\s*["']([^"'#\s]+)["']/gi)) {
    try {
      const href = new URL(match[1], base);
      href.hash = "";
      if ((href.protocol === "http:" || href.protocol === "https:") && href.origin !== base.origin) found.add(href.toString());
    } catch { /* skip */ }
  }
  return [...found];
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => run()));
  return results;
}

export async function analyzeBrokenLinks(url: URL, fetcher: Fetcher): Promise<BrokenLinkToolResult> {
  try {
    const page = await fetcher(url, toolScanLimits.htmlBytes);
    const base = new URL(page.finalUrl);
    const internal = extractInternalLinks(page.body, base).filter((href) => href !== page.finalUrl);
    const external = extractExternalLinks(page.body, base);
    const toCheck = internal.slice(0, toolLimits.brokenLinkMax);
    const skipped = [
      ...internal.slice(toolLimits.brokenLinkMax).map((href) => ({ url: href, reason: "limit" as const })),
      ...external.map((href) => ({ url: href, reason: "external" as const })),
    ];
    const checked = await mapPool(toCheck, toolLimits.brokenLinkConcurrency, async (href) => {
      try {
        const result = await fetcher(new URL(href), toolScanLimits.htmlBytes);
        return { url: href, status: String(result.status), state: result.status >= 400 ? "broken" as const : "working" as const };
      } catch (error) {
        const mapped = publicFetchIssue(error);
        return { url: href, status: mapped.code, state: mapped.code === "timeout" ? "timeout" as const : "broken" as const };
      }
    });
    return {
      status: page.status,
      finalUrl: page.finalUrl,
      checked,
      skipped,
      summary: {
        checked: checked.length,
        working: checked.filter((item) => item.state === "working").length,
        broken: checked.filter((item) => item.state !== "working").length,
        skipped: skipped.length,
      },
    };
  } catch (error) {
    return {
      checked: [],
      skipped: [],
      summary: { checked: 0, working: 0, broken: 0, skipped: 0 },
      issue: publicFetchIssue(error),
    };
  }
}
