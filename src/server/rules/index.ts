import type { ScanEvidence } from "../scan-engine";
import { availabilityRules } from "./availability";
import { contentRules } from "./content";
import { indexabilityRules } from "./indexability";
import { brokenLinkRules } from "./links";
import { metadataRules } from "./metadata";
import { resourceRules } from "./resources";
import { securityRules } from "./security";
export type { Finding, PageFacts, Severity } from "./types";

export function runRules(scan: ScanEvidence) {
  return [availabilityRules, indexabilityRules, metadataRules, brokenLinkRules, contentRules, resourceRules, securityRules].flatMap((rule) => rule(scan));
}
