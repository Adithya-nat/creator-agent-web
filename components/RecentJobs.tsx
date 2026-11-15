"use client";

import Link from "next/link";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { truncateId } from "@/lib/format";

export function RecentJobs() {
  const { jobs, remove } = useRecentJobs();
  if (jobs.length === 0) return null;

  return (
    <div className="mt-10 w-full">
      <div className="mb-2 text-sm text-muted">
        Recent on this device
      </div>
      <ul className="flex flex-wrap gap-2">
        {jobs.map((j) => (
          <li key={j.id} className="group">
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface/40 pl-1 pr-1 text-sm backdrop-blur-md transition-colors hover:border-accent/40">
              <Link
                href={`/status/${j.id}`}
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                title={j.prompt}
              >
                <span className="max-w-[180px] truncate text-ink/90">
                  {j.prompt || "Untitled"}
                </span>
                <span className="font-mono text-xs text-muted">
                  {truncateId(j.id)}
                </span>
              </Link>
              <button
                type="button"
                aria-label="Remove from recent"
                onClick={() => remove(j.id)}
                className="rounded-full px-1.5 py-1 text-muted opacity-0 transition-opacity hover:text-state-bad group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
