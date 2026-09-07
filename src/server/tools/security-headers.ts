import { sanitizeResponseHeaders } from "../headers";
import type { Fetcher } from "../scan-engine";
import { publicFetchIssue } from "./errors";
import { toolScanLimits } from "./limits";
import type { SecurityHeadersToolResult } from "./types";

const NAMES = [
  ["strict-transport-security", "Strict-Transport-Security"],
  ["content-security-policy", "Content-Security-Policy"],
  ["x-content-type-options", "X-Content-Type-Options"],
  ["referrer-policy", "Referrer-Policy"],
  ["x-frame-options", "X-Frame-Options"],
] as const;

function clip(value?: string) {
  if (!value) return undefined;
  return value.length > 300 ? `${value.slice(0, 300)}…` : value;
}

export async function analyzeSecurityHeaders(url: URL, fetcher: Fetcher): Promise<SecurityHeadersToolResult> {
  try {
    const page = await fetcher(url, toolScanLimits.htmlBytes);
    const headers = sanitizeResponseHeaders(page.headers) ?? {};
    const csp = headers["content-security-policy"] ?? "";
    const frameAncestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1]?.trim();
    return {
      status: page.status,
      finalUrl: page.finalUrl,
      headers: NAMES.map(([key, name]) => ({ name, value: clip(headers[key]), present: Boolean(headers[key]) })),
      frameAncestors: clip(frameAncestors),
      disclaimer: "This is a limited HTTP response-header check, not a vulnerability assessment.",
    };
  } catch (error) {
    return {
      headers: NAMES.map(([, name]) => ({ name, present: false })),
      disclaimer: "This is a limited HTTP response-header check, not a vulnerability assessment.",
      issue: publicFetchIssue(error),
    };
  }
}
