"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Finding } from "../../../server/rules";

type Scan = { status: string; normalizedUrl: string; pages: { status?: number; error?: string }[]; robots?: { status?: number }; sitemap?: { status?: number; selectedUrls: string[] }; findings?: Finding[]; errorSummary?: string };
const severityStyle: Record<Finding["severity"], string> = { critical: "border-red-400/40 bg-red-400/10 text-red-200", high: "border-orange-400/40 bg-orange-400/10 text-orange-200", medium: "border-amber-400/40 bg-amber-400/10 text-amber-200", low: "border-cyan-400/30 bg-cyan-400/5 text-cyan-100", info: "border-slate-600 bg-slate-800 text-slate-200" };

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const [scan, setScan] = useState<Scan | null>(null); const [id, setId] = useState("");
  useEffect(() => { void params.then(({ id: scanId }) => setId(scanId)); }, [params]);
  useEffect(() => { if (!id) return; const poll = async () => { const response = await fetch(`/api/scans/${id}`, { cache: "no-store" }); if (response.ok) setScan(await response.json()); }; void poll(); const timer = setInterval(poll, 1500); return () => clearInterval(timer); }, [id]);
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-16"><section className="rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-sm font-medium text-cyan-300">PHASE 03 EVIDENCE REPORT</p><h1 className="mt-3 text-4xl font-semibold text-white">{scan?.status ?? "queued"}</h1>{scan ? <div className="mt-6 grid gap-2 text-slate-300 sm:grid-cols-2"><p className="break-all sm:col-span-2">{scan.normalizedUrl}</p><p>Fetched pages: {scan.pages.length}</p><p>Findings: {scan.findings?.length ?? 0}</p><p>robots.txt: {scan.robots?.status ?? "not available"}</p><p>Sitemap: {scan.sitemap?.status ?? "not available"} ({scan.sitemap?.selectedUrls.length ?? 0} URLs selected)</p>{scan.errorSummary ? <p className="text-amber-300 sm:col-span-2">{scan.errorSummary}</p> : null}</div> : <p className="mt-5 text-slate-300">Creating a limited, safe scan task...</p>}</section>
    {scan?.findings?.length ? <section className="mt-8 space-y-4" aria-label="Scan findings"><h2 className="text-2xl font-semibold text-white">Verified observations</h2>{scan.findings.map((item, index) => <article key={`${item.ruleId}-${item.affectedUrl}-${index}`} className={`rounded-2xl border p-5 ${severityStyle[item.severity]}`}><div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-current px-2 py-0.5 text-xs font-bold uppercase">{item.severity}</span><p className="text-xs font-semibold uppercase tracking-wide opacity-80">{item.ruleId}</p></div><h3 className="mt-3 text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6">{item.message}</p><dl className="mt-4 space-y-2 text-sm"><div><dt className="font-semibold">Evidence</dt><dd className="mt-1 break-words opacity-90">{item.evidence}</dd></div><div><dt className="font-semibold">URL</dt><dd className="mt-1 break-all opacity-90">{item.affectedUrl}</dd></div></dl></article>)}</section> : null}
    <Link href="/" className="mt-8 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950">Back to home</Link></main>;
}
