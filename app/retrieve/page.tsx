"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useRecentJobs } from "@/hooks/useRecentJobs";

export default function RetrievePage() {
  const router = useRouter();
  const { jobs, remove } = useRecentJobs();
  const [id, setId] = useState("");

  const go = () => {
    const v = id.trim();
    if (v) router.push(`/status/${encodeURIComponent(v)}`);
  };

  return (
    <main className="relative min-h-screen">
      <TopBar active="retrieve" />
      <section className="mx-auto max-w-xl px-5 pb-24 pt-28">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Retrieve a job
        </h1>
        <p className="mt-2 text-muted">
          Paste the job ID you saved. Jobs are kept for{" "}
          <span className="text-ink">24 hours</span> after creation.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 3f9c1a2b-7d4e-…"
            aria-label="Job ID"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-full border border-line bg-surface/60 px-4 py-2.5 font-mono text-sm text-ink placeholder:text-muted/60 backdrop-blur-md focus:border-accent/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!id.trim()}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-midnight press hover:bg-accent-hover disabled:opacity-40"
          >
            Open
          </button>
        </form>

        <div className="mt-12">
          <h2 className="mb-3 font-display text-xl font-semibold text-ink">
            Recent on this device
          </h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing yet. Generations you start on this device show up here for
              24 hours.
            </p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className="glass-2 flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/status/${j.id}`}
                    className="min-w-0 flex-1"
                    title={j.prompt}
                  >
                    <div className="truncate text-ink">
                      {j.prompt || "Untitled"}
                    </div>
                    <div className="truncate font-mono text-xs text-muted">
                      {j.id}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(j.id)}
                    aria-label="Remove from recent"
                    className="shrink-0 rounded-full px-2 py-1 text-muted transition-colors hover:text-state-bad"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
