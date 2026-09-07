"use client";

import { FormEvent, useId, useState } from "react";
import type {
  AiCrawlerToolResult,
  BrokenLinkToolResult,
  MetaToolResult,
  OpenGraphToolResult,
  RobotsToolResult,
  SecurityHeadersToolResult,
  SitemapToolResult,
  ToolId,
  ToolRunSuccess,
} from "@/server/tools/types";

function normalizeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-all text-sm text-slate-200">{value === undefined || value === null || value === "" ? "Not observed" : String(value)}</dd>
    </div>
  );
}

function SitemapResult({ data }: { data: SitemapToolResult }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Sitemap" value={data.sitemapFound ? "Found" : "Not found"} />
        <Field label="Sitemap URL" value={data.sitemapUrl} />
        <Field label="HTTP status" value={data.status} />
        <Field label="Parse status" value={data.parseStatus} />
        <Field label="URL count" value={data.urlCount} />
        <Field label="robots.txt declares sitemap" value={data.robotsDeclaresSitemap ? "Yes" : "No"} />
      </dl>
      {data.exampleUrls.length ? <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Example URLs</p><ul className="mt-2 space-y-1 text-sm break-all text-slate-300">{data.exampleUrls.map((url) => <li key={url}>{url}</li>)}</ul></div> : null}
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function RobotsResult({ data }: { data: RobotsToolResult }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="robots.txt" value={data.found ? "Found" : "Missing"} />
        <Field label="HTTP status" value={data.status} />
        <Field label="User-agent: *" value={data.universal.status} />
        <Field label="Disallow: /" value={data.universal.disallowRoot ? "Present on User-agent: *" : "Not observed on User-agent: *"} />
      </dl>
      {data.sitemapDirectives.length ? <p className="text-sm break-all text-slate-300">Sitemap directives: {data.sitemapDirectives.join(", ")}</p> : <p className="text-sm text-slate-400">No Sitemap directives observed.</p>}
      <ul className="text-sm text-slate-300">{data.crawlers.map((item) => <li key={item.bot}>{item.bot}: {item.status}</li>)}</ul>
      {data.preview ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950/70 p-4 text-xs text-slate-300">{data.preview}</pre> : null}
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function MetaResult({ data }: { data: MetaToolResult }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Observed</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="HTTP status" value={data.status} />
          <Field label="Title" value={data.observed.title} />
          <Field label="Meta description" value={data.observed.description} />
          <Field label="Canonical" value={data.observed.canonical} />
          <Field label="Robots meta" value={data.observed.robotsMeta} />
          <Field label="Viewport" value={data.observed.viewport} />
          <Field label="H1" value={data.observed.h1.join(" · ") || undefined} />
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Potential issues</h3>
        {data.issues.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">{data.issues.map((item) => <li key={item.label}><span className="font-medium text-white">{item.label}.</span> {item.detail}</li>)}</ul> : <p className="mt-3 text-sm text-slate-400">No conservative issues were observed on this page.</p>}
      </div>
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function OpenGraphResult({ data }: { data: OpenGraphToolResult }) {
  const title = data.openGraph.title || data.twitter.title || "No title observed";
  const description = data.openGraph.description || data.twitter.description || "No description observed";
  const imageState = data.imageCheck?.error || (data.imageCheck?.status ? `HTTP ${data.imageCheck.status}` : "Not checked");
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
        <div className="flex h-36 items-center justify-center bg-slate-800 px-4 text-center text-sm text-slate-400">Image not rendered in this preview. Server check: {imageState}{data.imageCheck?.contentType ? ` · ${data.imageCheck.contentType}` : ""}</div>
        <div className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{data.finalUrl ? new URL(data.finalUrl).hostname : "example.com"}</p>
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </div>
      <p className="text-sm text-slate-400">Preview is approximate. Actual rendering varies by platform.</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="og:title" value={data.openGraph.title} />
        <Field label="og:description" value={data.openGraph.description} />
        <Field label="og:image" value={data.openGraph.image} />
        <Field label="og:url" value={data.openGraph.url} />
        <Field label="og:type" value={data.openGraph.type} />
        <Field label="twitter:card" value={data.twitter.card} />
        <Field label="twitter:title" value={data.twitter.title} />
        <Field label="twitter:description" value={data.twitter.description} />
        <Field label="twitter:image" value={data.twitter.image} />
      </dl>
      {data.issues.length ? <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">{data.issues.map((item) => <li key={item.label}>{item.label}: {item.detail}</li>)}</ul> : null}
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function SecurityResult({ data }: { data: SecurityHeadersToolResult }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 pr-4">Header</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Value</th></tr></thead>
          <tbody>{data.headers.map((header) => (
            <tr key={header.name} className="border-t border-slate-800 align-top">
              <td className="py-3 pr-4 text-slate-200">{header.name}</td>
              <td className="py-3 pr-4">{header.present ? "Present" : "Not observed"}</td>
              <td className="py-3 break-all text-slate-400">{header.value ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Field label="CSP frame-ancestors" value={data.frameAncestors} />
      <p className="text-sm text-slate-400">{data.disclaimer}</p>
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function BrokenResult({ data }: { data: BrokenLinkToolResult }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">Checked {data.summary.checked} · working {data.summary.working} · broken {data.summary.broken} · skipped {data.summary.skipped}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 pr-4">URL</th><th className="pb-2 pr-4">State</th><th className="pb-2">Status</th></tr></thead>
          <tbody>{data.checked.map((item) => (
            <tr key={item.url} className="border-t border-slate-800">
              <td className="py-3 pr-4 break-all text-slate-200">{item.url}</td>
              <td className="py-3 pr-4">{item.state}</td>
              <td className="py-3">{item.status ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {data.skipped.length ? <p className="text-sm text-slate-400">{data.skipped.filter((item) => item.reason === "external").length} external and {data.skipped.filter((item) => item.reason === "limit").length} extra internal links were skipped.</p> : null}
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function AiResult({ data }: { data: AiCrawlerToolResult }) {
  return (
    <div className="space-y-4">
      <Field label="robots.txt" value={data.found ? "Found" : "Missing"} />
      <Field label="User-agent: *" value={data.universal} />
      <ul className="text-sm text-slate-300">{data.crawlers.map((item) => <li key={item.bot}>{item.bot}: {item.status}</li>)}</ul>
      <p className="text-sm text-slate-400">{data.note}</p>
      {data.preview ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950/70 p-4 text-xs text-slate-300">{data.preview}</pre> : null}
      {data.issue ? <p className="text-sm text-amber-300">{data.issue.message}</p> : null}
    </div>
  );
}

function ResultView({ payload }: { payload: ToolRunSuccess }) {
  switch (payload.tool) {
    case "sitemap-checker": return <SitemapResult data={payload.data as SitemapToolResult} />;
    case "robots-txt-checker": return <RobotsResult data={payload.data as RobotsToolResult} />;
    case "meta-tag-checker": return <MetaResult data={payload.data as MetaToolResult} />;
    case "open-graph-checker": return <OpenGraphResult data={payload.data as OpenGraphToolResult} />;
    case "security-headers-checker": return <SecurityResult data={payload.data as SecurityHeadersToolResult} />;
    case "broken-link-checker": return <BrokenResult data={payload.data as BrokenLinkToolResult} />;
    case "ai-crawler-checker": return <AiResult data={payload.data as AiCrawlerToolResult} />;
  }
}

export function ToolForm({ tool, name, loading }: { tool: ToolId; name: string; loading: string }) {
  const inputId = useId();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolRunSuccess | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = normalizeInput(url);
    if (!submitted) { setError("Enter a valid public http(s) URL."); return; }
    setPending(true); setError(null); setResult(null);
    try {
      const response = await fetch(`/api/tools/${tool}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: submitted }) });
      const payload = await response.json() as ToolRunSuccess | { ok?: false; error?: { message?: string } };
      if (!response.ok || !("ok" in payload) || payload.ok !== true) {
        setError((payload as { error?: { message?: string } }).error?.message ?? "Could not complete this check.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Could not complete this check.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6" aria-label={`${name} form`}>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor={inputId} className="text-sm font-medium text-slate-200">Website URL</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id={inputId} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#0b1627] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" inputMode="url" autoComplete="url" />
          <button type="submit" disabled={pending} aria-busy={pending} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-70">Check</button>
        </div>
      </form>
      <div className="mt-4 min-h-6" aria-live={error ? "assertive" : "polite"}>
        {pending ? <p className="text-sm text-cyan-200">{loading}</p> : null}
        {error ? <p className="text-sm text-amber-300" role="alert">{error}</p> : null}
      </div>
      {result ? <div className="mt-6 border-t border-slate-800 pt-6 overflow-x-auto"><ResultView payload={result} /></div> : null}
    </section>
  );
}
