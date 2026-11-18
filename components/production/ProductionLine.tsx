"use client";

import { AnimatePresence, LayoutGroup, motion, MotionConfig } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { deriveStageSignals } from "@/lib/stageSignals";
import type { LiveAssets } from "@/lib/live";
import type { JobStatus, JobStatusResponse, StageRef } from "@/lib/types";
import { Pause } from "lucide-react";
import { LineTrack, type TrackControls } from "./LineTrack";
import { usePalette } from "./media";
import { ENTER, EXIT, rise } from "./motion";
import { buildShots, resolveLive, shotCount, slate, standIns } from "./shots";
import { stationFor } from "./stations";
import { StationView } from "./StationViews";

/** Parse an API timestamp; one without a zone designator is UTC (some DBs drop it). */
export function parseUtc(iso: string): number {
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

function useElapsed(since: string | undefined): string {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const start = since ? parseUtc(since) : NaN;
  if (now == null || Number.isNaN(start)) return "--:--";
  const s = Math.max(0, Math.floor((now - start) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** The film-generation view: your film moving down a studio production line.
 *  A header names the department at work, the monitor shows that department's
 *  work on the SAME shots (they morph between stations instead of cutting),
 *  and the rail below tracks every station. Real assets (beats, scores, look,
 *  cast, frames, audio, cover) replace treated stand-ins the moment they land. */
export function ProductionLine({
  jobId,
  stages,
  currentStage,
  status,
  job,
  live: rawLive,
  trackControls,
  pausedNote,
}: {
  jobId: string;
  stages: StageRef[];
  currentStage: string | null;
  status: JobStatus | null;
  job: JobStatusResponse | null;
  live: LiveAssets | null;
  /** Breakpoint flags on the rail (absent: the rail is display-only). */
  trackControls?: TrackControls;
  /** Shown on the frozen monitor when paused, e.g. "Resumes at scene 3". */
  pausedNote?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  // Paused: the line freezes in place (no continuous motion), so the still picture
  // itself says "on hold". "pausing" is the instant before the server parks it.
  const paused = status === "paused" || status === "pausing";
  const reduced = prefersReduced || paused;
  const live = useMemo(() => resolveLive(rawLive), [rawLive]);
  const signals = useMemo(
    () => deriveStageSignals({ stages, currentStage, status, job }),
    [stages, currentStage, status, job],
  );
  const order = signals.order;
  const active = signals.active ?? order[order.length - 1];
  const station = stationFor(active);
  const stage = stages.find((s) => s.name === active);
  const idx = Math.max(0, order.indexOf(active));

  const count = shotCount(live, job, stages);
  const posters = useMemo(() => standIns(jobId, count), [jobId, count]);
  const shots = useMemo(() => buildShots(live, count, posters), [live, count, posters]);
  const { swatches } = usePalette(live?.style_ref_url ?? null);
  const tint = swatches[Math.floor(swatches.length / 2)];
  const elapsed = useElapsed(job?.created_at);
  // Real frame progress; before image_gen reports a total, the shot count is
  // the honest denominator (not a hard-coded guess).
  const ig = stages.find((s) => s.name === "image_gen");
  const frames = { current: signals.frames.current, total: ig?.progress_total ?? count };

  const queued = status == null || status === "queued";
  const action = queued
    ? "In the queue, the crew is getting ready"
    : paused
      ? `On hold. ${pausedNote ?? "Resume whenever you're ready."}`
      : station.action({ live, stage, frames });

  return (
    <MotionConfig reducedMotion={paused ? "always" : "user"}>
      <section aria-label="Production line" className="glass relative p-3">
        <header className="flex items-end justify-between gap-4 px-2 pt-1">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted">
              STATION {slate(idx + 1)} / {slate(order.length)}
            </p>
            <div className="relative h-9 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.h2
                  key={station.dept}
                  {...rise}
                  transition={ENTER}
                  className="font-display text-[30px] font-extrabold uppercase leading-9 tracking-wide text-ink"
                >
                  {station.dept}
                </motion.h2>
              </AnimatePresence>
            </div>
            <p aria-live="polite" className="truncate text-sm text-muted">
              {action}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted">ELAPSED</p>
            <p className="font-mono text-lg tabular-nums text-ink">{elapsed}</p>
            <p className="font-mono text-[11px] tabular-nums text-muted">{Math.round(signals.progress01 * 100)}%</p>
          </div>
        </header>

        <div
          aria-hidden
          className={`relative mt-3 h-[300px] overflow-hidden rounded-[7px] bg-[#10162a] transition-[filter] duration-500 sm:h-[340px] ${
            paused ? "[filter:saturate(0.3)_brightness(0.72)]" : ""
          }`}
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 50% -10%, rgba(242,181,68,0.09), transparent 60%), radial-gradient(90% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.45))",
          }}
        >
          <LayoutGroup id={`line-${jobId}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${station.view}:${active}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: ENTER }}
                exit={{ opacity: 0, transition: EXIT }}
              >
              <StationView
                view={station.view}
                stageName={active}
                shots={shots}
                live={live}
                job={job}
                stage={stage}
                frames={frames}
                reduced={reduced}
                tint={tint}
                swatches={swatches}
                look={station.look}
              />
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </div>
        <AnimatePresence>
          {paused && <HoldSlate key="hold" note={pausedNote} />}
        </AnimatePresence>

        <div className="mt-3">
          <LineTrack
            order={order}
            signals={signals.stages}
            active={active}
            reduced={reduced}
            frozen={paused}
            controls={trackControls}
          />
        </div>
      </section>
    </MotionConfig>
  );
}

/** The slate laid over a frozen monitor: "PAUSED" with where the film resumes.
 *  Sits outside the filtered monitor so it keeps full colour. */
function HoldSlate({ note }: { note?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: ENTER }}
      exit={{ opacity: 0, filter: "blur(4px)", y: -12, transition: EXIT }}
      className="pointer-events-none absolute left-1/2 top-[200px] z-10 -translate-x-1/2 sm:top-[150px]"
    >
      <div className="glass flex items-center gap-3 rounded-[16px] px-4 py-3 backdrop-blur-xl">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-state-warn text-midnight">
          <Pause className="h-4 w-4" strokeWidth={2.5} fill="currentColor" aria-hidden />
        </span>
        <div>
          <p className="font-display text-xl font-extrabold uppercase leading-5 tracking-wide text-ink">
            Paused
          </p>
          <p className="text-xs text-muted">{note ?? "Resume whenever you're ready"}</p>
        </div>
      </div>
    </motion.div>
  );
}
