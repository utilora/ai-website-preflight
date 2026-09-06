export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  evidence: string;
  affectedUrl: string;
  metadata?: Record<string, unknown>;
};

export type PageFacts = {
  title?: string;
  description?: string;
  descriptionPresent: boolean;
  canonical?: string;
  canonicalPresent: boolean;
  canonicalValid: boolean;
  h1: string[];
  noindexMeta: boolean;
  placeholderLinks: string[];
  placeholderContent: string[];
  faviconUrl?: string;
  viewportPresent: boolean;
  openGraph: { title?: string; description?: string; image?: string; imageValid: boolean };
  imagesWithoutAlt: string[];
  unlabeledControls: string[];
  headingLevels: number[];
  mixedContent: string[];
  secretPatterns: string[];
  jsonLd: { count: number; invalidCount: number };
  policyLinks: { privacy: string[]; terms: string[]; contact: string[] };
};
