"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FailurePanel } from "@/components/FailurePanel";
import { JobErrorPanel } from "@/components/JobErrorPanel";
import { JobIdChip } from "@/components/JobIdChip";
import { PromptSummary } from "@/components/PromptSummary";
import { ResultView } from "@/components/ResultView";
import { StageList } from "@/components/StageList";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { type ConnState, useJobStream } from "@/hooks/useJobStream";
import { formatTokens } from "@/lib/format";
import { stageOrderOf } from "@/lib/stageSignals";
import { isTerminal } from "@/lib/types";

const StageScene = dynamic(
  () => import("@/components/three/StageScene").then((m) => m.StageScene),
  { ssr: false, loading: () => <div className="h-full w-full" /> },
);

const CompletionFlourish = dynamic(
  () =>
    import("@/components/three/CompletionFlourish").then(
      (m) => m.CompletionFlourish,
    ),
  { ssr: false },
);

function ConnDot({ connection }: { connection: ConnState }) {
  if (connection === "live")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseGlow" />
        live
      </span>
    );
  if (connection === "polling")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-state-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-state-warn" />
        polling
      </span>
    );
  if (connection === "connecting")
    return <span className="text-xs text-muted">connecting…</span>;
  return null;
}

export function StatusView({ jobId }: { jobId: string }) {
  const s = useJobStream(jobId);
  const status = s.status;

  const terminal = status ? isTerminal(status) : false;
  const success =
    status === "completed" || status === "completed_with_warnings";
  const failed = status === "failed" || status === "interrupted";

  // Celebratory burst on completion: fires once when the job reaches success
  // (also when re-opening an already-finished job), then self-clears. Rendered
  // as a pointer-events-none overlay so it never blocks the finished video.
  const [showFlourish, setShowFlourish] = useState(false);
  const [wasSuccess, setWasSuccess] = useState(false);
  if (success !== wasSuccess) {
    setWasSuccess(success);
    if (success) setShowFlourish(true);
  }
  useEffect(() => {
    if (!showFlourish) return;
    const id = setTimeout(() => setShowFlourish(false), 3200);
    return () => clearTimeout(id);
  }, [showFlourish]);

  // Running token total: the persisted job total once terminal, else the live sum of
  // per-stage tokens (each stage writes its count as it finishes).
  const tokensTotal =
    s.job?.total_tokens ||
    s.stages.reduce((acc, st) => acc + (st.tokens ?? 0), 0);

  return (
    <main className="relative min-h-screen">
      <TopBar />
      <div className="relative mx-auto max-w-4xl px-5 pb-24 pt-24">
        {success && showFlourish && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-20 h-72">
            <CompletionFlourish />
          </div>
        )}
        {s.error ? (
          <JobErrorPanel kind={s.error.status === 410 ? "expired" : "notfound"} />
        ) : (
          <>
            <header className="mb-8 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={status} />
                <div className="flex items-center gap-3">
                  {tokensTotal > 0 && (
                    <span
                      className="text-xs text-muted"
                      title={`${tokensTotal.toLocaleString("en-US")} tokens consumed`}
                    >
                      {formatTokens(tokensTotal)} tokens
                    </span>
                  )}
                  <ConnDot connection={s.connection} />
                </div>
              </div>
              {s.job?.prompt && <PromptSummary prompt={s.job.prompt} />}
              <JobIdChip jobId={jobId} expiresAt={s.job?.expires_at} />
            </header>

            {success && (
              <section className="mb-10">
                <ResultView jobId={jobId} warnings={s.job?.warnings ?? []} />
              </section>
            )}

            {failed && status && (
              <section className="mb-10">
                <FailurePanel
                  jobId={jobId}
                  status={status as "failed" | "interrupted"}
                  error={s.job?.error ?? null}
                  gap={s.job?.video_gap ?? null}
                />
              </section>
            )}

            {!terminal && (
              <section className="mb-10">
                <div className="h-72 w-full sm:h-96">
                  <StageScene
                    stages={s.stages}
                    currentStage={s.currentStage}
                    status={s.status}
                    job={s.job}
                    logsByStage={s.logsByStage}
                  />
                </div>
                <div className="mt-4 space-y-2 text-center">
                  <h2 className="font-display text-xl font-semibold">
                    Your film is being generated
                  </h2>
                  <p className="mx-auto max-w-xl text-sm text-muted">
                    This takes a minute or two. Each stage below animates as it
                    runs — click any stage to expand its live logs. You can safely
                    leave and come back with your job ID within the hour.
                  </p>
                </div>
              </section>
            )}

            <h2 className="mb-3 font-display text-xl font-semibold text-ink">
              Pipeline &amp; logs
            </h2>
            <StageList
              stages={s.stages}
              logsByStage={s.logsByStage}
              currentStage={s.currentStage}
              order={stageOrderOf(s.job)}
            />
          </>
        )}
      </div>
    </main>
  );
}
