"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { ENTER, EXIT } from "@/components/production/motion";
import { stationFor } from "@/components/production/stations";
import { Spinner } from "@/components/Spinner";
import type { RunControls } from "@/hooks/useRunControls";
import { api } from "@/lib/api";
import type { LiveAssets } from "@/lib/live";
import { landingNote, resumeTarget, stageShort } from "@/lib/runControls";
import type { Checkpoint } from "@/lib/types";
import { BreakpointPicker } from "./BreakpointPicker";
import { CostLedger } from "./CostLedger";
import { PauseEmblem, TransportGlyph } from "./primitives";
import { ResumeMap } from "./ResumeMap";

/** The paused film: exactly where it stopped, what is kept, what is left to pay, and
 *  where Resume picks up. Paid work submitted before the pause shows as still landing. */
export function PausePanel({
  checkpoint,
  live,
  controls,
  order,
  breakable,
  reduced,
}: {
  checkpoint: Checkpoint | null;
  live: LiveAssets | null;
  controls: RunControls;
  order: string[];
  breakable: string[];
  reduced: boolean;
}) {
  const [showBreaks, setShowBreaks] = useState(false);
  const target = resumeTarget(checkpoint);
  const stage = checkpoint?.paused_stage ?? checkpoint?.resume_stage ?? null;
  const units = checkpoint?.stages.find((s) => s.name === stage)?.units ?? null;
  const thumbs = useMemo(
    () => new Map((live?.frames ?? []).map((f) => [f.order, api.asset(f.url)])),
    [live?.frames],
  );
  const dept = stage ? stationFor(stage).dept : null;
  const busy = controls.busy;
  const landing = landingNote(checkpoint);
  const canFinishWithStills = stage === "motion" && (units?.done.length ?? 0) > 0 && (units?.pending.length ?? 0) > 0;

  return (
    <motion.section
      layout
      aria-label="Paused film"
      className="glass relative overflow-hidden p-5 sm:p-6"
      transition={{ layout: { duration: 0.3, ease: [0.2, 0, 0, 1] } }}
    >
      {/* Amber leader along the top edge: the panel's state colour. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-state-warn/80 to-transparent" />

      <header className="flex min-h-[60px] items-start gap-4">
        <PauseEmblem />
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-state-warn">PAUSED</p>
          <h2 className="font-display text-[28px] font-extrabold uppercase leading-8 tracking-wide text-ink">
            {dept ? `At ${dept}` : "Film on hold"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {target.detail || checkpoint?.paused_message || "Everything finished so far is kept."}
          </p>
          <AnimatePresence initial={false}>
            {landing && (
              <motion.p
                key="landing"
                role="status"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, transition: ENTER }}
                exit={{ opacity: 0, transition: EXIT }}
                className="mt-2 inline-flex items-center gap-2 text-xs text-muted"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseGlow" />
                {landing}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_280px] md:items-start">
        <div className="min-w-0">
          {stage && units && units.total > 0 ? (
            <ResumeMap stage={stage} units={units} resumeUnit={checkpoint?.resume_unit ?? null} thumbs={thumbs} reduced={reduced} />
          ) : (
            <StageStrip checkpoint={checkpoint} />
          )}
        </div>
        <CostLedger checkpoint={checkpoint} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void controls.resume()}
          disabled={busy !== null}
          aria-keyshortcuts="p"
          className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-sm font-semibold text-midnight hover:bg-accent-hover disabled:opacity-50"
        >
          {busy === "resume" ? <Spinner /> : <TransportGlyph icon="play" className="h-4 w-4" />}
          {target.label}
        </button>
        {canFinishWithStills && (
          <button
            type="button"
            onClick={() => void controls.resume({ allowStills: true })}
            disabled={busy !== null}
            title="Skip the remaining AI video: those scenes use their still frame. No more video spend."
            className="press inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink shadow-[0_0_0_1px_rgba(239,232,218,0.16)] hover:bg-white/[0.05] disabled:opacity-50"
          >
            {busy === "finish" && <Spinner />}
            Finish with stills
          </button>
        )}
        {breakable.length > 0 && (
          <button
            type="button"
            aria-expanded={showBreaks}
            onClick={() => setShowBreaks((o) => !o)}
            className="press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-muted hover:bg-white/[0.05] hover:text-ink"
          >
            <Flag className="h-4 w-4" strokeWidth={2} aria-hidden />
            Checkpoints{controls.breakpoints.length ? ` (${controls.breakpoints.length})` : ""}
          </button>
        )}
        {controls.error && (
          <p role="alert" className="text-sm text-state-bad">
            {controls.error}
          </p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showBreaks && (
          <motion.div
            key="breaks"
            initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: EXIT }}
            className="mt-4 border-t border-line pt-4"
          >
            <BreakpointPicker order={order} breakable={breakable} value={controls.breakpoints} onChange={controls.setBreakpoints} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** For stages without per-unit work: a compact strip of where the line stopped. */
function StageStrip({ checkpoint }: { checkpoint: Checkpoint | null }) {
  const stages = checkpoint?.stages ?? [];
  if (!stages.length) return null;
  return (
    <ol aria-label="Where the film stopped" className="flex flex-wrap gap-1.5">
      {stages.map((s) => {
        const done = s.status === "succeeded" || s.status === "degraded" || s.status === "skipped";
        const here = s.status === "paused" || s.name === checkpoint?.resume_stage;
        return (
          <li
            key={s.name}
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              here
                ? "bg-state-warn/15 text-state-warn shadow-[0_0_0_1px_rgba(232,197,71,0.4)]"
                : done
                  ? "bg-white/[0.06] text-ink/80"
                  : "text-muted shadow-[0_0_0_1px_rgba(239,232,218,0.1)]"
            }`}
          >
            {done ? "✓ " : here ? "❚❚ " : ""}
            {stageShort(s.name)}
            {s.breakpoint && <span className="sr-only"> (checkpoint)</span>}
          </li>
        );
      })}
    </ol>
  );
}
