import type { ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

export function resourceRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = []; const home = scan.pages[0]; const url = home?.finalUrl ?? scan.normalizedUrl; if (!home || home.error || !home.status || home.status >= 400) return findings;
  const favicon = scan.resources?.find((item) => item.kind === "favicon");
  if (!favicon || favicon.status === 404) findings.push(finding("favicon.missing", "low", "Favicon was not found", "Neither a working declared favicon nor the default favicon path was observed.", `Favicon probe status: ${favicon?.status ?? "not available"}`, url));
  else if (favicon.error || (favicon.status ?? 0) >= 400) findings.push(finding("favicon.unavailable", "low", "Favicon was not accessible", "The discovered favicon request did not succeed.", favicon.error ?? `Observed HTTP status: ${favicon.status}`, favicon.url));
  const og = scan.resources?.find((item) => item.kind === "og-image");
  if (og && (og.error || (og.status ?? 0) >= 400)) findings.push(finding("open-graph.image-unavailable", "low", "Open Graph image was not accessible", "The discovered og:image request did not succeed.", og.error ?? `Observed HTTP status: ${og.status}`, og.url));
  const missing = scan.missingPage;
  if (missing && missing.status !== 404 && !missing.error) findings.push(finding("not-found.soft-404", "info", "Unknown path did not return HTTP 404", "A deterministic nonexistent path returned a non-404 status; this is only a basic soft-404 signal.", `Requested ${missing.url}; observed HTTP ${missing.status ?? "unknown"}.`, missing.url));
  return findings;
}
