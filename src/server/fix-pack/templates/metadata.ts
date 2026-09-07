import type { FixTemplate } from "../types";

const title: FixTemplate = {
  goal: "Give each affected page a useful, descriptive document title.",
  guidance: ["Inspect the repository and identify the framework and existing metadata conventions before editing.", "Define a page-specific title in the framework's current metadata mechanism; do not assume a source path or framework."],
  acceptanceCriteria: ["Every affected page emits one non-empty descriptive title.", "The title is not a starter-template value and is appropriate to that page.", "Existing project checks and the production build pass."],
};
const description: FixTemplate = {
  goal: "Provide a distinct, accurate meta description for each affected page.",
  guidance: ["Identify the framework's existing metadata mechanism before editing.", "Add concise page-specific descriptions based on real page content; do not invent capabilities or claims."],
  acceptanceCriteria: ["Each affected page emits one non-empty meta description.", "Descriptions are distinct where page content differs.", "Deployed HTML and a new scan confirm the metadata."],
};
const canonical: FixTemplate = {
  goal: "Expose an intentional, valid canonical URL for each affected public page.",
  guidance: ["Inspect current routing and metadata conventions before changing canonical output.", "Set the canonical to the preferred public URL only after confirming domain, path, and redirect behavior with the owner."],
  acceptanceCriteria: ["Each affected page emits one valid canonical URL.", "The canonical uses the intended public origin and resolves to the preferred page.", "Redirect and alternate-page behavior remains intact."],
};

export const metadataTemplates: Record<string, FixTemplate> = {
  "title.missing": title, "title.default-template": title, "title.duplicate": title,
  "description.missing": description, "description.duplicate": description,
  "canonical.missing": canonical, "canonical.invalid": canonical, "canonical.cross-origin": canonical,
  "heading.h1-missing": { goal: "Give the affected page a clear primary heading.", guidance: ["Inspect the existing page composition and content hierarchy.", "Add one meaningful H1 that describes the page without redesigning the layout or duplicating visible content."], acceptanceCriteria: ["The affected page contains a non-empty primary H1.", "The heading describes the actual page purpose.", "Visual layout and existing behavior remain intact."] },
  "heading.h1-duplicate": { goal: "Remove unintended repeated identical H1 elements.", guidance: ["Inspect the rendered heading hierarchy and reusable components.", "Keep one appropriate primary heading and adjust repeated headings only where they are semantically unintended."], acceptanceCriteria: ["The affected page no longer repeats the same H1 unintentionally.", "The visible hierarchy remains clear.", "Existing accessibility and build checks pass."] },
  "viewport.missing": { goal: "Provide appropriate mobile viewport metadata.", guidance: ["Identify the framework's document-head configuration.", "Add a standard responsive viewport declaration through existing conventions without assuming a specific framework."], acceptanceCriteria: ["The affected page emits a viewport meta tag.", "The page remains usable at common mobile widths.", "The production build passes."] },
};
