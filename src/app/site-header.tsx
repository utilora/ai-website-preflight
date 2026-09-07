import Link from "next/link";

export function SiteHeader({ phase = "06" }: { phase?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3" aria-label="Site header">
      <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-cyan-300">AI WEBSITE PREFLIGHT</Link>
      <nav className="flex items-center gap-3 text-sm">
        <Link href="/tools" className="text-slate-300 hover:text-white">Free tools</Link>
        <Link href="/" className="rounded-xl bg-cyan-300 px-3 py-1.5 font-semibold text-slate-950 hover:bg-cyan-200">Run Preflight</Link>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Phase {phase}</span>
      </nav>
    </header>
  );
}
