import Link from "next/link";
import { SiteHeader } from "../site-header";
import { ToolForm } from "./tool-form";
import { appOrigin } from "@/server/site";
import { getTool, relatedTools } from "@/server/tools/registry";
import { toolPageMetadata } from "@/server/tools/page-metadata";
import type { ToolId } from "@/server/tools/types";

export { toolPageMetadata };

export function ToolLanding({ id }: { id: ToolId }) {
  const tool = getTool(id);
  const related = relatedTools(id);
  const canonical = `${appOrigin()}/tools/${id}`;
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: tool.h1, applicationCategory: "DeveloperApplication", url: canonical, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: tool.faqs.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
  ];
  return (
    <main className="min-h-screen bg-[#07111f]">
      <div className="mx-auto max-w-3xl px-6 py-6 sm:px-10">
        <SiteHeader />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <section className="py-12">
          <p className="text-sm font-medium text-cyan-300">Free website check</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{tool.h1}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">{tool.summary}</p>
        </section>
        <ToolForm tool={id} name={tool.name} loading={tool.loading} />
        <section className="mt-12 space-y-10">
          <div>
            <h2 className="text-2xl font-semibold text-white">What this checks</h2>
            <p className="mt-3 leading-7 text-slate-300">{tool.what}</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Why it matters</h2>
            <p className="mt-3 leading-7 text-slate-300">{tool.why}</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">How to fix common issues</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-300">{tool.how.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">FAQ</h2>
            <dl className="mt-4 space-y-5">{tool.faqs.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-white">{item.question}</dt>
                <dd className="mt-2 leading-7 text-slate-300">{item.answer}</dd>
              </div>
            ))}</dl>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Related tools</h2>
            <ul className="mt-4 space-y-2">{related.map((item) => <li key={item.id}><Link className="font-semibold text-cyan-300 hover:text-cyan-200" href={`/tools/${item.id}`}>{item.name}</Link> — {item.summary}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-xl font-semibold text-white">Need the full launch check?</h2>
            <p className="mt-2 leading-7 text-slate-300">Run AI Website Preflight for a Ready Score, grouped findings, and a Fix Pack you can copy for Codex.</p>
            <Link href="/" className="mt-4 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 hover:bg-cyan-200">Run Full Website Preflight</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
