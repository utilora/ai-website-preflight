import type { ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

export function availabilityRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = []; const home = scan.pages[0]; const url = home?.finalUrl ?? scan.normalizedUrl;
  if (!home || home.error || !home.status) findings.push(finding("availability.homepage-fetch", "critical", "Homepage could not be fetched", "The core homepage request did not complete.", home?.error ?? scan.errorSummary ?? "No homepage response evidence was recorded.", url));
  else if (home.status >= 400) findings.push(finding("availability.homepage-status", home.status >= 500 ? "critical" : "high", "Homepage returned an error status", `The homepage returned HTTP ${home.status}.`, `Observed HTTP status: ${home.status}; final URL: ${url}`, url, { status: home.status }));
  if (home?.finalUrl && new URL(home.finalUrl).protocol !== "https:") findings.push(finding("transport.https", "high", "Homepage remains on HTTP", "The final homepage URL is not HTTPS.", `Final URL after redirects: ${home.finalUrl}`, home.finalUrl));
  return findings;
}
