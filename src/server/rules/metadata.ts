import type { PageEvidence, ScanEvidence } from "../scan-engine";
import { countBy, finding } from "./helpers";
import type { Finding } from "./types";

const defaults = new Set(["vite + react", "create next app", "react app"]);
const usable = (page: PageEvidence) => Boolean(page.facts && page.status && page.status < 400 && !page.error);

export function metadataRules(scan: ScanEvidence) {
  const findings: Finding[] = []; const pages = scan.pages.filter(usable);
  for (const page of pages) { const facts = page.facts!; const url = page.finalUrl ?? page.requestedUrl;
    if (!facts.title) findings.push(finding("title.missing", "high", "Page title is missing", "No non-empty title element was observed.", "No non-empty `<title>` value was extracted.", url));
    else if (defaults.has(facts.title.toLowerCase())) findings.push(finding("title.default-template", "medium", "Default template title detected", "The title exactly matches a common starter template.", `Observed title: ${facts.title}`, url));
    if (!facts.descriptionPresent || !facts.description) findings.push(finding("description.missing", "medium", "Meta description is missing", "No non-empty meta description was observed.", "No non-empty `<meta name=\"description\">` value was extracted.", url));
    if (!facts.canonicalPresent) findings.push(finding("canonical.missing", "low", "Canonical link is missing", "No canonical link was observed on this sampled page.", "No `<link rel=\"canonical\">` element was extracted.", url));
    else if (!facts.canonicalValid || !facts.canonical) findings.push(finding("canonical.invalid", "medium", "Canonical URL is invalid or empty", "The canonical link could not be resolved as a URL.", "Canonical element was present but its href was empty or invalid.", url));
    else if (new URL(facts.canonical).origin !== new URL(url).origin) findings.push(finding("canonical.cross-origin", "medium", "Canonical points to another origin", "The canonical URL uses a different origin and should be verified.", `Page origin: ${new URL(url).origin}; canonical: ${facts.canonical}`, url, { canonical: facts.canonical }));
    if (!facts.h1.length) findings.push(finding("heading.h1-missing", "medium", "Page has no H1", "No non-empty H1 was observed in the sampled HTML.", "Extracted H1 count: 0", url));
    if (facts.h1.length > 1 && new Set(facts.h1.map((value) => value.toLowerCase())).size === 1) findings.push(finding("heading.h1-duplicate", "low", "Repeated identical H1 elements", "Multiple H1 elements contain the same text.", `Observed ${facts.h1.length} H1 elements with text: ${facts.h1[0]}`, url));
    if (!facts.openGraph.title) findings.push(finding("open-graph.title-missing", "low", "Open Graph title was not observed", "The sampled page does not expose og:title.", "No non-empty `og:title` value was extracted.", url));
    if (!facts.openGraph.description) findings.push(finding("open-graph.description-missing", "low", "Open Graph description was not observed", "The sampled page does not expose og:description.", "No non-empty `og:description` value was extracted.", url));
    if (!facts.openGraph.image) findings.push(finding(facts.openGraph.imageValid ? "open-graph.image-missing" : "open-graph.image-invalid", "low", facts.openGraph.imageValid ? "Open Graph image was not observed" : "Open Graph image URL is invalid", facts.openGraph.imageValid ? "The sampled page does not expose a usable og:image URL." : "The og:image value could not be resolved as a URL.", facts.openGraph.imageValid ? "No non-empty `og:image` value was extracted." : "An `og:image` value was present but invalid.", url));
    if (!facts.viewportPresent) findings.push(finding("viewport.missing", "medium", "Viewport meta tag is missing", "No viewport meta tag was observed.", "No `<meta name=\"viewport\">` element was extracted.", url));
  }
  for (const [title, duplicates] of countBy(pages, (page) => page.facts?.title)) if (duplicates.length > 1) findings.push(finding("title.duplicate", "medium", "Duplicate page titles", "Multiple sampled pages use exactly the same title.", `Title "${title}" appears on ${duplicates.length} pages.`, duplicates[0].finalUrl ?? duplicates[0].requestedUrl, { urls: duplicates.map((page) => page.finalUrl ?? page.requestedUrl) }));
  for (const [description, duplicates] of countBy(pages, (page) => page.facts?.description)) if (duplicates.length > 1) findings.push(finding("description.duplicate", "medium", "Duplicate meta descriptions", "Multiple sampled pages use exactly the same description.", `Description "${description}" appears on ${duplicates.length} pages.`, duplicates[0].finalUrl ?? duplicates[0].requestedUrl, { urls: duplicates.map((page) => page.finalUrl ?? page.requestedUrl) }));
  return findings;
}
