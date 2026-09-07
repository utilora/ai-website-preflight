export type RateLimiterOptions = {
  maxHits: number;
  windowMs: number;
  maxKeys: number;
  now?: () => number;
};

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, number[]>();
  private readonly maxHits: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;
  private ops = 0;

  constructor(options: RateLimiterOptions) {
    this.maxHits = Math.max(1, options.maxHits);
    this.windowMs = Math.max(1, options.windowMs);
    this.maxKeys = Math.max(1, options.maxKeys);
    this.now = options.now ?? Date.now;
  }

  get size() { return this.buckets.size; }

  allow(key: string): boolean {
    const boundedKey = key.slice(0, 253);
    this.ops += 1;
    if (this.ops >= 32 || this.buckets.size >= this.maxKeys) {
      this.ops = 0;
      this.cleanup();
    }
    const now = this.now();
    const cutoff = now - this.windowMs;
    let hits = this.buckets.get(boundedKey);
    if (!hits) {
      if (this.buckets.size >= this.maxKeys) this.cleanup();
      if (this.buckets.size >= this.maxKeys) this.evictOldest();
      hits = [];
      this.buckets.set(boundedKey, hits);
    }
    let start = 0;
    while (start < hits.length && hits[start] <= cutoff) start += 1;
    if (start) hits.splice(0, start);
    if (hits.length >= this.maxHits) return false;
    hits.push(now);
    return true;
  }

  cleanup() {
    const cutoff = this.now() - this.windowMs;
    for (const [key, hits] of this.buckets) {
      const kept = hits.filter((stamp) => stamp > cutoff);
      if (kept.length) this.buckets.set(key, kept);
      else this.buckets.delete(key);
    }
    while (this.buckets.size > this.maxKeys) this.evictOldest();
  }

  private evictOldest() {
    let oldestKey: string | undefined;
    let oldest = Number.POSITIVE_INFINITY;
    for (const [key, hits] of this.buckets) {
      const last = hits[hits.length - 1] ?? 0;
      if (last < oldest) { oldest = last; oldestKey = key; }
    }
    if (oldestKey) this.buckets.delete(oldestKey);
  }
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createDefaultIpLimiter(now?: () => number) {
  return new SlidingWindowLimiter({
    maxHits: envNumber("SCAN_RATE_LIMIT_IP_MAX", 5),
    windowMs: envNumber("SCAN_RATE_LIMIT_IP_WINDOW_MS", 10 * 60 * 1000),
    maxKeys: envNumber("SCAN_RATE_LIMIT_MAX_KEYS", 2048),
    now,
  });
}

export function createDefaultHostLimiter(now?: () => number) {
  return new SlidingWindowLimiter({
    maxHits: envNumber("SCAN_RATE_LIMIT_HOST_MAX", 3),
    windowMs: envNumber("SCAN_RATE_LIMIT_HOST_WINDOW_MS", 10 * 60 * 1000),
    maxKeys: envNumber("SCAN_RATE_LIMIT_MAX_KEYS", 2048),
    now,
  });
}

export let ipScanLimiter = createDefaultIpLimiter();
export let hostScanLimiter = createDefaultHostLimiter();

export function resetScanRateLimiters(options: { ip?: SlidingWindowLimiter; host?: SlidingWindowLimiter; now?: () => number } = {}) {
  ipScanLimiter = options.ip ?? createDefaultIpLimiter(options.now);
  hostScanLimiter = options.host ?? createDefaultHostLimiter(options.now);
}

export function trustProxyHeadersEnabled(value = process.env.TRUST_PROXY_HEADERS) {
  return value === "true";
}

export const UNTRUSTED_CLIENT_IP = "direct";

function lastForwardedHop(value: string | null): string | null {
  if (!value) return null;
  const hops = value.split(",").map((part) => part.trim()).filter(Boolean);
  const hop = hops.at(-1);
  return hop ? hop.slice(0, 128) : null;
}

export function clientIpFromHeaders(headers: Headers, options: { trustProxy?: boolean } = {}): string {
  const trustProxy = options.trustProxy ?? trustProxyHeadersEnabled();
  if (!trustProxy) return UNTRUSTED_CLIENT_IP;
  return lastForwardedHop(headers.get("x-forwarded-for")) ?? lastForwardedHop(headers.get("x-real-ip")) ?? UNTRUSTED_CLIENT_IP;
}



export function hostKeyFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase().slice(0, 253);
  } catch {
    return null;
  }
}
