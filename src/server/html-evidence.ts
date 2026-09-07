import type { PageFacts } from "./rules/types";

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return result;
}

function text(value: string) { return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(); }
function tags(html: string, name: string) { return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]); }
function absolute(value: string | undefined, base: URL) { if (value === undefined || !value.trim()) return undefined; try { return new URL(value, base).toString(); } catch { return undefined; } }

export function analyzeHtml(html: string, base: URL): PageFacts {
  const meta = tags(html, "meta").map(attributes);
  const links = tags(html, "link").map(attributes);
  const anchors = tags(html, "a").map(attributes);
  const title = text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || undefined;
  const descriptionTag = meta.find((item) => item.name?.toLowerCase() === "description");
  const canonicalTag = links.find((item) => item.rel?.toLowerCase().split(/\s+/).includes("canonical"));
  const canonical = absolute(canonicalTag?.href, base);
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => text(match[1])).filter(Boolean);
  const robots = meta.filter((item) => ["robots", "googlebot", "bingbot"].includes(item.name?.toLowerCase())).map((item) => item.content?.toLowerCase() ?? "");
  const placeholderLinks = anchors.filter((item) => item.href === undefined || /^\s*$|^\s*#$|^\s*javascript:\s*void\s*\(\s*0\s*\)\s*;?$/i.test(item.href)).map((item) => item.href === undefined ? "missing href" : item.href || "empty href");
  const bodyText = text(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " "));
  const placeholderContent = [
    /\blorem ipsum\b/i.test(bodyText) ? "Lorem ipsum" : "",
    /\bTODO\b/.test(bodyText) ? "TODO" : "",
    /\bFIXME\b/.test(bodyText) ? "FIXME" : "",
    (/^coming soon$/i.test(h1[0] ?? "") || /^coming soon$/i.test(title ?? "")) ? "Coming soon heading/title" : "",
  ].filter(Boolean);
  const faviconTag = links.find((item) => item.rel?.toLowerCase().split(/\s+/).some((value) => value === "icon" || value === "shortcut"));
  const property = (name: string) => meta.find((item) => item.property?.toLowerCase() === name)?.content?.trim() || undefined;
  const named = (name: string) => meta.find((item) => item.name?.toLowerCase() === name)?.content?.trim() || undefined;
  const ogImageRaw = property("og:image");
  const twitterImageRaw = named("twitter:image") ?? property("twitter:image");
  const imagesWithoutAlt = tags(html, "img").map(attributes).filter((item) => !("alt" in item)).slice(0, 5).map((item) => item.src || "<img without src>");
  const labelFors = new Set([...html.matchAll(/<label\b[^>]*>/gi)].map((match) => attributes(match[0]).for).filter(Boolean));
  const controls = [...tags(html, "input"), ...tags(html, "textarea"), ...tags(html, "select")].map(attributes).filter((item) => item.type?.toLowerCase() !== "hidden");
  const unlabeledControls = controls.filter((item) => !item["aria-label"] && !item["aria-labelledby"] && !(item.id && labelFors.has(item.id))).slice(0, 5).map((item) => item.id || item.name || item.type || "unnamed control");
  const headingLevels = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) => Number(match[1]));
  const resourceTags = [...tags(html, "script"), ...tags(html, "img"), ...tags(html, "iframe"), ...tags(html, "source"), ...tags(html, "link")];
  const mixedContent = base.protocol === "https:" ? resourceTags.map(attributes).map((item) => item.src ?? item.href).filter((value): value is string => /^http:\/\//i.test(value)).slice(0, 5) : [];
  const secretPatterns = [
    [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
    [/\bgh[pousr]_[A-Za-z0-9]{36,255}\b/, "GitHub token"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key header"],
  ].filter(([pattern]) => (pattern as RegExp).test(html)).map(([, name]) => name as string);
  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  let invalidCount = 0; for (const block of jsonLdBlocks) { try { JSON.parse(block); } catch { invalidCount++; } }
  const policyLinks = { privacy: [] as string[], terms: [] as string[], contact: [] as string[] };
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = absolute(attributes(`<a ${match[1]}>`).href, base); if (!href) continue;
    const label = `${href} ${text(match[2])}`.toLowerCase();
    if (/privacy/.test(label)) policyLinks.privacy.push(href);
    if (/terms|terms-of-service|terms-of-use/.test(label)) policyLinks.terms.push(href);
    if (/contact|support|about/.test(label)) policyLinks.contact.push(href);
  }
  return {
    title, description: descriptionTag?.content?.trim() || undefined, descriptionPresent: Boolean(descriptionTag),
    canonical, canonicalPresent: Boolean(canonicalTag), canonicalValid: !canonicalTag || Boolean(canonical), h1,
    noindexMeta: robots.some((value) => /(?:^|,)\s*noindex\b/.test(value)), placeholderLinks, placeholderContent,
    faviconUrl: absolute(faviconTag?.href, base), viewportPresent: meta.some((item) => item.name?.toLowerCase() === "viewport"),
    viewport: named("viewport"), robotsMeta: named("robots"),
    openGraph: { title: property("og:title"), description: property("og:description"), image: absolute(ogImageRaw, base), imageValid: !ogImageRaw || Boolean(absolute(ogImageRaw, base)), url: absolute(property("og:url"), base), type: property("og:type") },
    twitter: { card: named("twitter:card") ?? property("twitter:card"), title: named("twitter:title") ?? property("twitter:title"), description: named("twitter:description") ?? property("twitter:description"), image: absolute(twitterImageRaw, base) },
    imagesWithoutAlt, unlabeledControls, headingLevels, mixedContent, secretPatterns,
    jsonLd: { count: jsonLdBlocks.length, invalidCount }, policyLinks,
  };
}
