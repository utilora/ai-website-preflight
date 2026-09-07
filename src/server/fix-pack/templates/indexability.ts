import type { FixTemplate } from "../types";

const sitemap: FixTemplate = {
  goal: "Expose a valid sitemap that lists the intended canonical public URLs.",
  guidance: ["Identify how the current framework or deployment generates sitemap.xml before editing.", "Create or correct the sitemap using the project's conventions and include only valid public canonical URLs."],
  acceptanceCriteria: ["The public sitemap endpoint returns a successful response.", "The sitemap is valid XML and contains at least one intended same-origin URL.", "The production build and existing checks pass."],
};

const noindex: FixTemplate = {
  goal: "Allow indexing of the affected public pages when production indexing is intended.",
  guidance: ["Find where robots metadata or response headers are configured in the existing framework.", "Remove the verified noindex directive only from pages intended for public indexing; preserve intentional noindex rules for private or utility pages."],
  acceptanceCriteria: ["Affected public pages no longer emit the verified noindex directive.", "Pages intentionally excluded from indexing remain excluded.", "The deployed response and a new preflight scan confirm the change."],
};

export const indexabilityTemplates: Record<string, FixTemplate> = {
  "robots.missing-or-unavailable": {
    goal: "Provide an intentional, publicly accessible robots.txt response.",
    guidance: ["Inspect the framework and hosting conventions for robots.txt.", "Add or restore the file without broadly blocking public crawlers unless the owner explicitly intends that behavior."],
    acceptanceCriteria: ["/robots.txt returns a successful public response.", "Crawler directives match the owner's indexing intent.", "No accidental universal Disallow: / is present."],
  },
  "robots.sitewide-block": {
    goal: "Allow normal public search crawling when this production website is intended to be indexed.",
    guidance: ["Inspect the project's robots configuration or generated robots.txt.", "Remove the universal block only if production indexing is intended; preserve intentional bot-specific directives."],
    acceptanceCriteria: ["Public robots.txt no longer contains a universal User-agent: * with Disallow: / when indexing is intended.", "Intentional bot-specific rules remain intact.", "The deployed robots.txt and a new scan confirm the result."],
  },
  "sitemap.missing-or-unavailable": sitemap,
  "sitemap.http-error": sitemap,
  "sitemap.invalid": sitemap,
  "sitemap.empty": sitemap,
  "indexability.meta-noindex": noindex,
  "indexability.header-noindex": noindex,
};
