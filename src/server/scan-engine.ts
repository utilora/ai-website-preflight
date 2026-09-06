import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { mkdirSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { analyzeHtml } from "./html-evidence";
import { runRules, type Finding, type PageFacts } from "./rules";

export type ScanLimits = { pages: number; redirects: number; timeoutMs: number; htmlBytes: number; textBytes: number; sitemapBytes: number; sitemapUrls: number };
export const limits: ScanLimits = { pages: 8, redirects: 4, timeoutMs: 10_000, htmlBytes: 1_000_000, textBytes: 256_000, sitemapBytes: 512_000, sitemapUrls: 50 };
export type ScanStatus = "queued" | "running" | "completed" | "failed";
export type PageEvidence = { requestedUrl: string; finalUrl?: string; status?: number; redirects: string[]; headers?: Record<string, string>; contentType?: string; title?: string; internalLinks: string[]; facts?: PageFacts; durationMs: number; error?: string };
export type RobotsDirective = { userAgents: string[]; allow: string[]; disallow: string[] };
export type ResourceEvidence = { kind: "favicon" | "og-image"; url: string; status?: number; error?: string };
export type ScanEvidence = { id: string; submittedUrl: string; normalizedUrl: string; status: ScanStatus; createdAt: string; startedAt?: string; completedAt?: string; errorSummary?: string; pages: PageEvidence[]; robots?: { status?: number; discoveredSitemaps: string[]; directives: RobotsDirective[]; error?: string }; sitemap?: { url?: string; status?: number; selectedUrls: string[]; parseable: boolean; urlCount: number; invalidUrlCount: number; error?: string }; resources?: ResourceEvidence[]; missingPage?: { url: string; status?: number; error?: string }; findings?: Finding[]; warnings: string[] };
export type ResolvedAddress = { address: string; family: number };
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;
export type FetchResult = { status: number; headers: Record<string, string>; body: string; finalUrl: string; redirects: string[] };
export type Fetcher = (url: URL, maxBytes: number) => Promise<FetchResult>;
export type Transport = (url: URL, address: ResolvedAddress, maxBytes: number, activeLimits: ScanLimits) => Promise<Omit<FetchResult, "finalUrl" | "redirects">>;

export class UnsafeUrlError extends Error {}
const blocked = new BlockList();
for (const [network, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [["::",128],["::1",128],["fc00::",7],["fe80::",10],["ff00::",8],["2001:db8::",32]] as const) blocked.addSubnet(network, prefix, "ipv6");
function dnsName(hostname: string) { return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase(); }
export function isForbiddenIp(value: string): boolean { const address = dnsName(value); const family = isIP(address); return family === 4 ? blocked.check(address, "ipv4") : family === 6 ? blocked.check(address, "ipv6") : true; }
const systemResolver: Resolver = async (hostname) => lookup(hostname, { all: true, verbatim: true });

export async function normalizePublicUrl(raw: string, resolver: Resolver = systemResolver): Promise<URL> {
  let url: URL; try { url = new URL(raw); } catch { throw new UnsafeUrlError("Enter a valid absolute URL."); }
  const hostname = dnsName(url.hostname);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || !hostname || hostname === "localhost" || hostname.endsWith(".localhost")) throw new UnsafeUrlError("Only public HTTP/HTTPS URLs are allowed.");
  const addresses = await resolver(hostname).catch(() => { throw new UnsafeUrlError("The hostname could not be resolved."); });
  if (!addresses.length || addresses.some(({ address }) => isForbiddenIp(address))) throw new UnsafeUrlError("Private or unsafe network targets are not allowed.");
  url.hash = ""; return url;
}

export function requestPinned(url: URL, target: ResolvedAddress, maxBytes: number, activeLimits: ScanLimits): Promise<Omit<FetchResult, "finalUrl" | "redirects">> {
  return new Promise((resolve, reject) => {
    let settled = false; const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    const client = url.protocol === "https:" ? https : http;
    const req = client.request({ protocol: url.protocol, hostname: target.address, family: target.family, port: url.port || undefined, path: `${url.pathname}${url.search}`, method: "GET", headers: { Host: url.host, "User-Agent": "AI-Website-Preflight/0.3", Accept: "text/html,application/xml,text/plain,image/*" }, servername: isIP(dnsName(url.hostname)) ? undefined : dnsName(url.hostname), timeout: activeLimits.timeoutMs }, (res) => {
      const declared = Number(res.headers["content-length"] ?? 0); if (declared > maxBytes) { res.destroy(); fail(new Error("Response exceeded the configured size limit.")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > maxBytes) { res.destroy(); req.destroy(); fail(new Error("Response exceeded the configured size limit.")); return; } chunks.push(chunk); });
      res.on("error", fail); res.on("end", () => { if (settled) return; settled = true; resolve({ status: res.statusCode ?? 0, headers: Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value ?? ""])), body: Buffer.concat(chunks).toString("utf8") }); });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out."))); req.on("error", fail); req.end();
  });
}

export function createSafeFetcher(options: { resolver?: Resolver; transport?: Transport; limits?: ScanLimits } = {}): Fetcher {
  const resolver = options.resolver ?? systemResolver; const transport = options.transport ?? requestPinned; const activeLimits = options.limits ?? limits;
  return async (start, maxBytes) => {
    let current = await normalizePublicUrl(start.toString(), resolver); const redirects: string[] = [];
    for (let attempt = 0; attempt <= activeLimits.redirects; attempt++) {
      const addresses = await resolver(dnsName(current.hostname)); if (!addresses.length || addresses.some(({ address }) => isForbiddenIp(address))) throw new UnsafeUrlError("Unsafe DNS target blocked.");
      const result = await transport(current, addresses[0], maxBytes, activeLimits);
      if (result.status < 300 || result.status >= 400 || !result.headers.location) return { ...result, finalUrl: current.toString(), redirects };
      if (attempt === activeLimits.redirects) throw new Error("Redirect limit exceeded.");
      redirects.push(current.toString()); current = await normalizePublicUrl(new URL(result.headers.location, current).toString(), resolver);
    }
    throw new Error("Redirect limit exceeded.");
  };
}
export const fetchPublic = createSafeFetcher();

export function extractInternalLinks(html: string, base: URL) { const found = new Set<string>(); for (const match of html.matchAll(/href\s*=\s*["']([^"'#\s]+)["']/gi)) { try { const url = new URL(match[1], base); url.hash = ""; if (url.origin === base.origin && (url.protocol === "http:" || url.protocol === "https:")) found.add(url.toString()); } catch {} } return [...found]; }
export function parseSitemapUrls(xml: string, siteOrigin: string, maxUrls: number) { const found = new Set<string>(); for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) { try { const url = new URL(match[1]); url.hash = ""; if (url.origin === siteOrigin) found.add(url.toString()); if (found.size >= maxUrls) break; } catch {} } return [...found]; }

export function parseRobotsDirectives(body: string) {
  const directives: RobotsDirective[] = []; let current: RobotsDirective = { userAgents: [], allow: [], disallow: [] }; let hasRules = false;
  const flush = () => { if (current.userAgents.length) directives.push(current); current = { userAgents: [], allow: [], disallow: [] }; hasRules = false; };
  for (const raw of body.split(/\r?\n/)) { const line = raw.replace(/#.*$/, "").trim(); if (!line) continue; const match = line.match(/^([\w-]+)\s*:\s*(.*)$/); if (!match) continue; const name = match[1].toLowerCase(); const value = match[2].trim();
    if (name === "user-agent") { if (hasRules) flush(); current.userAgents.push(value); }
    else if (name === "allow" && current.userAgents.length) { current.allow.push(value); hasRules = true; }
    else if (name === "disallow" && current.userAgents.length) { if (value) current.disallow.push(value); hasRules = true; }
  }
  flush(); return directives;
}

export function sitemapDocumentInfo(body: string, siteOrigin: string, maxUrls: number) {
  const isIndex = /<sitemapindex\b/i.test(body); const parseable = /<(?:urlset|sitemapindex)\b/i.test(body) && /<\/(?:urlset|sitemapindex)>/i.test(body); const locations = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim()); let invalidUrlCount = 0;
  for (const value of locations) try { new URL(value); } catch { invalidUrlCount++; }
  return { parseable, urlCount: locations.length, invalidUrlCount, selectedUrls: isIndex ? [] : parseSitemapUrls(body, siteOrigin, maxUrls) };
}

function evidenceForPage(requestedUrl: string, result: FetchResult, started: number): PageEvidence {
  const finalUrl = new URL(result.finalUrl); const contentType = result.headers["content-type"] ?? ""; const isHtml = !contentType || /(?:text\/html|application\/xhtml\+xml)/i.test(contentType); const facts = isHtml ? analyzeHtml(result.body, finalUrl) : undefined;
  return { requestedUrl, finalUrl: result.finalUrl, status: result.status, redirects: result.redirects, headers: result.headers, contentType: contentType || undefined, title: facts?.title, internalLinks: isHtml ? extractInternalLinks(result.body, finalUrl) : [], facts, durationMs: Date.now() - started };
}

export async function collectScan(scan: ScanEvidence, fetcher: Fetcher = fetchPublic, activeLimits: ScanLimits = limits) {
  const homeStarted = Date.now(); const home = await fetcher(new URL(scan.normalizedUrl), activeLimits.htmlBytes); const homeUrl = new URL(home.finalUrl);
  const homeEvidence = evidenceForPage(scan.normalizedUrl, home, homeStarted); scan.pages.push(homeEvidence);
  try { const robots = await fetcher(new URL("/robots.txt", homeUrl.origin), activeLimits.textBytes); scan.robots = { status: robots.status, discoveredSitemaps: [...robots.body.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1]).slice(0, 10), directives: parseRobotsDirectives(robots.body) }; } catch (error) { scan.robots = { discoveredSitemaps: [], directives: [], error: error instanceof Error ? error.message : "robots fetch failed" }; }
  const declaredSitemap = scan.robots?.discoveredSitemaps.find((value) => { try { return new URL(value).origin === homeUrl.origin; } catch { return false; } }); const sitemapUrl = new URL(declaredSitemap ?? "/sitemap.xml", homeUrl.origin);
  try { const sitemap = await fetcher(sitemapUrl, activeLimits.sitemapBytes); scan.sitemap = { url: sitemap.finalUrl, status: sitemap.status, ...sitemapDocumentInfo(sitemap.body, homeUrl.origin, activeLimits.sitemapUrls) }; } catch (error) { scan.sitemap = { url: sitemapUrl.toString(), selectedUrls: [], parseable: false, urlCount: 0, invalidUrlCount: 0, error: error instanceof Error ? error.message : "sitemap fetch failed" }; }
  const candidates = [...new Set([...(scan.sitemap?.selectedUrls ?? []), ...homeEvidence.internalLinks])].filter((url) => url !== home.finalUrl).slice(0, Math.max(0, activeLimits.pages - 1));
  for (const candidate of candidates) { const started = Date.now(); try { const page = await fetcher(new URL(candidate), activeLimits.htmlBytes); scan.pages.push(evidenceForPage(candidate, page, started)); } catch (error) { scan.pages.push({ requestedUrl: candidate, redirects: [], internalLinks: [], durationMs: Date.now() - started, error: error instanceof Error ? error.message : "Page fetch failed" }); } }
  scan.resources = []; const resourceTargets: ResourceEvidence[] = [{ kind: "favicon", url: homeEvidence.facts?.faviconUrl ?? new URL("/favicon.ico", homeUrl.origin).toString() }];
  if (homeEvidence.facts?.openGraph.image) resourceTargets.push({ kind: "og-image", url: homeEvidence.facts.openGraph.image });
  for (const resource of resourceTargets) try { const response = await fetcher(new URL(resource.url), activeLimits.htmlBytes); scan.resources.push({ ...resource, url: response.finalUrl, status: response.status }); } catch (error) { scan.resources.push({ ...resource, error: error instanceof Error ? error.message : "Resource fetch failed" }); }
  const missingUrl = new URL(`/__preflight_missing_${scan.id.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`, homeUrl.origin);
  try { const response = await fetcher(missingUrl, activeLimits.htmlBytes); scan.missingPage = { url: response.finalUrl, status: response.status }; } catch (error) { scan.missingPage = { url: missingUrl.toString(), error: error instanceof Error ? error.message : "Missing-page probe failed" }; }
  scan.findings = runRules(scan); return scan;
}

const dbPath = process.env.DATABASE_PATH ?? "./data/preflight.db"; mkdirSync(dirname(dbPath), { recursive: true }); const db = new DatabaseSync(dbPath); db.exec("CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, payload TEXT NOT NULL)");
function save(scan: ScanEvidence) { db.prepare("INSERT OR REPLACE INTO scans (id, payload) VALUES (?, ?)").run(scan.id, JSON.stringify(scan)); }
export function getScan(id: string): ScanEvidence | null { const row = db.prepare("SELECT payload FROM scans WHERE id = ?").get(id) as { payload?: string } | undefined; return row?.payload ? JSON.parse(row.payload) as ScanEvidence : null; }
export async function runScan(id: string) { const scan = getScan(id); if (!scan) return; scan.status = "running"; scan.startedAt = new Date().toISOString(); save(scan); try { await collectScan(scan); scan.status = "completed"; } catch (error) { scan.status = "failed"; scan.errorSummary = error instanceof Error ? error.message : "Scan failed"; scan.findings = runRules(scan); } scan.completedAt = new Date().toISOString(); save(scan); }
export async function createScan(submittedUrl: string) { const normalized = await normalizePublicUrl(submittedUrl); const scan: ScanEvidence = { id: randomUUID(), submittedUrl, normalizedUrl: normalized.toString(), status: "queued", createdAt: new Date().toISOString(), pages: [], warnings: [] }; save(scan); void runScan(scan.id); return scan; }
