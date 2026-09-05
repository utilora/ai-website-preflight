import Link from "next/link";

export default async function ScanPlaceholderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ url?: string }> }) {
  const [{ id }, { url }] = await Promise.all([params, searchParams]);
  return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16"><section className="w-full rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-sm font-medium text-cyan-300">PHASE 01 PLACEHOLDER</p><h1 className="mt-3 text-4xl font-semibold text-white">Preflight scan is not enabled yet.</h1><p className="mt-5 leading-7 text-slate-300">The scan route is ready for the next phase. No URL was fetched and no data was stored.</p><dl className="mt-8 space-y-3 rounded-xl bg-[#07111f] p-5 text-sm"><div><dt className="text-slate-500">Request ID</dt><dd className="mt-1 font-mono text-slate-200">{id}</dd></div>{url ? <div><dt className="text-slate-500">Submitted URL</dt><dd className="mt-1 break-all text-slate-200">{url}</dd></div> : null}</dl><Link href="/" className="mt-8 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950">Back to home</Link></section></main>;
}
