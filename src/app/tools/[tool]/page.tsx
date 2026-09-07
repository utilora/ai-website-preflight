import Link from "next/link";

export default async function ToolPlaceholderPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16"><section className="w-full rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-sm font-medium text-cyan-300">TOOL ROUTE PLACEHOLDER</p><h1 className="mt-3 text-4xl font-semibold text-white">{tool}</h1><p className="mt-5 leading-7 text-slate-300">Independent SEO tools remain out of the current Phase 05.5 scope. This route is intentionally a lightweight placeholder.</p><Link href="/" className="mt-8 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950">Back to home</Link></section></main>;
}
