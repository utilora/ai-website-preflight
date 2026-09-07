const SAFE_RESPONSE_HEADER_NAMES = new Set([
  "content-type",
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "x-robots-tag",
  "location",
]);

const BLOCKED_RESPONSE_HEADER_NAMES = new Set([
  "set-cookie",
  "cookie",
  "authorization",
  "proxy-authorization",
  "www-authenticate",
  "proxy-authenticate",
]);

export function sanitizeResponseHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined;
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = key.toLowerCase();
    if (!SAFE_RESPONSE_HEADER_NAMES.has(name) || BLOCKED_RESPONSE_HEADER_NAMES.has(name) || typeof value !== "string") continue;
    sanitized[name] = value;
  }
  return sanitized;
}

export function scanHasDisallowedHeaders(value: unknown): boolean {
  const json = JSON.stringify(value).toLowerCase();
  return json.includes("set-cookie") || json.includes('"authorization"') || json.includes("proxy-authorization") || json.includes('"cookie":');
}
