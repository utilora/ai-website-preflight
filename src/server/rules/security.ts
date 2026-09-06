import type { ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

const headers = [
  ["strict-transport-security", "security.header.hsts", "Strict-Transport-Security"],
  ["content-security-policy", "security.header.csp", "Content-Security-Policy"],
  ["x-content-type-options", "security.header.nosniff", "X-Content-Type-Options"],
  ["referrer-policy", "security.header.referrer-policy", "Referrer-Policy"],
] as const;

export function securityRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = [];
  for (const page of scan.pages) { if (!page.facts || !page.headers || page.error || !page.status || page.status >= 400) continue; const url = page.finalUrl ?? page.requestedUrl;
    for (const [header, ruleId, label] of headers) if (!(header === "strict-transport-security" && new URL(url).protocol !== "https:") && !page.headers[header]) findings.push(finding(ruleId, "low", `${label} header was not observed`, `The ${label} response header was not observed; this fact alone does not establish a vulnerability.`, `Response headers did not include ${label}.`, url));
    const csp = page.headers["content-security-policy"] ?? "";
    if (!page.headers["x-frame-options"] && !/(?:^|;)\s*frame-ancestors\b/i.test(csp)) findings.push(finding("security.header.frame-protection", "low", "Frame embedding control was not observed", "Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.", "Response headers contained neither framing control.", url));
    if (page.facts.mixedContent.length) findings.push(finding("security.mixed-content", "high", "HTTP resources referenced from an HTTPS page", "The HTTPS page explicitly references resources over HTTP.", `Examples: ${page.facts.mixedContent.join(", ")}`, url));
    if (page.facts.secretPatterns.length) findings.push(finding("security.potential-exposed-secret", "critical", "Potential exposed credential pattern", "Potential exposed credential pattern detected in public page source. Manual verification required. This is not a complete security audit.", `Matched pattern type(s): ${page.facts.secretPatterns.join(", ")}; matched values were not retained.`, url));
  }
  return findings;
}
