const runtime = { active: 0, maxOverride: 0 };

export function maxActiveToolRuns() {
  if (runtime.maxOverride > 0) return runtime.maxOverride;
  const value = Number(process.env.MAX_ACTIVE_TOOL_RUNS ?? 2);
  if (!Number.isFinite(value) || value < 1) return 2;
  return Math.min(Math.floor(value), 4);
}

export function tryAcquireToolSlot() {
  if (runtime.active >= maxActiveToolRuns()) return false;
  runtime.active += 1;
  return true;
}

export function releaseToolSlot() {
  runtime.active = Math.max(0, runtime.active - 1);
}

export function configureToolRuntime(options: { maxActiveToolRuns?: number } = {}) {
  if (options.maxActiveToolRuns !== undefined) runtime.maxOverride = options.maxActiveToolRuns;
}

export function resetToolRuntime() {
  runtime.active = 0;
  runtime.maxOverride = 0;
}

export function getToolRuntimeSnapshot() {
  return { active: runtime.active, maxActive: maxActiveToolRuns() };
}
