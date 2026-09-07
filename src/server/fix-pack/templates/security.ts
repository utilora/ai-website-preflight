import type { FixTemplate } from "../types";

const securityHeader: FixTemplate = {
  goal: "Add or intentionally configure the observed missing response-header protection.",
  guidance: ["Inspect the application's hosting, proxy, embedded content, and external script/style/image requirements before changing headers.", "Introduce the relevant header incrementally through existing deployment conventions and test real user flows. Do not apply a blindly restrictive Content-Security-Policy."],
  acceptanceCriteria: ["The intended header is present on affected deployed responses.", "Required scripts, styles, images, frames, and navigation still work.", "Security checks and the production build pass without regressions."],
};

export const securityTemplates: Record<string, FixTemplate> = {
  "security.header.hsts": securityHeader,
  "security.header.csp": securityHeader,
  "security.header.nosniff": securityHeader,
  "security.header.referrer-policy": securityHeader,
  "security.header.frame-protection": securityHeader,
  "security.mixed-content": { goal: "Stop loading verified HTTP resources from affected HTTPS pages.", guidance: ["Confirm each observed resource has a trusted HTTPS endpoint or can be served locally.", "Update only confirmed resource references and verify third-party behavior; do not silently remove required functionality."], acceptanceCriteria: ["Affected HTTPS pages no longer reference the listed resources over HTTP.", "Resources still load from trusted intended endpoints.", "Browser checks show no mixed-content regression."] },
  "security.potential-exposed-secret": { goal: "Determine whether the redacted pattern represents a real exposed credential and contain it safely if confirmed.", guidance: ["Manually verify the credential type without copying it into issues, logs, commits, or this Fix Pack.", "If confirmed, rotate or revoke the credential before removing it from public client output; then inspect deployment configuration and version history for further exposure.", "Use server-side secret storage appropriate to the existing platform and validate dependent integrations after rotation."], acceptanceCriteria: ["A qualified owner has confirmed whether the pattern was a real credential.", "Any confirmed credential is rotated or revoked before public exposure is removed.", "No full secret appears in public output, repository history added by this work, logs, or test fixtures.", "Affected integrations and the production build are verified after containment."] },
};
