import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const limits = { pages: 8, redirects: 4, timeoutMs: 10_000, htmlBytes: 1_000_000, textBytes: 256_000, sitemapBytes: 512_000, sitemapUrls: 50 } as const;
export type ScanStatus = "queued" | "running" | "completed" | "failed";
export type PageEvidence = { requestedUrl: string; finalUrl?: string; status?: number; redirects: string[]; headers?: Record<string, string>; contentType?: string; title?: string; internalLinks: string[]; durationMs: number; error?: string };
export type ScanEvidence = { id: string; submittedUrl: string; normalizedUrl: string; status: ScanStatus; createdAt: string; startedAt?: string; completedAt?: string; errorSummary?: string; pages: PageEvidence[]; robots?: { status?: number; discoveredSitemaps: string[]; error?: string }; sitemap?: { status?: number; selectedUrls: string[]; error?: string }; warnings: string[] };

export class UnsafeUrlError extends Error {}
const dbPath = process.env.DATABASE_PATH ?? "./data/preflight.db";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, payload TEXT NOT NULL)");
function save(scan: ScanEvidence) { db.prepare("INSERT OR REPLACE INTO scans (id, payload) VALUES (?, ?)").run(scan.id, JSON.stringify(scan)); }
export function getScan(id: string): ScanEvidence | null { const row = db.prepare("SELECT payload FROM scans WHERE id = ?").get(id) as { payload?: string } | undefined; return row?.payload ? JSON.parse(row.payload) as ScanEvidence : null; }

export function isForbiddenIp(value: string): boolean {
  const ip = value.toLowerCase();
  if (ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb")) return true;
  const mapped = ip.match(/^::ffff:(.+)$/); if (mapped) return isForbiddenIp(mapped[1]);
  const octets = ip.split(".").map(Number); if (octets.length !== 4 || octets.some(Number.isNaN)) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
export async function normalizePublicUrl(raw: string): Promise<URL> {
  let url: URL; try { url = new URL(raw); } catch { throw new UnsafeUrlError("Enter a valid absolute URL."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname || url.hostname.toLowerCase() === "localhost" || url.hostname.toLowerCase().endsWith(".localhost")) throw new UnsafeUrlError("Only public HTTP/HTTPS URLs are allowed.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => { throw new UnsafeUrlError("The hostname could not be resolved."); });
  if (!addresses.length || addresses.some((entry) => isForbiddenIp(entry.address))) throw new UnsafeUrlError("Private or unsafe network targets are not allowed.");
  url.hash = ""; return url;
}
async function request(url: URL, maxBytes: number): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const resolved = await lookup(url.hostname, { all: true, verbatim: true }); const target = resolved.find((entry) => !isForbiddenIp(entry.address));
  if (!target || resolved.some((entry) => isForbiddenIp(entry.address))) throw new UnsafeUrlError("Unsafe DNS target blocked.");
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http; const req = client.request({ protocol: url.protocol, hostname: target.address, port: url.port || undefined, path: `${url.pathname}${url.search}`, method: "GET", headers: { Host: url.host, "User-Agent": "AI-Website-Preflight/0.2", Accept: "text/html,application/xml,text/plain" }, servername: url.hostname, timeout: limits.timeoutMs }, (res) => {
      const chunks: Buffer[] = []; let size = 0; res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > maxBytes) { req.destroy(new Error("Response exceeded the configured size limit.")); return; } chunks.push(chunk); });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v ?? ""])), body: Buffer.concat(chunks).toString("utf8") }));
    }); req.on("timeout", () => req.destroy(new Error("Request timed out."))); req.on("error", reject); req.end();
  });
}
export async function fetchPublic(start: URL, maxBytes: number) {
  let current = start; const redirects: string[] = [];
  for (let attempt = 0; attempt <= limits.redirects; attempt++) { const result = await request(current, maxBytes); if (result.status < 300 || result.status >= 400 || !result.headers.location) return { ...result, finalUrl: current.toString(), redirects }; if (attempt === limits.redirects) throw new Error("Redirect limit exceeded."); redirects.push(current.toString()); current = await normalizePublicUrl(new URL(result.headers.location, current).toString()); }
  throw new Error("Redirect limit exceeded.");
}
function links(html: string, base: URL) { const found = new Set<string>(); for (const match of html.matchAll(/href\s*=\s*["']([^"'#\s]+)["']/gi)) { try { const url = new URL(match[1], base); if (url.origin === base.origin && /^https?:$/.test(url.protocol)) { url.hash = ""; found.add(url.toString()); } } catch {} } return [...found]; }
function title(html: string) { return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, " ").trim(); }
export async function runScan(id: string) {
  const scan = getScan(id); if (!scan) return; scan.status = "running"; scan.startedAt = new Date().toISOString(); save(scan);
  try { const home = await fetchPublic(new URL(scan.normalizedUrl), limits.htmlBytes); const homeEvidence: PageEvidence = { requestedUrl: scan.normalizedUrl, finalUrl: home.finalUrl, status: home.status, redirects: home.redirects, headers: home.headers, contentType: home.headers["content-type"], title: title(home.body), internalLinks: links(home.body, new URL(home.finalUrl)), durationMs: 0 }; scan.pages.push(homeEvidence);
    const origin = new URL(home.finalUrl).origin; const robotsUrl = new URL("/robots.txt", origin); try { const robots = await fetchPublic(robotsUrl, limits.textBytes); const declared = [...robots.body.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]); scan.robots = { status: robots.status, discoveredSitemaps: declared }; } catch (error) { scan.robots = { discoveredSitemaps: [], error: error instanceof Error ? error.message : "robots fetch failed" }; }
    const sitemapUrl = scan.robots?.discoveredSitemaps[0] ?? `${origin}/sitemap.xml`; try { const sitemap = await fetchPublic(await normalizePublicUrl(sitemapUrl), limits.sitemapBytes); const selectedUrls = [...sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]).filter((value, index, all) => all.indexOf(value) === index).slice(0, limits.sitemapUrls); scan.sitemap = { status: sitemap.status, selectedUrls }; } catch (error) { scan.sitemap = { selectedUrls: [], error: error instanceof Error ? error.message : "sitemap fetch failed" }; }
    const candidates = [...new Set([...(scan.sitemap?.selectedUrls ?? []), ...homeEvidence.internalLinks])].filter((value) => value !== home.finalUrl).slice(0, limits.pages - 1);
    for (const candidate of candidates) try { const started = Date.now(); const page = await fetchPublic(await normalizePublicUrl(candidate), limits.htmlBytes); scan.pages.push({ requestedUrl: candidate, finalUrl: page.finalUrl, status: page.status, redirects: page.redirects, headers: page.headers, contentType: page.headers["content-type"], title: title(page.body), internalLinks: links(page.body, new URL(page.finalUrl)), durationMs: Date.now() - started }); } catch (error) { scan.pages.push({ requestedUrl: candidate, redirects: [], internalLinks: [], durationMs: 0, error: error instanceof Error ? error.message : "Page fetch failed" }); }
    scan.status = "completed"; scan.completedAt = new Date().toISOString(); save(scan);
  } catch (error) { scan.status = "failed"; scan.completedAt = new Date().toISOString(); scan.errorSummary = error instanceof Error ? error.message : "Scan failed"; save(scan); }
}
export async function createScan(submittedUrl: string) { const normalized = await normalizePublicUrl(submittedUrl); const scan: ScanEvidence = { id: randomUUID(), submittedUrl, normalizedUrl: normalized.toString(), status: "queued", createdAt: new Date().toISOString(), pages: [], warnings: [] }; save(scan); void runScan(scan.id); return scan; }
