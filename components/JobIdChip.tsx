"use client";

import { useState } from "react";
import { useCountdown } from "@/hooks/useCountdown";

export function JobIdChip({
  jobId,
  expiresAt,
}: {
  jobId: string;
  expiresAt: string | null | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const { label, expired, ms } = useCountdown(expiresAt);
  const soon = !expired && ms < 5 * 60 * 1000;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        title="Copy job ID"
        className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5 font-mono text-xs text-ink/90 backdrop-blur-md transition-colors hover:border-brand-cyan/40"
      >
        <span className="text-muted">job</span>
        <span className="max-w-[42vw] truncate sm:max-w-none">{jobId}</span>
        <span className="text-muted transition-colors group-hover:text-brand-cyan">
          {copied ? "✓ copied" : "copy"}
        </span>
      </button>
      {expiresAt && (
        <span
          className={`rounded-full border border-line bg-surface/60 px-3 py-1.5 text-xs backdrop-blur-md ${
            expired
              ? "text-state-bad"
              : soon
                ? "text-state-warn"
                : "text-muted"
          }`}
          title="Jobs are kept for 1 hour after creation"
        >
          {expired ? "expired" : `expires in ${label}`}
        </span>
      )}
    </div>
  );
}
