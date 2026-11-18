"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Clapperboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PausePanel } from "@/components/controls/PausePanel";
import { ToastProvider } from "@/components/controls/primitives";
import { RunControlDock } from "@/components/controls/RunControlDock";
import { ENTER, EXIT } from "@/components/production/motion";
import { FailurePanel } from "@/components/FailurePanel";
import { JobErrorPanel } from "@/components/JobErrorPanel";
import { JobIdChip } from "@/components/JobIdChip";
import { ProductionLine } from "@/components/production/ProductionLine";
import { PromptSummary } from "@/components/PromptSummary";
import { RecutBay } from "@/components/recut/RecutBay";
import { RecutProgress } from "@/components/recut/RecutProgress";
import { ResultView } from "@/components/ResultView";
import { StageList } from "@/components/StageList";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { type ConnState, useJobStream } from "@/hooks/useJobStream";
import { liveSignal, useLiveAssets } from "@/hooks/useLiveAssets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useRecutMap } from "@/hooks/useRecut";
import { useCheckpoint, useRunControls } from "@/hooks/useRunControls";
import { formatTokens } from "@/lib/format";
import { breakableStages, controlPhase, resumeTarget, toggleStage } from "@/lib/runControls";
import { stageOrderOf } from "@/lib/stageSignals";
import { isFinished, type RecutRef } from "@/lib/types";

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

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
  return (
    <ToastProvider>
      <StatusViewInner jobId={jobId} />
    </ToastProvider>
  );
}

function StatusViewInner({ jobId }: { jobId: string }) {
  const s = useJobStream(jobId);
  // A pause takes effect at once on the server, so show it at once: don't wait for the
  // stream's next tick. Any status the stream reports afterwards wins.
  const [pauseSent, setPauseSent] = useState(false);
  const [streamStatus, setStreamStatus] = useState(s.status);
  if (s.status !== streamStatus) {
    setStreamStatus(s.status);
    setPauseSent(false);
  }
  const onPaused = useCallback(() => setPauseSent(true), []);
  const status = pauseSent && s.status === "running" ? "pausing" : s.status;
  const reduced = usePrefersReducedMotion();

  // "finished" = done for good; a paused film is resumable, so it keeps the line.
  const finished = status ? isFinished(status) : false;
  const success =
    status === "completed" || status === "completed_with_warnings";
  const failed = status === "failed" || status === "interrupted";
  const phase = controlPhase(status);
  const held = phase === "paused";
  const live = useLiveAssets(jobId, liveSignal(s.assetsVersion, s.job, s.stages), !s.error && !finished);

  // Run controls: checkpoint (per-unit state + cost), actions, breakpoints.
  const [cpNonce, setCpNonce] = useState(0);
  const { checkpoint, observedAt, supported } = useCheckpoint(jobId, status, cpNonce);
  const { restart } = s;
  const onResumed = useCallback(() => {
    restart();
    setCpNonce((n) => n + 1);
  }, [restart]);

  // Recut: redo picked parts of a stopped or finished film.
  const { map: recutMap, supported: recutSupported, refresh: refreshRecut } = useRecutMap(jobId, status, cpNonce);
  const [recut, setRecut] = useState<{ open: boolean; initial: RecutRef[] }>({ open: false, initial: [] });
  const openRecut = useCallback((initial: RecutRef[] = []) => setRecut({ open: true, initial }), []);
  const closeRecut = useCallback(() => setRecut({ open: false, initial: [] }), []);
  const canOpenRecut = recutSupported && !!recutMap && recutMap.scenes.length > 0 && !s.error;
  const onRecutStarted = useCallback(() => {
    closeRecut();
    onResumed();
    refreshRecut();
  }, [closeRecut, onResumed, refreshRecut]);
  // R opens the bay anywhere on the page (not while typing).
  useEffect(() => {
    if (!canOpenRecut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      setRecut((r) => (r.open ? r : { open: true, initial: [] }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canOpenRecut]);
  // The checkpoint is the fresher source (and carries its read time); the job snapshot
  // covers servers or moments without one (read time unknown = 0).
  const controls = useRunControls(
    jobId,
    status,
    checkpoint?.breakpoints ?? s.job?.breakpoints,
    checkpoint ? observedAt : 0,
    onResumed,
    onPaused,
  );
  const order = stageOrderOf(s.job);
  const breakable = breakableStages(order, s.stages);
  const showControls = supported && (phase === "running" || held) && !recut.open;
  const trackControls = showControls
    ? {
        breakpoints: controls.breakpoints,
        breakable,
        onToggle: (name: string) => controls.setBreakpoints(toggleStage(controls.breakpoints, name, order)),
      }
    : undefined;
  const target = resumeTarget(checkpoint);
  const pausedNote = target.unit != null ? target.label.replace("Resume from", "Resumes at") : target.stage ? target.label.replace("Resume at", "Resumes at") : undefined;

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
      <div className={`relative mx-auto max-w-4xl px-5 pt-24 ${recut.open ? "pb-80" : showControls ? "pb-40" : "pb-24"}`}>
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
                  {canOpenRecut && !recut.open && (
                    <button
                      type="button"
                      onClick={() => openRecut()}
                      aria-keyshortcuts="r"
                      title="Redo any part of this film (R)"
                      className="press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-leak shadow-[0_0_0_1px_rgba(110,231,249,0.35)] hover:bg-leak/10"
                    >
                      <Clapperboard className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      Recut
                    </button>
                  )}
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

            <AnimatePresence initial={false}>
              {recut.open && recutMap && (
                <motion.div key="recut" className="mb-10" exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}>
                  <RecutBay
                    jobId={jobId}
                    map={recutMap}
                    initial={recut.initial}
                    pausing={status === "pausing"}
                    onPause={() => void controls.pause()}
                    onStarted={onRecutStarted}
                    onClose={closeRecut}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {success && !recut.open && (
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
                  onRecut={canOpenRecut ? openRecut : undefined}
                />
              </section>
            )}

            <AnimatePresence initial={false}>
              {held && supported && !recut.open && (
                <motion.div
                  key="hold"
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}
                  className="mb-6"
                >
                  <PausePanel
                    checkpoint={checkpoint}
                    live={live}
                    controls={controls}
                    order={order}
                    breakable={breakable}
                    reduced={reduced}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {!finished && recutMap && recutMap.cuts.length > 1 && !recut.open && (
              <RecutProgress map={recutMap} stages={s.stages} running={phase === "running"} />
            )}

            {!finished && (
              <section className="mb-10">
                <ProductionLine
                  jobId={jobId}
                  stages={s.stages}
                  currentStage={s.currentStage}
                  status={status}
                  job={s.job}
                  live={live}
                  trackControls={trackControls}
                  pausedNote={pausedNote}
                />
                <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted">
                  {phase === "paused"
                    ? "Paused films still expire on the countdown above. Resume before then and everything finished is reused."
                    : showControls
                      ? "Takes a few minutes. Pause any time with P; finished work is never paid for twice."
                      : "Takes a few minutes. You can leave and come back with your job ID."}
                </p>
              </section>
            )}

            <h2 className="mb-3 font-display text-xl font-semibold text-ink">
              Pipeline &amp; logs
            </h2>
            <StageList
              stages={s.stages}
              logsByStage={s.logsByStage}
              currentStage={s.currentStage}
              order={order}
              breakpoints={showControls ? controls.breakpoints : undefined}
            />
          </>
        )}
      </div>
      {showControls && (phase === "running" || held) && (
        <RunControlDock
          phase={phase as "running" | "paused"}
          checkpoint={checkpoint}
          controls={controls}
          stages={s.stages}
          currentStage={s.currentStage}
          order={order}
          breakable={breakable}
        />
      )}
    </main>
  );
}
