import Link from "next/link";
import { HomeScanForm } from "./home-scan-form";
import { SiteHeader } from "./site-header";
import { appOrigin } from "@/server/site";
import { TOOLS } from "@/server/tools/registry";
import type { Metadata } from "next";

const checks = ["Indexability", "Metadata", "Broken links", "Accessibility basics", "Security headers"];
const featured = TOOLS.filter((tool) => tool.featured);

export const metadata: Metadata = {
  title: "AI Website Preflight",
  description: "Run a preflight check for SEO, broken links, security basics, social sharing and launch mistakes — then get a fix pack for Codex.",
  alternates: { canonical: `${appOrigin()}/` },
};

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f]">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
        <SiteHeader />
        <section className="grid min-h-[70vh] items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="mb-5 text-sm font-medium text-cyan-300">For AI-built websites</p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">Is your AI-built website actually ready to launch?</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Run a preflight check before you publish. Review a transparent Ready Score and reproducible findings for discovery, trust, accessibility basics, and launch mistakes.</p>
            <HomeScanForm />
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Check categories">{checks.map((check) => <li key={check} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300">{check}</li>)}</ul>
          </div>
          <section className="rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 to-[#0a1423] p-6 shadow-2xl shadow-slate-950/40" aria-label="Example report">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Example report</p>
            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="text-4xl font-semibold text-amber-100">84 <span className="text-base text-amber-300">/ 100</span></p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Almost ready</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">Every deduction is tied to a deterministic rule and reproducible evidence.</p>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-400">Ready Score summarizes automated checks on sampled pages. It is not a complete security, compliance, or quality assessment.</p>
          </section>
        </section>
        <section className="border-t border-slate-800 py-16" aria-labelledby="free-checks-heading">
          <p className="text-sm font-medium text-cyan-300">Free website checks</p>
          <h2 id="free-checks-heading" className="mt-3 text-3xl font-semibold text-white">Check one thing without a full preflight</h2>
          <p className="mt-4 max-w-2xl text-slate-300">Focused tools for sitemap, meta tags, broken links, and AI crawler rules. Each check uses the same public-URL safety controls as Full Preflight.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">{featured.map((tool) => (
            <li key={tool.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{tool.summary}</p>
              <Link href={`/tools/${tool.id}`} className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open {tool.name}</Link>
            </li>
          ))}</ul>
          <p className="mt-8"><Link href="/tools" className="font-semibold text-cyan-300 hover:text-cyan-200">View all free tools</Link></p>
        </section>
      </div>
    </main>
  );
}
