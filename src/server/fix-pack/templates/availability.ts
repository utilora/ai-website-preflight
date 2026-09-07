import type { FixTemplate } from "../types";

const homepage: FixTemplate = {
  goal: "Make the public homepage return a successful response for normal visitors and crawlers.",
  guidance: ["Inspect the existing routing, hosting, deployment logs, and upstream dependencies before editing.", "Correct only the verified cause of the failed public response; preserve intentional redirects and error handling."],
  acceptanceCriteria: ["The affected homepage URL returns a successful public response.", "Intentional redirects remain bounded and end at the intended public URL.", "Existing project checks and the production build pass."],
};

export const availabilityTemplates: Record<string, FixTemplate> = {
  "availability.homepage-fetch": homepage,
  "availability.homepage-status": homepage,
  "transport.https": {
    goal: "Serve the final public website URL over HTTPS.",
    guidance: ["Inspect the current host, proxy, certificate, and redirect configuration.", "Configure a valid HTTPS endpoint and a bounded HTTP-to-HTTPS redirect without changing application behavior."],
    acceptanceCriteria: ["The submitted public URL ends at an HTTPS URL.", "The HTTPS certificate is valid for the public hostname.", "No redirect loop is introduced and project checks pass."],
  },
};
