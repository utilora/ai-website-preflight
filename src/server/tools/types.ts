export const TOOL_IDS = [
  "sitemap-checker",
  "robots-txt-checker",
  "meta-tag-checker",
  "open-graph-checker",
  "security-headers-checker",
  "broken-link-checker",
  "ai-crawler-checker",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolErrorCode =
  | "invalid_url"
  | "unsafe_target"
  | "unreachable"
  | "timeout"
  | "too_large"
  | "rate_limited"
  | "failed";

export type ToolIssue = { code: ToolErrorCode; message: string };

export type ObservedIssue = { label: string; detail: string };

export type FaqItem = { question: string; answer: string };

export type ToolDefinition = {
  id: ToolId;
  name: string;
  h1: string;
  title: string;
  description: string;
  summary: string;
  what: string;
  why: string;
  how: string[];
  faqs: FaqItem[];
  related: ToolId[];
  featured?: boolean;
  loading: string;
};

export type SitemapToolResult = {
  sitemapFound: boolean;
  sitemapUrl: string;
  status?: number;
  parseStatus: "urlset" | "sitemapindex" | "invalid" | "missing" | "error";
  urlCount: number;
  invalidUrlCount: number;
  exampleUrls: string[];
  robotsDeclaresSitemap: boolean;
  declaredSitemaps: string[];
  robotsStatus?: number;
  issue?: ToolIssue;
};

export type RobotsToolResult = {
  found: boolean;
  status?: number;
  sitemapDirectives: string[];
  universal: { present: boolean; status: string; disallowRoot: boolean };
  crawlers: { bot: string; status: string }[];
  preview: string;
  issue?: ToolIssue;
};

export type MetaToolResult = {
  status?: number;
  finalUrl?: string;
  observed: {
    title?: string;
    description?: string;
    canonical?: string;
    robotsMeta?: string;
    viewport?: string;
    h1: string[];
  };
  issues: ObservedIssue[];
  issue?: ToolIssue;
};

export type OpenGraphToolResult = {
  status?: number;
  finalUrl?: string;
  openGraph: { title?: string; description?: string; image?: string; url?: string; type?: string; imageValid: boolean };
  twitter: { card?: string; title?: string; description?: string; image?: string };
  imageCheck?: { url: string; status?: number; contentType?: string; error?: string };
  issues: ObservedIssue[];
  issue?: ToolIssue;
};

export type SecurityHeadersToolResult = {
  status?: number;
  finalUrl?: string;
  headers: { name: string; value?: string; present: boolean }[];
  frameAncestors?: string;
  disclaimer: string;
  issue?: ToolIssue;
};

export type BrokenLinkToolResult = {
  status?: number;
  finalUrl?: string;
  checked: { url: string; status?: string; state: "working" | "broken" | "timeout" }[];
  skipped: { url: string; reason: "external" | "limit" }[];
  summary: { checked: number; working: number; broken: number; skipped: number };
  issue?: ToolIssue;
};

export type AiCrawlerToolResult = {
  found: boolean;
  status?: number;
  universal: string;
  crawlers: { bot: string; status: "explicitly allowed" | "explicitly blocked" | "no explicit rule" }[];
  preview: string;
  note: string;
  issue?: ToolIssue;
};

export type ToolData =
  | SitemapToolResult
  | RobotsToolResult
  | MetaToolResult
  | OpenGraphToolResult
  | SecurityHeadersToolResult
  | BrokenLinkToolResult
  | AiCrawlerToolResult;

export type ToolRunSuccess = {
  ok: true;
  tool: ToolId;
  url: string;
  normalizedUrl: string;
  durationMs: number;
  data: ToolData;
};
