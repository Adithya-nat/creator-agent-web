"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { AnimatedNumber } from "@/components/controls/primitives";
import { ENTER, EXIT } from "@/components/production/motion";
import { Spinner } from "@/components/Spinner";
import { formatUSD } from "@/lib/format";
import { aboutTime, keyOf, refLabel } from "@/lib/recut";
import type { RecutRef } from "@/lib/types";

/** The director's note composer, pinned to the bottom while recutting: what is picked,
 *  a note (optional), one-tap suggestions, and the live cost of redoing it. */
export function DirectorDock({
  selection,
  note,
  onNote,
  chips,
  estimate,
  planning,
  onPlan,
  onRemove,
  onClose,
  error,
}: {
  selection: RecutRef[];
  note: string;
  onNote: (v: string) => void;
  chips: string[];
  estimate: { usd: number; seconds: number } | null;
  planning: boolean;
  onPlan: () => void;
  onRemove: (r: RecutRef) => void;
  onClose: () => void;
  error: string | null;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const empty = selection.length === 0;
  const label = note.trim() || selection.some((s) => s.kind === "scene") ? "Plan changes" : "Review recut";

  useEffect(() => {
    // Phones: no auto-focus, so picking a tile does not pop the keyboard over the lanes.
    if (!empty && window.matchMedia("(hover: hover)").matches) field.current?.focus({ preventScroll: true });
  }, [empty]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 24, filter: "blur(4px)", transition: EXIT }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:left-1/2 sm:w-[min(760px,calc(100vw-32px))] sm:-translate-x-1/2"
    >
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="err"
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: ENTER }}
            exit={{ opacity: 0, y: 8, transition: EXIT }}
            className="glass mb-2 rounded-[14px] px-4 py-2 text-sm text-state-bad"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="glass relative overflow-hidden rounded-[24px] p-3 backdrop-blur-xl">
        {planning && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,transparent_25%,rgba(242,181,68,0.12)_50%,transparent_75%)]"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
          />
        )}
        <div className="relative flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-accent">
            <Clapperboard className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> RECUT
          </span>
          <AnimatePresence initial={false} mode="popLayout">
            {selection.map((r) => (
              <motion.span
                key={keyOf(r)}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-accent/15 pl-2.5 pr-1 text-xs text-accent shadow-[0_0_0_1px_rgba(242,181,68,0.4)]"
              >
                {refLabel(r)}
                <button type="button" onClick={() => onRemove(r)} aria-label={`Remove ${refLabel(r)}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent/20">
                  <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {empty && <span className="min-w-0 flex-1 text-xs text-muted">Pick a clip, frame, line or whole-film item (Shift-click for more).</span>}
          <button type="button" onClick={onClose} aria-label="Close recut" className="press ml-auto grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-ink">
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!empty && (
            <motion.div
              key="compose"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", transition: ENTER }}
              exit={{ opacity: 0, height: 0, transition: EXIT }}
              className="overflow-hidden"
            >
            <textarea
              ref={field}
              value={note}
              onChange={(e) => onNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !empty && !planning) {
                  e.preventDefault();
                  onPlan();
                }
              }}
                  rows={2}
              maxLength={1500}
              placeholder="Tell the director what to change (optional)… e.g. make it a dance-off instead of a sword fight"
              aria-label="Director's note"
              className="relative mt-2 w-full resize-none rounded-[14px] border border-line bg-midnight/60 px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-accent/60 focus:outline-none disabled:opacity-40"
            />

            <AnimatePresence initial={false}>
              {chips.length > 0 && (
                <motion.div
                  key="chips"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", transition: ENTER }}
                  exit={{ opacity: 0, height: 0, transition: EXIT }}
                  className="relative mt-2 flex gap-1.5 overflow-x-auto pb-0.5"
                >
                  {chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onNote(note.trim() ? `${note.trim()}. ${c}` : c)}
                      className="press shrink-0 rounded-full px-3 py-1.5 text-xs text-ink/80 shadow-[0_0_0_1px_var(--color-line)] hover:bg-white/[0.05] hover:text-ink"
                    >
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-xs text-muted" aria-live="polite">
                {planning
                  ? "The director is reading the scene…"
                  : estimate
                    ? <>≈ <AnimatedNumber value={estimate.usd} format={formatUSD} className="text-ink" /> · {aboutTime(estimate.seconds)} · only the picked parts and what depends on them</>
                    : empty ? "" : "Planned by the director"}
              </p>
              <kbd className="hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] text-muted shadow-[0_0_0_1px_rgba(239,232,218,0.14)] md:block">⌘↵</kbd>
              <button
                type="button"
                onClick={onPlan}
                disabled={empty || planning}
                className="press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-midnight hover:bg-accent-hover disabled:opacity-50"
              >
                {planning && <Spinner />}
                {label}
              </button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
