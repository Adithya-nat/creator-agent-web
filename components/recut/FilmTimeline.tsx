"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { EASE, ENTER, EXIT } from "@/components/production/motion";
import { formatUSD } from "@/lib/format";
import { filmBlocks } from "@/lib/recut";
import { recut } from "@/lib/api";
import type { CutView, RecutScene } from "@/lib/types";
import { Sheen } from "./EditViews";

/** The versions rail (Cut 1 -> Cut N) over the film's scene blocks, sized by real
 *  seconds. Hovering a past cut morphs the blocks to that cut's timing; clicking it
 *  plays that cut. Blocks being redone carry a sweep; ``progress`` fills them while a
 *  recut renders. */
export function FilmTimeline({
  scenes,
  cuts,
  touched,
  progress,
  onPick,
  planned,
}: {
  scenes: RecutScene[];
  cuts: CutView[];
  touched: Set<number>;
  progress?: Map<number, number>;
  onPick?: (order: number, additive: boolean) => void;
  planned?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [watch, setWatch] = useState<number | null>(null);
  const shown = cuts.find((c) => c.cut === hover && !c.current);
  const blocks = filmBlocks(scenes, shown?.scene_seconds);
  const total = blocks.reduce((a, b) => a + b.seconds, 0);
  const watching = cuts.find((c) => c.cut === watch);

  return (
    <div className="space-y-3">
      {cuts.length > 0 && (
        <ol aria-label="Versions" className="flex items-center gap-0 overflow-x-auto pb-1">
          {cuts.map((c, i) => (
            <li key={c.cut} className="flex shrink-0 items-center">
              {i > 0 && (
                <motion.span
                  aria-hidden
                  className="block h-[2px] w-8 origin-left bg-ink/15 sm:w-12"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: EASE, delay: i * 0.08 }}
                />
              )}
              <button
                type="button"
                onPointerEnter={() => setHover(c.cut)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c.cut)}
                onBlur={() => setHover(null)}
                onClick={() => setWatch((w) => (w === c.cut ? null : c.cut))}
                aria-pressed={watch === c.cut}
                title={c.summary}
                className="press group flex min-h-11 items-center gap-2 rounded-full px-2.5 text-left"
              >
                <span
                  className={`relative grid h-3.5 w-3.5 place-items-center rounded-full ${
                    c.current ? "bg-accent" : "bg-transparent shadow-[0_0_0_2px_rgba(244,239,230,0.35)]"
                  }`}
                >
                  {c.current && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:hidden" />}
                </span>
                <span className="font-mono text-[11px] tracking-[0.14em] text-ink/90">
                  CUT {c.cut}
                  {c.current && <span className="text-accent"> · NOW</span>}
                </span>
              </button>
            </li>
          ))}
          {planned && (
            <li className="flex shrink-0 items-center">
              <span aria-hidden className="block h-[2px] w-8 bg-[repeating-linear-gradient(90deg,rgba(242,181,68,0.6)_0_4px,transparent_4px_8px)] sm:w-12" />
              <span className="flex items-center gap-2 px-2.5 font-mono text-[11px] tracking-[0.14em] text-accent">
                <span className="h-3.5 w-3.5 rounded-full shadow-[0_0_0_2px_rgba(242,181,68,0.7)] [border:1px_dashed_transparent]" />
                CUT {(cuts[cuts.length - 1]?.cut ?? 1) + 1} · PLANNED
              </span>
            </li>
          )}
        </ol>
      )}

      <div>
        <div className="relative flex h-14 gap-[3px]" aria-label="Scenes by length">
          {blocks.map((b, i) => {
            const hot = touched.has(b.order);
            const p = progress?.get(b.order);
            return (
              <motion.button
                key={b.order}
                type="button"
                layout
                onClick={(e) => onPick?.(b.order, e.shiftKey || e.metaKey || e.ctrlKey)}
                animate={{ flexGrow: b.width }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ flexBasis: 0, flexGrow: b.width }}
                aria-label={`Scene ${b.order}, ${b.seconds.toFixed(1)} seconds${hot ? ", being redone" : ""}`}
                className={`relative min-w-[22px] overflow-hidden rounded-[8px] text-left ${
                  hot ? "bg-accent/15 shadow-[0_0_0_1px_rgba(242,181,68,0.55)]" : "bg-white/[0.05] shadow-[0_0_0_1px_var(--color-line)] hover:bg-white/[0.08]"
                } transition-[background-color] duration-150`}
              >
                {hot && p == null && <Sheen delay={i * 0.12} />}
                {p != null && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-accent/35"
                    initial={false}
                    animate={{ width: `${Math.round(p * 100)}%` }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                )}
                <span className="relative block px-2 pt-1.5 font-mono text-[10px] text-ink/90">{b.order}</span>
                <span className="relative block truncate px-2 font-mono text-[9px] tabular-nums text-muted">{b.seconds.toFixed(1)}s</span>
              </motion.button>
            );
          })}
        </div>
        <p className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
          <span>0s</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={shown ? `c${shown.cut}` : "now"} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: ENTER }} exit={{ opacity: 0, transition: EXIT }}>
              {shown ? `cut ${shown.cut} timing · ` : ""}
              {total.toFixed(1)}s
            </motion.span>
          </AnimatePresence>
        </p>
      </div>

      <AnimatePresence initial={false}>
        {watching && (
          <motion.div
            key={watching.cut}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}
            className="glass-2 flex flex-col gap-3 p-3 sm:flex-row"
          >
            {watching.video_url ? (
              <video
                src={recut.media(watching.video_url)}
                controls
                playsInline
                className="aspect-[9/16] w-full max-w-[180px] rounded-[10px] bg-black outline outline-1 -outline-offset-1 outline-white/10"
              />
            ) : (
              <div className="grid aspect-[9/16] w-full max-w-[180px] place-items-center rounded-[10px] bg-surface text-xs text-muted">No cut rendered</div>
            )}
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-mono text-[11px] tracking-[0.18em] text-accent">CUT {watching.cut}</p>
              <p className="text-ink">{watching.summary}</p>
              {watching.note && <p className="text-muted">“{watching.note}”</p>}
              {watching.cost_usd != null && <p className="text-xs text-muted">Spent on this cut: {formatUSD(watching.cost_usd)}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
