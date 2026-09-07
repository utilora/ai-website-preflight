import type { Finding, Severity } from "../rules";
import type { ReadinessStatus, ScoreBreakdown } from "../scoring";

export type FixTemplate = {
  goal: string;
  guidance: string[];
  acceptanceCriteria: string[];
};

export type FixPackScan = {
  id: string;
  normalizedUrl: string;
  status: "queued" | "running" | "completed" | "failed";
  findings?: Finding[];
  score?: ScoreBreakdown;
};

export type FixTaskGroup = {
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  findings: Finding[];
  affectedUrls: string[];
};

export type FixPackResult = {
  markdown: string;
  taskCount: number;
  informationalRuleIds: string[];
};

export const readinessLabels: Record<ReadinessStatus, string> = {
  ready: "READY TO LAUNCH",
  "almost-ready": "ALMOST READY",
  "not-ready": "NOT READY",
};
