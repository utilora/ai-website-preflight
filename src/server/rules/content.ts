import type { ScanEvidence } from "../scan-engine";
import { finding } from "./helpers";
import type { Finding } from "./types";

export function contentRules(scan: ScanEvidence): Finding[] {
  const findings: Finding[] = [];
  for (const page of scan.pages) { const facts = page.facts; if (!facts || page.error || !page.status || page.status >= 400) continue; const url = page.finalUrl ?? page.requestedUrl;
    if (facts.placeholderLinks.length) findings.push(finding("links.placeholder", "medium", "Placeholder links detected", "The page contains anchors without a navigable target.", `Observed ${facts.placeholderLinks.length} placeholder link(s): ${facts.placeholderLinks.slice(0, 3).join(", ")}`, url, { count: facts.placeholderLinks.length }));
    if (facts.placeholderContent.length) findings.push(finding("content.placeholder", "medium", "Placeholder content detected", "High-confidence development placeholder text appears in the page.", `Observed: ${facts.placeholderContent.join(", ")}`, url));
    if (facts.imagesWithoutAlt.length) findings.push(finding("accessibility.image-alt-missing", "medium", "Images without alt attributes", "One or more images have no alt attribute; decorative images with alt=\"\" are not counted.", `Observed ${facts.imagesWithoutAlt.length} example(s): ${facts.imagesWithoutAlt.join(", ")}`, url, { exampleCount: facts.imagesWithoutAlt.length }));
    if (facts.unlabeledControls.length) findings.push(finding("accessibility.form-label-missing", "medium", "Form controls lack an accessible label", "Controls without label, aria-label, or aria-labelledby were observed.", `Examples: ${facts.unlabeledControls.join(", ")}`, url));
    if (!facts.headingLevels.length) findings.push(finding("accessibility.headings-missing", "low", "No headings were observed", "The sampled page has no H1-H6 heading elements.", "Extracted heading count: 0", url));
    const jump = facts.headingLevels.findIndex((level, index) => index > 0 && level - facts.headingLevels[index - 1] > 1);
    if (jump >= 0) findings.push(finding("accessibility.heading-level-jump", "low", "Heading level jump detected", "The heading sequence skips more than one level.", `Observed H${facts.headingLevels[jump - 1]} followed by H${facts.headingLevels[jump]}.`, url));
    if (facts.jsonLd.invalidCount) findings.push(finding("structured-data.jsonld-invalid", "medium", "JSON-LD contains invalid JSON", "At least one JSON-LD block could not be parsed as JSON; Schema.org meaning was not evaluated.", `Invalid blocks: ${facts.jsonLd.invalidCount} of ${facts.jsonLd.count}`, url));
  }
  const home = scan.pages[0]; const homeUrl = home?.finalUrl ?? scan.normalizedUrl; const policies = home?.facts?.policyLinks;
  if (policies && !policies.privacy.length) findings.push(finding("navigation.privacy-link-missing", "low", "No obvious privacy link was found", "No obvious privacy page link was found in the sampled homepage links; this is not a legal compliance conclusion.", "Homepage links contained no URL or anchor text matching privacy.", homeUrl));
  if (policies && !policies.terms.length) findings.push(finding("navigation.terms-link-missing", "info", "No obvious terms link was found", "No obvious terms page link was found in the sampled homepage links.", "Homepage links contained no URL or anchor text matching terms.", homeUrl));
  if (policies && !policies.contact.length) findings.push(finding("navigation.contact-link-missing", "low", "No obvious contact link was found", "No obvious contact, support, or about link was found in the sampled homepage links.", "Homepage links contained no URL or anchor text matching contact, support, or about.", homeUrl));
  return findings;
}
