type LogLevel = "debug" | "info" | "warn" | "error";
const levels: LogLevel[] = ["debug", "info", "warn", "error"];
const configuredLevel = (process.env.LOG_LEVEL ?? "info") as LogLevel;

export function log(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  if (levels.indexOf(level) < levels.indexOf(configuredLevel)) return;
  console[level]({ level, event, ...context });
}
