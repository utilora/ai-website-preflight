import { analyzeHtml } from "../html-evidence";
import { sanitizeResponseHeaders } from "../headers";
import type { Fetcher } from "../scan-engine";
import { publicFetchIssue } from "./errors";
import { toolScanLimits } from "./limits";
import type { MetaToolResult, ObservedIssue } from "./types";

export async function analyzeMetadata(url: URL, fetcher: Fetcher): Promise<MetaToolResult> {
  try {
    const page = await fetcher(url, toolScanLimits.htmlBytes);
    const facts = analyzeHtml(page.body, new URL(page.finalUrl));
    const issues: ObservedIssue[] = [];
    if (!facts.title) issues.push({ label: "Missing title", detail: "No non-empty title element was observed." });
    if (!facts.descriptionPresent || !facts.description) issues.push({ label: "Missing meta description", detail: "No non-empty meta description was observed." });
    if (facts.noindexMeta) issues.push({ label: "noindex meta", detail: "A robots meta tag contains noindex." });
    if (/\bnoindex\b/i.test(sanitizeResponseHeaders(page.headers)?.["x-robots-tag"] ?? "")) {
      issues.push({ label: "noindex header", detail: "X-Robots-Tag contains noindex." });
    }
    if (!facts.canonicalPresent) issues.push({ label: "Missing canonical", detail: "No canonical link was observed." });
    else if (!facts.canonicalValid || !facts.canonical) issues.push({ label: "Invalid canonical", detail: "The canonical href was empty or not a usable URL." });
    if (!facts.viewportPresent) issues.push({ label: "Missing viewport", detail: "No viewport meta tag was observed." });
    if (!facts.h1.length) issues.push({ label: "Missing H1", detail: "No non-empty H1 was observed." });
    return {
      status: page.status,
      finalUrl: page.finalUrl,
      observed: {
        title: facts.title,
        description: facts.description,
        canonical: facts.canonical,
        robotsMeta: facts.robotsMeta,
        viewport: facts.viewport,
        h1: facts.h1.slice(0, 5),
      },
      issues,
    };
  } catch (error) {
    return { observed: { h1: [] }, issues: [], issue: publicFetchIssue(error) };
  }
}
