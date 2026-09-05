"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6"><section><p className="text-sm font-medium text-cyan-300">UNEXPECTED ERROR</p><h1 className="mt-2 text-3xl font-semibold">Something went wrong.</h1><p className="mt-3 text-slate-300">No scan was performed. Please retry or return to the homepage.</p><button onClick={reset} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Try again</button></section></main>;
}
