"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ENTER, EXIT } from "@/components/production/motion";
import { Spinner } from "@/components/Spinner";
import type { RunControls } from "@/hooks/useRunControls";
import { formatUSD } from "@/lib/format";
import { drainSummary, resumeTarget, stageShort, unitWord, type ControlPhase } from "@/lib/runControls";
import type { Checkpoint, StageRef } from "@/lib/types";
import { BreakpointPicker } from "./BreakpointPicker";
import { AnimatedNumber, TransportGlyph, useToast } from "./primitives";

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** The transport bar pinned to the bottom of a running film: one big
 *  pause/resume control, what is happening right now, the money (kept and still
 *  to pay), and the checkpoint picker. Press P anywhere to pause or resume. */
export function RunControlDock({
  phase,
  checkpoint,
  controls,
  stages,
  currentStage,
  order,
  breakable,
}: {
  phase: Exclude<ControlPhase, "idle" | "finished">;
  checkpoint: Checkpoint | null;
  controls: RunControls;
  stages: StageRef[];
  currentStage: string | null;
  order: string[];
  breakable: string[];
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const target = resumeTarget(checkpoint);
  const busy = controls.busy;

  const nowLine = (() => {
    if (phase === "pausing") return drainSummary(checkpoint);
    if (phase === "paused")
      return target.unit != null
        ? `Stopped at ${stageShort(target.stage!)}, ${unitWord(target.stage)} ${target.unit} is next`
        : target.stage
          ? `Stopped before ${stageShort(target.stage)}`
          : "Stopped";
    const st = stages.find((s) => s.name === currentStage);
    if (st?.progress_total && currentStage) {
      const n = Math.min((st.progress_current ?? 0) + 1, st.progress_total);
      return `${stageShort(currentStage)}: ${unitWord(currentStage)} ${n} of ${st.progress_total}`;
    }
    return currentStage ? `${stageShort(currentStage)} in progress` : "Starting up";
  })();

  const act = async () => {
    if (busy) return;
    if (phase === "running") {
      const flying = checkpoint?.stages.find((s) => s.units?.in_flight.length)?.units?.in_flight.length ?? 0;
      if (!(await controls.pause())) {
        toast({ tone: "warn", title: "Couldn't pause", body: "The film may have just finished a step. Try again." });
        return;
      }
      toast({
          tone: "warn",
          title: "Pausing",
          body: flying
            ? `Nothing new starts. ${flying} ${flying === 1 ? "item" : "items"} already paid for will finish and be kept.`
            : "Nothing new starts. The current step wraps up, then the film waits for you.",
        });
    } else if (phase === "pausing") {
      if (await controls.resume()) toast({ tone: "ok", title: "Back to work", body: "Pause cancelled. Nothing was lost." });
    } else if (await controls.resume()) {
      toast({ tone: "ok", title: target.label.replace("Resume", "Resuming"), body: "Finished work is reused, never billed twice." });
    }
  };

  // P toggles pause/resume anywhere on the page (not while typing).
  const actRef = useRef(act);
  useEffect(() => {
    actRef.current = act;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // e.repeat: holding P must not pause and then, on an auto-repeat, cancel the pause.
      if (e.repeat || e.key.toLowerCase() !== "p" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      void actRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the checkpoint popover on Escape / outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (pop.current && !pop.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const label = phase === "running" ? "Pause" : phase === "pausing" ? "Keep going" : target.label;
  const icon = phase === "running" ? "pause" : "play";
  const working = busy === "pause" || busy === "resume" || busy === "withdraw";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1], delay: 0.2 }}
      className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:left-1/2 sm:w-[min(720px,calc(100vw-32px))] sm:-translate-x-1/2"
    >
      <div ref={pop} className="relative">
        <AnimatePresence>
          {open && (
            <motion.div
              key="pop"
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)", transition: EXIT }}
              className="glass absolute bottom-[calc(100%+10px)] right-0 max-h-[60vh] w-full overflow-y-auto overscroll-contain p-4 sm:w-[380px]"
            >
              <BreakpointPicker order={order} breakable={breakable} value={controls.breakpoints} onChange={controls.setBreakpoints} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* While running there's no pause panel, so the dock shows failures itself
            (e.g. a checkpoint that didn't save; the flag has been rolled back). */}
        <AnimatePresence initial={false}>
          {phase === "running" && controls.error && (
            <motion.p
              key="err"
              role="alert"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)", transition: EXIT }}
              className="glass mb-2 rounded-[14px] px-4 py-2 text-sm text-state-bad"
            >
              {controls.error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Pill: 28px outer radius = 22px button radius + 6px inset (concentric). */}
        <div className="glass flex items-center gap-3 rounded-[28px] p-1.5 pr-2 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => void act()}
            disabled={working}
            aria-keyshortcuts="p"
            className={`press relative inline-flex min-h-11 shrink-0 items-center gap-2 overflow-hidden rounded-[22px] pl-3 pr-4 text-sm font-semibold disabled:opacity-60 ${
              phase === "running"
                ? "bg-ink text-midnight hover:bg-white"
                : "bg-accent text-midnight hover:bg-accent-hover"
            }`}
          >
            {phase === "pausing" && (
              // Draining sweep: a light band crossing the button while units finish.
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                animate={{ x: ["-100%", "250%"] }}
                transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
              />
            )}
            <span className="relative grid h-5 w-5 place-items-center">
              {working ? <Spinner className="h-4 w-4" /> : <TransportGlyph icon={icon} className="h-4 w-4" />}
            </span>
            <span className="relative max-w-[42vw] truncate sm:max-w-none">{label}</span>
          </button>

          <div role="status" aria-live="polite" className="min-w-0 flex-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                className={`font-mono text-[10px] tracking-[0.18em] ${phase === "running" ? "text-accent" : "text-state-warn"}`}
              >
                {phase === "running" ? "RECORDING" : phase === "pausing" ? "PAUSING" : "PAUSED"}
              </motion.p>
            </AnimatePresence>
            <p className="truncate text-[13px] text-ink/90">{nowLine}</p>
          </div>

          {checkpoint && (
            <div className="hidden shrink-0 items-center gap-4 border-l border-line pl-4 sm:flex">
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted">KEPT</p>
                <AnimatedNumber value={checkpoint.spent_usd} format={formatUSD} className="text-sm text-state-ok" />
              </div>
              <div className="text-right" title="Estimated cost to finish from here">
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted">TO FINISH</p>
                <span className="text-sm text-ink">
                  ≈ <AnimatedNumber value={checkpoint.remaining_usd} format={formatUSD} />
                </span>
              </div>
            </div>
          )}

          {breakable.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`Checkpoints${controls.breakpoints.length ? `, ${controls.breakpoints.length} set` : ""}`}
              title="Pause before a step"
              onClick={() => setOpen((o) => !o)}
              className={`press relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-150 ${
                open || controls.breakpoints.length ? "text-accent" : "text-muted hover:text-ink"
              } hover:bg-white/[0.06]`}
            >
              <Flag
                className="h-[18px] w-[18px]"
                strokeWidth={2}
                fill={controls.breakpoints.length ? "currentColor" : "none"}
                aria-hidden
              />
              <AnimatePresence>
                {controls.breakpoints.length > 0 && (
                  <motion.span
                    key={controls.breakpoints.length}
                    initial={{ scale: 0.25, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.25, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-midnight"
                    aria-hidden
                  >
                    {controls.breakpoints.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          <kbd className="hidden shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-muted shadow-[0_0_0_1px_rgba(239,232,218,0.14)] md:block">
            P
          </kbd>
        </div>
      </div>
    </motion.div>
  );
}
