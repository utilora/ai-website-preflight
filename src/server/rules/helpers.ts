import type { Finding, Severity } from "./types";

export function finding(ruleId: string, severity: Severity, title: string, message: string, evidence: string, affectedUrl: string, metadata?: Record<string, unknown>): Finding {
  return { ruleId, severity, title, message, evidence, affectedUrl, ...(metadata ? { metadata } : {}) };
}

export function countBy<T>(items: T[], value: (item: T) => string | undefined) {
  const groups = new Map<string, T[]>();
  for (const item of items) { const key = value(item)?.trim(); if (!key) continue; groups.set(key, [...(groups.get(key) ?? []), item]); }
  return groups;
}
