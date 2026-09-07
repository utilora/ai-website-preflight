const secretPatterns: Array<[RegExp, string]> = [
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)* PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
  [/\bBearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi, "Bearer [REDACTED_TOKEN]"],
];

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = ""; url.password = ""; url.hash = "";
    if (url.search) url.search = "?redacted";
    return url.toString();
  } catch { return "[invalid URL omitted]"; }
}

export function sanitizeEvidence(value: string, maxLength = 1_200): string {
  let result = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  for (const [pattern, replacement] of secretPatterns) result = result.replace(pattern, replacement);
  result = result.replace(/https?:\/\/[^\s<>"']+/gi, (match) => sanitizeUrl(match.replace(/[),.;]+$/, "")));
  result = result.replace(/([?&](?:access_token|api[_-]?key|auth|password|secret|token)=)[^\s&#;]+/gi, "$1[REDACTED]");
  result = result.replace(/~~~/g, "~ ~ ~").trim();
  return result.length > maxLength ? `${result.slice(0, maxLength)}…` : result;
}
