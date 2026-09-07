import { analyzeHtml } from "../html-evidence";
import type { Fetcher } from "../scan-engine";
import { publicFetchIssue } from "./errors";
import { toolLimits, toolScanLimits } from "./limits";
import type { ObservedIssue, OpenGraphToolResult } from "./types";

export async function analyzeOpenGraph(url: URL, fetcher: Fetcher): Promise<OpenGraphToolResult> {
  try {
    const page = await fetcher(url, toolScanLimits.htmlBytes);
    const facts = analyzeHtml(page.body, new URL(page.finalUrl));
    const issues: ObservedIssue[] = [];
    if (!facts.openGraph.title) issues.push({ label: "og:title missing", detail: "No non-empty og:title was observed." });
    if (!facts.openGraph.description) issues.push({ label: "og:description missing", detail: "No non-empty og:description was observed." });
    if (!facts.openGraph.image) {
      issues.push({ label: facts.openGraph.imageValid ? "og:image missing" : "og:image invalid", detail: facts.openGraph.imageValid ? "No og:image URL was observed." : "og:image was present but could not be resolved as a URL." });
    }
    let imageCheck: OpenGraphToolResult["imageCheck"];
    if (facts.openGraph.image) {
      try {
        const image = await fetcher(new URL(facts.openGraph.image), toolLimits.imageBytes);
        imageCheck = { url: image.finalUrl, status: image.status, contentType: image.headers["content-type"] };
        if (image.status >= 400) issues.push({ label: "og:image unavailable", detail: `Image request returned HTTP ${image.status}.` });
      } catch (error) {
        const mapped = publicFetchIssue(error);
        imageCheck = { url: facts.openGraph.image, error: mapped.message };
        issues.push({ label: "og:image unavailable", detail: mapped.message });
      }
    }
    return {
      status: page.status,
      finalUrl: page.finalUrl,
      openGraph: facts.openGraph,
      twitter: facts.twitter,
      imageCheck,
      issues,
    };
  } catch (error) {
    return {
      openGraph: { imageValid: true },
      twitter: {},
      issues: [],
      issue: publicFetchIssue(error),
    };
  }
}
