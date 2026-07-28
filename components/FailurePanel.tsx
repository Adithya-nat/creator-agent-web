"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";

export function FailurePanel({
  jobId,
  status,
  error,
}: {
  jobId: string;
  status: "failed" | "interrupted";
  error: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const resume = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.resumeJob(jobId);
      if (res.status === 202) {
        // Re-subscribe as a running job (reload re-runs useJobStream from scratch).
        window.location.reload();
        return;
      }
      if (res.status === 409) {
        setMsg("This job is already running or already finished.");
      } else if (res.status === 404 || res.status === 410) {
        setMsg("This job has expired and can no longer be resumed.");
      } else {
        setMsg("Couldn't resume the job. Please try again.");
      }
    } catch {
      setMsg("Can't reach the server. Is the backend running?");
    }
    setBusy(false);
  };

  return (
    <div className="glass border-state-bad/30 p-6">
      <div className="flex items-center gap-2 text-state-bad">
        <span aria-hidden="true">✕</span>
        <h2 className="font-display text-lg font-semibold">
          {status === "interrupted"
            ? "Generation was interrupted"
            : "Generation failed"}
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        {status === "interrupted"
          ? "The service restarted before this job finished."
          : "Something went wrong while generating your film."}
        {error ? ` (${error})` : ""}
      </p>
      <p className="mt-1 text-sm text-muted">
        Resuming reuses everything already generated and only redoes what's
        missing.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resume}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-5 py-2 text-sm font-medium text-white shadow-glow transition-all hover:shadow-glow-violet disabled:opacity-50"
        >
          {busy ? (
            <>
              <Spinner /> Resuming…
            </>
          ) : (
            "Resume generation"
          )}
        </button>
        {msg && <span className="text-sm text-state-warn">{msg}</span>}
      </div>
    </div>
  );
}
