import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "../site-header";
import { appOrigin } from "@/server/site";
import { TOOLS } from "@/server/tools/registry";

const canonical = `${appOrigin()}/tools`;

export const metadata: Metadata = {
  title: "Free Website Checks | AI Website Preflight",
  description: "Free sitemap, robots.txt, meta tag, Open Graph, security header, broken link, and AI crawler checkers for AI-built websites.",
  alternates: { canonical },
  robots: { index: true, follow: true },
};

export default function ToolsHubPage() {
  return (
    <main className="min-h-screen bg-[#07111f]">
      <div className="mx-auto max-w-4xl px-6 py-6 sm:px-10">
        <SiteHeader />
        <section className="py-12">
          <p className="text-sm font-medium text-cyan-300">Free website checks</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Seven focused checks before you launch</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">Each tool answers one question on a public URL. They reuse the same SSRF-safe fetch as Full Website Preflight and do not require an account.</p>
        </section>
        <ul className="grid gap-4 sm:grid-cols-2">{TOOLS.map((tool) => (
          <li key={tool.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">{tool.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{tool.summary}</p>
            <Link href={`/tools/${tool.id}`} className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open {tool.name}</Link>
          </li>
        ))}</ul>
        <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-xl font-semibold text-white">Need the full launch check?</h2>
          <p className="mt-2 leading-7 text-slate-300">Full Website Preflight samples multiple pages, scores readiness, and generates a Fix Pack for your coding agent.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-200">Run Full Website Preflight</Link>
        </section>
      </div>
    </main>
  );
}
