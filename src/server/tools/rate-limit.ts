import { SlidingWindowLimiter } from "../rate-limit";

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createDefaultToolIpLimiter(now?: () => number) {
  return new SlidingWindowLimiter({
    maxHits: envNumber("TOOL_RATE_LIMIT_IP_MAX", 20),
    windowMs: envNumber("TOOL_RATE_LIMIT_IP_WINDOW_MS", 10 * 60 * 1000),
    maxKeys: envNumber("TOOL_RATE_LIMIT_MAX_KEYS", 2048),
    now,
  });
}

export function createDefaultToolHostLimiter(now?: () => number) {
  return new SlidingWindowLimiter({
    maxHits: envNumber("TOOL_RATE_LIMIT_HOST_MAX", 8),
    windowMs: envNumber("TOOL_RATE_LIMIT_HOST_WINDOW_MS", 10 * 60 * 1000),
    maxKeys: envNumber("TOOL_RATE_LIMIT_MAX_KEYS", 2048),
    now,
  });
}

export let ipToolLimiter = createDefaultToolIpLimiter();
export let hostToolLimiter = createDefaultToolHostLimiter();

export function resetToolRateLimiters(options: { ip?: SlidingWindowLimiter; host?: SlidingWindowLimiter; now?: () => number } = {}) {
  ipToolLimiter = options.ip ?? createDefaultToolIpLimiter(options.now);
  hostToolLimiter = options.host ?? createDefaultToolHostLimiter(options.now);
}
