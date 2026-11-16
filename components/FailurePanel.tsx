"use client";

import { useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import type { VideoGap } from "@/lib/types";
import { gapCopy } from "@/lib/videoGap";

type Action = "resume" | "finish";

export function FailurePanel({
  jobId,
  status,
  error,
  gap,
}: {
  jobId: string;
  status: "failed" | "interrupted";
  error: string | null;
  gap?: VideoGap | null;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { needsKey, hasKey, openKeyDialog } = useAccount();

  const run = async (action: Action) => {
    if (needsKey && !hasKey) {
      setMsg("Add your Gemini key to resume this film.");
      openKeyDialog();
      return;
    }
    setBusy(action);
    setMsg(null);
    try {
      const res = await api.resumeJob(jobId, { allowStills: action === "finish" });
      if (res.status === 202) {
        // Re-subscribe as a running job (reload re-runs useJobStream from scratch).
        window.location.reload();
        return;
      }
      if (res.status === 400) {
        setMsg("Add your Gemini key to resume this film.");
        openKeyDialog();
      } else if (res.status === 429) {
        setMsg("You already have a film rendering. Try again when it finishes.");
      } else if (res.status === 409) {
        setMsg("This film is already running or already finished.");
      } else if (res.status === 404 || res.status === 410) {
        setMsg("This film has expired and can no longer be resumed.");
      } else {
        setMsg("Couldn't resume the film. Try again.");
      }
    } catch {
      setMsg("Can't reach the server. Is the API running?");
    }
    setBusy(null);
  };

  const copy = gap ? gapCopy(gap) : null;
  const secondary =
    "inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-ink press hover:bg-white/5 disabled:opacity-50";
  const primary =
    "inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-midnight press hover:bg-accent-hover disabled:opacity-50";

  return (
    <div className={`glass p-6 ${copy ? "border-state-warn/30" : "border-state-bad/30"}`}>
      <div className={`flex items-center gap-2 ${copy ? "text-state-warn" : "text-state-bad"}`}>
        <span aria-hidden="true">{copy ? "◐" : "✕"}</span>
        <h2 className="font-display text-lg font-semibold">
          {copy ? copy.title : status === "interrupted" ? "Generation was interrupted" : "Generation failed"}
        </h2>
      </div>

      {copy ? (
        <>
          <p className="mt-2 text-sm text-muted">{copy.why}</p>
          <p className="mt-1 text-sm text-muted">{copy.choice}</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            {status === "interrupted"
              ? "The service restarted before this film finished."
              : "Something went wrong while making your film."}
            {error ? ` (${error})` : ""}
          </p>
          <p className="mt-1 text-sm text-muted">
            Resuming reuses everything already made and only redoes what&apos;s missing.
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {copy && (
          <button type="button" onClick={() => run("finish")} disabled={busy !== null} className={primary}>
            {busy === "finish" ? (
              <>
                <Spinner /> Finishing…
              </>
            ) : (
              copy.finish
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => run("resume")}
          disabled={busy !== null}
          className={copy ? secondary : primary}
        >
          {busy === "resume" ? (
            <>
              <Spinner /> Resuming…
            </>
          ) : copy ? (
            copy.retry
          ) : (
            "Resume generation"
          )}
        </button>
        {msg && <span className="text-sm text-state-warn">{msg}</span>}
      </div>
    </div>
  );
}
