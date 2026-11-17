"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { truncateId } from "@/lib/format";

function ago(ms: number): string {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

/** Films started on this device in the last 24 hours. */
export function RecentJobs() {
  const { jobs, remove } = useRecentJobs();
  if (jobs.length === 0) return null;

  return (
    <section aria-labelledby="recent-title">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="recent-title" className="text-lg font-semibold tracking-[-0.01em] text-ink">
          Your recent films
        </h2>
        <span className="text-xs text-muted">On this device · deleted after 24 hours</span>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface/60 shadow-[0_0_0_1px_var(--color-line)]">
        {jobs.map((j) => (
          <li key={j.id} className="group relative flex items-center">
            <Link
              href={`/status/${j.id}`}
              title={j.prompt}
              className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-ink/[0.03]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">{j.prompt || "Untitled"}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted">
                  {truncateId(j.id)} · {ago(j.createdAt)}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-ink"
                aria-hidden="true"
              />
            </Link>
            <button
              type="button"
              aria-label={`Remove "${j.prompt || "Untitled"}" from recent films`}
              onClick={() => remove(j.id)}
              className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-[opacity,color] duration-150 hover:text-state-bad focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
