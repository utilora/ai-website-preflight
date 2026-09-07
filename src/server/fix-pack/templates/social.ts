import type { FixTemplate } from "../types";

const openGraph: FixTemplate = {
  goal: "Provide accurate Open Graph metadata for shared links.",
  guidance: ["Identify the framework's existing social metadata mechanism before editing.", "Use page-specific title, description, and an accessible public image based on real page content; do not invent claims."],
  acceptanceCriteria: ["The affected page emits the missing or corrected Open Graph field.", "The Open Graph image URL, when present, is publicly accessible.", "A deployed metadata check confirms the result."],
};

export const socialTemplates: Record<string, FixTemplate> = {
  "open-graph.title-missing": openGraph,
  "open-graph.description-missing": openGraph,
  "open-graph.image-missing": openGraph,
  "open-graph.image-invalid": openGraph,
  "open-graph.image-unavailable": openGraph,
  "favicon.missing": { goal: "Provide a working favicon for the public website.", guidance: ["Inspect the existing framework and static asset conventions.", "Add or correct the intended favicon and reference it through the project's current document metadata mechanism."], acceptanceCriteria: ["A declared favicon or the standard favicon path returns a successful response.", "The favicon is valid and displays in a browser.", "The production build passes."] },
  "favicon.unavailable": { goal: "Restore public access to the configured favicon.", guidance: ["Inspect the current favicon reference, generated asset path, and deployment output.", "Correct the verified path or asset without replacing unrelated branding."], acceptanceCriteria: ["The configured favicon URL returns a successful response.", "The intended icon displays after deployment.", "No unrelated branding is changed."] },
};
