import type { FixTemplate } from "./types";
import { availabilityTemplates } from "./templates/availability";
import { businessTemplates } from "./templates/business";
import { contentTemplates } from "./templates/content";
import { indexabilityTemplates } from "./templates/indexability";
import { metadataTemplates } from "./templates/metadata";
import { securityTemplates } from "./templates/security";
import { socialTemplates } from "./templates/social";

export const fixTemplateRegistry: Readonly<Record<string, FixTemplate>> = Object.freeze({
  ...availabilityTemplates,
  ...indexabilityTemplates,
  ...metadataTemplates,
  ...contentTemplates,
  ...socialTemplates,
  ...securityTemplates,
  ...businessTemplates,
});

export function templateFor(ruleId: string) { return fixTemplateRegistry[ruleId]; }

export const informationalOnlyRuleIds = new Set([
  "robots.ai-crawler-access",
  "not-found.soft-404",
  "navigation.terms-link-missing",
]);
