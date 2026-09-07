"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FindingGroup, ReadinessStatus, ResultGroups, ScoreBreakdown } from "../../../server/scoring";

type ScanStatus = "queued" | "running" | "completed" | "failed";
type Scan = {
  id: string;
  status: ScanStatus;
  submittedUrl: string;
  normalizedUrl: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorSummary?: string;
  pages: { status?: number; error?: string }[];
  score?: ScoreBreakdown;
  resultGroups?: ResultGroups;
};

const statusLabel: Record<ReadinessStatus, string> = { ready: "READY TO LAUNCH", "almost-ready": "ALMOST READY", "not-ready": "NOT READY" };
const statusStyle: Record<ReadinessStatus, string> = { ready: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200", "almost-ready": "border-amber-400/40 bg-amber-400/10 text-amber-100", "not-ready": "border-orange-400/40 bg-orange-400/10 text-orange-100" };
const groupStyle = { mustFix: "border-orange-400/30 bg-orange-400/5", warnings: "border-amber-400/25 bg-amber-400/5", info: "border-slate-700 bg-slate-900" };

function domain(url: string) { try { return new URL(url).hostname; } catch { return url; } }
function formatTime(value?: string) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not completed"; }
function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text; textarea.setAttribute("readonly", ""); textarea.style.position = "fixed"; textarea.style.opacity = "0";
  document.body.appendChild(textarea); textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}
function summary(score: ScoreBreakdown) {
  const mustFixCount = score.criticalCount + score.highCount;
  if (mustFixCount > 0) return `${mustFixCount} issue${mustFixCount === 1 ? "" : "s"} should be reviewed before launch.`;
  return "No launch-blocking issues were detected in the sampled pages.";
}

function FindingSection({ title, description, groups, tone }: { title: string; description: string; groups: FindingGroup[]; tone: keyof typeof groupStyle }) {
  return <section className="mt-10" aria-labelledby={`${tone}-heading`}><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id={`${tone}-heading`} className="text-2xl font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div><span className="text-sm text-slate-400">{groups.length} rule{groups.length === 1 ? "" : "s"}</span></div>
    {groups.length === 0 ? <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">No observations in this group.</p> : <div className="mt-4 space-y-4">{groups.map((group) => <article key={group.ruleId} className={`rounded-2xl border p-5 ${groupStyle[tone]}`}><div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-current px-2 py-0.5 text-xs font-bold uppercase text-slate-200">{group.severity}</span><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.ruleId}</span></div><h3 className="mt-3 text-lg font-semibold text-white">{group.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{group.message}</p><p className="mt-3 text-sm font-medium text-slate-200">{group.affectedCount} affected URL{group.affectedCount === 1 ? "" : "s"}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-cyan-300">View evidence</summary><div className="mt-3 space-y-3">{group.findings.map((finding, index) => <dl key={`${finding.affectedUrl}-${index}`} className="rounded-xl bg-slate-950/50 p-4 text-sm"><div><dt className="font-semibold text-slate-300">Evidence</dt><dd className="mt-1 break-words text-slate-400">{finding.evidence}</dd></div><div className="mt-3"><dt className="font-semibold text-slate-300">Affected URL</dt><dd className="mt-1 break-all text-slate-400">{finding.affectedUrl}</dd></div></dl>)}</div></details></article>)}</div>}
  </section>;
}

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [id, setId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [fixPack, setFixPack] = useState<string | null>(null);
  const [generatingFixPack, setGeneratingFixPack] = useState(false);
  const [fixPackError, setFixPackError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => { void params.then(({ id: scanId }) => setId(scanId)); }, [params]);
  useEffect(() => {
    if (!id) return;
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch(`/api/scans/${id}`, { cache: "no-store" });
        if (!response.ok) { if (active) setLoadError(response.status === 404 ? "Scan report not found." : "Unable to load this scan report."); return; }
        const payload = await response.json() as Scan;
        if (!active) return;
        setScan(payload); setLoadError(null);
        if (payload.status === "queued" || payload.status === "running") timer = setTimeout(poll, 1500);
      } catch { if (active) setLoadError("Unable to load this scan report."); }
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id]);

  async function scanAgain() {
    if (!scan || rescanning) return;
    setRescanning(true); setRescanError(null);
    try {
      const response = await fetch("/api/scans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: scan.normalizedUrl || scan.submittedUrl }) });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "Unable to start a new scan.");
      router.push(`/scan/${payload.id}`);
    } catch (error) { setRescanError(error instanceof Error ? error.message : "Unable to start a new scan."); setRescanning(false); }
  }

  async function createFixPack() {
    if (!scan || generatingFixPack) return;
    setGeneratingFixPack(true); setFixPackError(null); setCopyState("idle");
    try {
      const response = await fetch(`/api/scans/${scan.id}/fix-pack`, { cache: "no-store" });
      const content = await response.text();
      if (!response.ok) { let message = "Unable to generate the Fix Pack."; try { message = (JSON.parse(content) as { error?: string }).error ?? message; } catch {} throw new Error(message); }
      setFixPack(content);
    } catch (error) { setFixPackError(error instanceof Error ? error.message : "Unable to generate the Fix Pack."); }
    finally { setGeneratingFixPack(false); }
  }

  async function copyForCodex() {
    if (!scan || !fixPack) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(fixPack);
      else if (!fallbackCopy(fixPack)) throw new Error("Copy command was unavailable.");
      setCopyState("copied");
      void fetch(`/api/scans/${scan.id}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "fix_pack_copied" }) });
    } catch { setCopyState("failed"); }
  }

  if (loadError) return <main className="mx-auto min-h-screen max-w-4xl px-6 py-16"><section className="rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-sm font-medium text-cyan-300">SCAN REPORT</p><h1 className="mt-3 text-3xl font-semibold text-white">{loadError}</h1><Link href="/" className="mt-8 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950">Back to home</Link></section></main>;
  if (!scan || scan.status === "queued" || scan.status === "running") {
    const state = scan?.status === "running" ? "Scanning" : "Queued";
    return <main className="mx-auto min-h-screen max-w-4xl px-6 py-16"><section className="rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-sm font-medium text-cyan-300">PHASE 05 PREFLIGHT REPORT</p><h1 className="mt-3 text-4xl font-semibold text-white">{state}</h1><p className="mt-4 text-slate-300">{state === "Queued" ? "Your scan is waiting to start." : "Public pages are being checked. This report updates automatically."}</p>{scan ? <p className="mt-4 break-all text-sm text-slate-400">{scan.normalizedUrl}</p> : null}</section></main>;
  }

  if (scan.status === "failed") return <main className="mx-auto min-h-screen max-w-4xl px-6 py-16"><section className="rounded-3xl border border-orange-400/30 bg-slate-900 p-8"><p className="text-sm font-medium text-orange-300">SCAN FAILED</p><h1 className="mt-3 text-4xl font-semibold text-white">Scan could not be completed.</h1><p className="mt-4 text-slate-300">{scan.errorSummary?.slice(0, 240) || "The scan stopped before a result could be calculated."}</p><dl className="mt-6 text-sm"><dt className="font-semibold text-slate-300">Submitted URL</dt><dd className="mt-1 break-all text-slate-400">{scan.submittedUrl}</dd></dl><div className="mt-8 flex flex-wrap gap-3"><button onClick={scanAgain} disabled={rescanning} className="rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-60">{rescanning ? "Starting..." : "Scan Again"}</button><Link href="/" className="rounded-xl border border-slate-600 px-4 py-2.5 font-semibold text-slate-200">Back to home</Link></div>{rescanError ? <p className="mt-4 text-sm text-orange-300" role="alert">{rescanError}</p> : null}</section></main>;

  const score = scan.score;
  const groups = scan.resultGroups;
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-16"><section className="rounded-3xl border border-slate-700 bg-slate-900 p-8"><div className="flex flex-wrap items-start justify-between gap-8"><div><p className="text-sm font-medium text-cyan-300">PHASE 05 PREFLIGHT REPORT</p><h1 className="mt-3 text-4xl font-semibold text-white">{domain(scan.normalizedUrl)}</h1><p className="mt-3 break-all text-sm text-slate-400">{scan.normalizedUrl}</p><p className="mt-2 text-sm text-slate-400">Completed {formatTime(scan.completedAt)} · {scan.pages.length} sampled page{scan.pages.length === 1 ? "" : "s"}</p></div>{score ? <div className={`min-w-56 rounded-2xl border p-5 ${statusStyle[score.status]}`}><p className="text-xs font-semibold uppercase tracking-[0.16em]">Ready Score</p><p className="mt-2 text-5xl font-semibold">{score.score}<span className="text-xl opacity-70"> / 100</span></p><p className="mt-3 text-sm font-bold">{statusLabel[score.status]}</p></div> : null}</div>
    {score ? <><p className="mt-8 text-lg text-slate-200">{summary(score)}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Ready Score summarizes the deterministic automated pre-launch checks completed in this scan. It is not a complete security, compliance, or quality assessment.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={scanAgain} disabled={rescanning} className="rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-60">{rescanning ? "Starting..." : "Scan Again"}</button><Link href="/" className="rounded-xl border border-slate-600 px-4 py-2.5 font-semibold text-slate-200">Back to home</Link></div>{rescanError ? <p className="mt-4 text-sm text-orange-300" role="alert">{rescanError}</p> : null}</> : <p className="mt-8 text-amber-200">This completed legacy scan has no stored score. Run it again to generate a Phase 04 report.</p>}
  </section>
  {score ? <section className="mt-8 rounded-3xl border border-cyan-400/25 bg-slate-900 p-8" aria-labelledby="fix-pack-heading"><p className="text-sm font-medium text-cyan-300">FIX WITH CODEX</p><h2 id="fix-pack-heading" className="mt-2 text-2xl font-semibold text-white">Fix these issues with your coding agent</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Generate a structured Markdown task list from the verified findings in this scan.</p>{!fixPack ? <button onClick={createFixPack} disabled={generatingFixPack} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-60">{generatingFixPack ? "Generating..." : "Generate Fix Pack"}</button> : <><div className="mt-6 flex flex-wrap gap-3"><button onClick={copyForCodex} className="rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950">{copyState === "copied" ? "Copied" : "Copy for Codex"}</button><a href={`/api/scans/${scan.id}/fix-pack?download=1`} className="rounded-xl border border-slate-600 px-4 py-2.5 font-semibold text-slate-200">Download Markdown</a></div><pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-700 bg-slate-950 p-5 text-xs leading-6 text-slate-300">{fixPack}</pre></>}{fixPackError ? <p className="mt-4 text-sm text-orange-300" role="alert">{fixPackError}</p> : null}{copyState === "failed" ? <p className="mt-4 text-sm text-orange-300" role="alert">Copy failed. Select the Markdown below and copy it manually.</p> : null}<p className="mt-5 text-sm text-slate-400">The Fix Pack does not modify your code. Review all changes before deployment.</p></section> : null}
  {score ? <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/70 p-8"><h2 className="text-2xl font-semibold text-white">Score deductions</h2><p className="mt-2 text-sm text-slate-400">Repeated findings are capped per rule while the true affected URL count remains visible.</p>{score.deductions.filter((item) => item.deduction > 0).length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-slate-400"><tr><th className="pb-3">Rule</th><th className="pb-3">Severity</th><th className="pb-3">Affected</th><th className="pb-3">Counted</th><th className="pb-3 text-right">Deduction</th></tr></thead><tbody>{score.deductions.filter((item) => item.deduction > 0).map((item) => <tr key={item.ruleId} className="border-t border-slate-800 text-slate-300"><td className="py-3 pr-4">{item.ruleId}</td><td className="py-3 pr-4 uppercase">{item.severity}</td><td className="py-3 pr-4">{item.affectedCount}</td><td className="py-3 pr-4">{item.countedOccurrences}</td><td className="py-3 text-right">-{item.deduction}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-slate-300">No points were deducted.</p>}</section> : null}
  {groups ? <><FindingSection title="Must Fix" description="Critical and high-severity observations." groups={groups.mustFix} tone="mustFix"/><FindingSection title="Warnings" description="Medium and low-severity observations." groups={groups.warnings} tone="warnings"/><FindingSection title="Info" description="Informational observations that do not deduct points." groups={groups.info} tone="info"/></> : null}</main>;
}
