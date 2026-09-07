"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function HomeScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function startScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) { setMessage("Enter a public website URL to continue."); return; }
    setMessage(null);
    setPending(true);
    void fetch("/api/scans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim() }) })
      .then(async (response) => {
        const payload = await response.json() as { id?: string; error?: string };
        if (!response.ok || !payload.id) { setMessage(payload.error ?? "Unable to start scan."); setPending(false); return; }
        router.push(`/scan/${payload.id}`);
      })
      .catch(() => { setMessage("Unable to start scan."); setPending(false); });
  }

  return (
    <form className="mt-9 max-w-2xl" onSubmit={startScan} noValidate>
      <label className="sr-only" htmlFor="website-url">Public website URL</label>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 shadow-2xl shadow-cyan-950/30 sm:flex-row">
        <input id="website-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#0b1627] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" inputMode="url" autoComplete="url" />
        <button type="submit" disabled={pending} aria-busy={pending} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-70">{pending ? "Starting…" : "Run Preflight"}</button>
      </div>
      <p className="mt-3 text-sm text-slate-400">Only public pages will be scanned. We never modify your website.</p>
      {message ? <p className="mt-3 text-sm text-amber-300" role="alert">{message}</p> : null}
    </form>
  );
}
