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
  viewport?: string;
  robotsMeta?: string;
  openGraph: { title?: string; description?: string; image?: string; imageValid: boolean; url?: string; type?: string };
  twitter: { card?: string; title?: string; description?: string; image?: string };
  imagesWithoutAlt: string[];
  unlabeledControls: string[];
  headingLevels: number[];
  mixedContent: string[];
  secretPatterns: string[];
  jsonLd: { count: number; invalidCount: number };
  policyLinks: { privacy: string[]; terms: string[]; contact: string[] };
};
