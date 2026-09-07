import type { Finding, Severity } from "./rules";

export type ReadinessStatus = "ready" | "almost-ready" | "not-ready";
export type ScoreDeduction = { ruleId: string; severity: Severity; affectedCount: number; countedOccurrences: number; deduction: number };
export type ScoreBreakdown = { score: number; status: ReadinessStatus; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; infoCount: number; totalFindings: number; deductions: ScoreDeduction[] };
export type FindingGroup = { ruleId: string; severity: Severity; title: string; message: string; affectedCount: number; findings: Finding[] };
export type ResultGroups = { mustFix: FindingGroup[]; warnings: FindingGroup[]; info: FindingGroup[] };

export const severityDeductions: Record<Severity, number> = { critical: 15, high: 8, medium: 4, low: 1, info: 0 };
export const occurrenceCaps: Record<Severity, number> = { critical: 1, high: 2, medium: 3, low: 3, info: 0 };
const severityRank: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

const siteWideRuleIds = new Set([
  "availability.homepage-fetch", "availability.homepage-status", "transport.https",
  "robots.missing-or-unavailable", "robots.sitewide-block", "robots.ai-crawler-access",
  "sitemap.missing-or-unavailable", "sitemap.http-error", "sitemap.invalid", "sitemap.empty",
  "favicon.missing", "favicon.unavailable", "not-found.soft-404",
  "navigation.privacy-link-missing", "navigation.terms-link-missing", "navigation.contact-link-missing",
]);
function isSiteWide(ruleId: string) { return siteWideRuleIds.has(ruleId) || ruleId.startsWith("security.header."); }

export function readinessStatus(score: number, criticalCount: number): ReadinessStatus {
  if (criticalCount > 0 || score < 75) return "not-ready";
  return score >= 90 ? "ready" : "almost-ready";
}

export function calculateScore(findings: Finding[]): ScoreBreakdown {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const grouped = new Map<string, { severity: Severity; affectedUrls: Set<string> }>();
  for (const item of findings) {
    counts[item.severity]++;
    const existing = grouped.get(item.ruleId);
    if (!existing) grouped.set(item.ruleId, { severity: item.severity, affectedUrls: new Set([item.affectedUrl]) });
    else { existing.affectedUrls.add(item.affectedUrl); if (severityRank[item.severity] > severityRank[existing.severity]) existing.severity = item.severity; }
  }
  const deductions = [...grouped].map(([ruleId, group]) => {
    const affectedCount = group.affectedUrls.size;
    const countedOccurrences = Math.min(affectedCount, isSiteWide(ruleId) ? 1 : occurrenceCaps[group.severity]);
    return { ruleId, severity: group.severity, affectedCount, countedOccurrences, deduction: countedOccurrences * severityDeductions[group.severity] };
  });
  const score = Math.max(0, Math.min(100, 100 - deductions.reduce((sum, item) => sum + item.deduction, 0)));
  return { score, status: readinessStatus(score, counts.critical), criticalCount: counts.critical, highCount: counts.high, mediumCount: counts.medium, lowCount: counts.low, infoCount: counts.info, totalFindings: findings.length, deductions };
}

export function groupFindings(findings: Finding[]): ResultGroups {
  const byRule = new Map<string, FindingGroup>();
  for (const item of findings) {
    const current = byRule.get(item.ruleId);
    if (current) { current.findings.push(item); current.affectedCount = new Set(current.findings.map((finding) => finding.affectedUrl)).size; }
    else byRule.set(item.ruleId, { ruleId: item.ruleId, severity: item.severity, title: item.title, message: item.message, affectedCount: 1, findings: [item] });
  }
  const groups: ResultGroups = { mustFix: [], warnings: [], info: [] };
  for (const group of byRule.values()) {
    if (group.severity === "critical" || group.severity === "high") groups.mustFix.push(group);
    else if (group.severity === "medium" || group.severity === "low") groups.warnings.push(group);
    else groups.info.push(group);
  }
  return groups;
}
