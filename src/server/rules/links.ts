import type { ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

export function brokenLinkRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = []; const byRequest = new Map(scan.pages.map((page) => [page.requestedUrl, page]));
  for (const source of scan.pages) for (const target of source.internalLinks) {
    const result = byRequest.get(target); if (!result || (!result.error && (result.status ?? 0) < 400)) continue;
    const sourceUrl = source.finalUrl ?? source.requestedUrl; const evidence = result.error ? `Source: ${sourceUrl}; target: ${target}; fetch error: ${result.error}` : `Source: ${sourceUrl}; target: ${target}; HTTP status: ${result.status}`;
    findings.push(finding("links.broken-internal", "high", "Broken internal link", "A sampled internal link returned an explicit error or could not be fetched.", evidence, target, { sourceUrl, targetUrl: target, status: result.status }));
  }
  return findings;
}
