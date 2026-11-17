"use client";

import { motion } from "framer-motion";
import { Check, Clock, Wand2 } from "lucide-react";
import { AnimatedNumber } from "@/components/controls/primitives";
import { EASE, ENTER, stagger } from "@/components/production/motion";
import { Spinner } from "@/components/Spinner";
import { stageShort } from "@/lib/runControls";
import { aboutTime, filmBlocks, keyOf, refLabel, touchedScenes } from "@/lib/recut";
import { formatUSD } from "@/lib/format";
import type { RecutMap, RecutPlan, RecutRef } from "@/lib/types";
import { SceneEditTimeline, ScoreWave, StoryArc, StoryboardFlip } from "./EditViews";
import { recut } from "@/lib/api";

const NOTE_TITLE: Record<string, string> = {
  story: "Story direction",
  look: "Look direction",
  score: "Score direction",
  release: "Release copy",
};

/** The director's plan, shown as edit timelines per kind of change, with the rebuild
 *  list, cost and time, and the Recut button. Nothing has been spent on media yet. */
export function PlanSheet({
  map,
  plan,
  extras,
  onExtra,
  review,
  onReview,
  onConfirm,
  onEdit,
  starting,
}: {
  map: RecutMap;
  plan: RecutPlan;
  extras: Set<string>;
  onExtra: (ref: RecutRef) => void;
  review: boolean;
  onReview: (v: boolean) => void;
  onConfirm: () => void;
  onEdit: () => void;
  starting: boolean;
}) {
  const extraUsd = plan.extra.filter((e) => extras.has(keyOf(e))).reduce((a, e) => a + e.usd, 0);
  const total = plan.estimate.usd + extraUsd;
  const touched = touchedScenes(plan.items.map(keyOf));
  const kinds = new Set(plan.items.map((i) => i.kind));
  const score = map.film.find((f) => f.kind === "score");
  const look = map.film.find((f) => f.kind === "look");
  const runtime = filmBlocks(map.scenes).reduce((a, b) => a + b.seconds, 0);
  const sections: { key: string; node: React.ReactNode }[] = [];

  for (const diff of plan.scenes) {
    const scene = map.scenes.find((s) => s.order === diff.order);
    sections.push({
      key: `scene-${diff.order}`,
      node: (
        <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
          <div className="w-[120px] sm:w-auto">
            <StoryboardFlip frame={scene?.frame_url ?? null} text={diff.description_after} redraw={diff.redraw_frame} />
          </div>
          <div className="min-w-0">
            <SceneEditTimeline diff={diff} scene={scene} />
          </div>
        </div>
      ),
    });
  }
  if (kinds.has("story")) {
    sections.push({
      key: "story",
      node: (
        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent">STORY</p>
          <StoryArc scenes={map.scenes} touched={touched} />
        </div>
      ),
    });
  }
  if (kinds.has("look") && look) {
    sections.push({
      key: "look",
      node: (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-[10px] bg-surface-2 outline outline-1 -outline-offset-1 outline-white/10">
            {look.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recut.media(look.url)} alt="Current look" className="h-full w-full object-cover" />
            )}
            <motion.span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(242,181,68,0.35),transparent)]"
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent">LOOK · EVERY FRAME REDRAWN</p>
            <div className="flex -space-x-2">
              {map.cast.map((c, i) =>
                c.portrait_url ? (
                  <motion.img
                    key={c.name}
                    src={recut.media(c.portrait_url)}
                    alt={c.name}
                    title={c.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 0.2 + i * 0.08 }}
                    className="h-9 w-9 rounded-full object-cover shadow-[0_0_0_2px_var(--color-surface)]"
                  />
                ) : null,
              )}
            </div>
          </div>
        </div>
      ),
    });
  }
  if ((kinds.has("score") || kinds.has("clip")) && score?.url) {
    sections.push({
      key: "score",
      node: (
        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent">
            SCORE · {kinds.has("score") ? "RESCORED" : "RESCORED ONLY IF THE CUTS MOVE"}
          </p>
          <ScoreWave url={score.url} cues={score.cues} runtime={runtime} />
        </div>
      ),
    });
  }
  for (const n of plan.notes) {
    sections.push({
      key: `note-${n.kind}`,
      node: (
        <div className="space-y-1">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent">{(NOTE_TITLE[n.kind] ?? n.kind).toUpperCase()}</p>
          <p className="text-sm text-ink/90">{n.text}</p>
        </div>
      ),
    });
  }

  const rebuilds = plan.items.filter((i) => i.kind !== "scene");
  return (
    <motion.section
      aria-label="Recut plan"
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
      className="glass relative overflow-hidden p-5 sm:p-6"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/12 text-accent shadow-[0_0_0_1px_rgba(242,181,68,0.35)]">
          <Wand2 className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent">{plan.directed ? "THE DIRECTOR'S PLAN" : "RECUT PLAN"}</p>
          <h3 className="mt-0.5 text-[17px] font-medium leading-snug text-ink">{plan.summary}</h3>
        </div>
      </header>

      {sections.length > 0 && (
        <div className="mt-5 space-y-4">
          {sections.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: EASE, delay: stagger(i + 1) }}
              className="glass-2 p-4"
            >
              {s.node}
            </motion.div>
          ))}
        </div>
      )}

      {plan.extra.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted">THE DIRECTOR SUGGESTS ALSO REDOING</p>
          {plan.extra.map((e) => {
            const on = extras.has(keyOf(e));
            return (
              <button
                key={keyOf(e)}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onExtra(e)}
                className={`press flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm transition-[background-color,box-shadow] duration-150 ${
                  on ? "bg-accent/12 shadow-[0_0_0_1px_rgba(242,181,68,0.5)]" : "shadow-[0_0_0_1px_var(--color-line)] hover:bg-white/[0.04]"
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] ${on ? "bg-accent text-midnight" : "shadow-[0_0_0_1px_rgba(244,239,230,0.3)]"}`}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                </span>
                <span className="font-medium text-ink">{e.label}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{e.reason}</span>
                <span className="font-mono text-xs text-ink/80">+{formatUSD(e.usd)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <p className="text-xs text-muted">Rebuilds:</p>
        <ul className="flex flex-wrap gap-1.5">
          {rebuilds.map((r, i) => (
            <motion.li
              key={keyOf(r)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: EASE, delay: Math.min(i * 0.04, 0.5) }}
              className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-ink/85"
            >
              {refLabel(r)}
            </motion.li>
          ))}
          {plan.stages.some((s) => s === "assembler") && <li className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-ink/85">{stageShort("assembler")}</li>}
        </ul>
      </div>

      {plan.review_frames_available && (
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink/90">
          <input type="checkbox" checked={review} onChange={(e) => onReview(e.target.checked)} className="h-4 w-4 accent-[#f2b544]" />
          Pause after the new frames so I can check them before filming
        </label>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={starting}
          aria-keyshortcuts="Meta+Enter"
          className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-sm font-semibold text-midnight hover:bg-accent-hover disabled:opacity-60"
        >
          {starting ? <Spinner /> : <Wand2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
          Recut · ≈ <AnimatedNumber value={total} format={formatUSD} />
        </button>
        <button type="button" onClick={onEdit} className="press min-h-11 rounded-full px-4 text-sm text-muted hover:bg-white/[0.05] hover:text-ink">
          Edit note
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {aboutTime(plan.estimate.seconds)} · earlier versions are kept as takes
        </span>
      </div>
    </motion.section>
  );
}
