"use client";

// How each kind of change is shown: as a timeline or an animated before/after,
// never as a plain list. Motion is gated by MotionConfig (reduced motion = fades).

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { EASE, ENTER } from "@/components/production/motion";
import { recut } from "@/lib/api";
import { changed, shotSegments, wordDiff } from "@/lib/recut";
import type { RecutScene, SceneDiff, SceneLine } from "@/lib/types";

const SIZE: Record<string, string> = {
  wide: "Wide",
  medium: "Medium",
  close: "Close",
  extreme_close: "Extreme close",
  over_shoulder: "Over shoulder",
  insert: "Insert",
  two_shot: "Two-shot",
};

/** Word-level diff: removed words strike through and fade, new words type in. */
export function DiffText({ before, after, className = "" }: { before: string; after: string; className?: string }) {
  const parts = useMemo(() => wordDiff(before, after), [before, after]);
  let added = 0;
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.op === "same") return <span key={i}>{p.text}</span>;
        if (p.op === "del")
          return (
            <motion.del
              key={i}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0.45 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="text-muted decoration-state-bad/70"
            >
              {p.text}
            </motion.del>
          );
        const delay = 0.15 + 0.03 * added++;
        return (
          <motion.ins
            key={i}
            initial={{ opacity: 0, filter: "blur(4px)", y: 4 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay }}
            className="inline-block whitespace-pre-wrap rounded-[3px] bg-accent/15 px-0.5 text-ink no-underline"
          >
            {p.text}
          </motion.ins>
        );
      })}
    </span>
  );
}

function Ruler({ seconds }: { seconds: number }) {
  const ticks = Math.max(1, Math.floor(seconds));
  const step = seconds > 12 ? 3 : seconds > 6 ? 2 : 1;
  return (
    <div aria-hidden className="relative h-4 font-mono text-[9px] text-muted">
      {Array.from({ length: ticks + 1 }, (_, t) => t)
        .filter((t) => t % step === 0)
        .map((t) => (
          <span
            key={t}
            className={`absolute ${t === 0 ? "" : t >= seconds - 0.5 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${(t / seconds) * 100}%` }}
          >
            {t}s
          </span>
        ))}
    </div>
  );
}

const sameLines = (a: SceneLine[], b: SceneLine[]) =>
  a.length === b.length && a.every((l, i) => l.text === b[i].text && l.speaker === b[i].speaker);

/** A multi-shot scene on its time axis, before or after the director's edit. Changed
 *  shots carry an amber leader; their action and lines diff in place. */
export function SceneEditTimeline({ diff, scene }: { diff: SceneDiff; scene?: RecutScene }) {
  const [view, setView] = useState<"after" | "before">("after");
  const segs = shotSegments(diff.shots.length ? diff.shots : scene?.shots ?? []);
  const total = segs.length ? segs[segs.length - 1].to : scene?.seconds ?? 0;
  const descChanged = diff.description_before !== diff.description_after;
  const id = useId();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent">SCENE {diff.order}</p>
        <div role="radiogroup" aria-label="Show" className="inline-flex rounded-full bg-ink/[0.04] p-[3px] shadow-[0_0_0_1px_var(--color-line)]">
          {(["before", "after"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className="relative min-h-8 rounded-full px-3 text-xs font-medium"
            >
              {view === v && (
                <motion.span layoutId={`${id}-v`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />
              )}
              <span className={`relative ${view === v ? "text-midnight" : "text-muted"}`}>{v === "before" ? "Before" : "After"}</span>
            </button>
          ))}
        </div>
      </div>

      {descChanged && (
        <p className="text-sm leading-relaxed text-ink/90">
          {view === "after" ? <DiffText before={diff.description_before} after={diff.description_after} /> : diff.description_before}
        </p>
      )}

      {segs.length > 0 && (
        <div className="overflow-x-auto overscroll-x-contain pb-1">
          <div className="min-w-[520px]">
            <Ruler seconds={total} />
            <div className="relative flex h-[108px] gap-1">
              {segs.map((seg) => {
                const sd = diff.shots[seg.index];
                const action = sd ? (view === "after" ? sd.action_after : sd.action_before) : scene?.shots[seg.index]?.action ?? "";
                const size = sd ? (view === "after" ? sd.size_after : sd.size_before) : scene?.shots[seg.index]?.size ?? "";
                const isChanged = !!sd && (sd.action_before !== sd.action_after || sd.size_before !== sd.size_after || !sameLines(sd.lines_before, sd.lines_after));
                return (
                  <motion.div
                    key={seg.index}
                    layout
                    style={{ flexGrow: seg.width, flexBasis: 0 }}
                    className={`relative min-w-0 overflow-hidden rounded-[10px] p-2 ${
                      isChanged ? "bg-accent/[0.08] shadow-[0_0_0_1px_rgba(242,181,68,0.45)]" : "bg-white/[0.035] shadow-[0_0_0_1px_var(--color-line)]"
                    }`}
                  >
                    {isChanged && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-accent"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.1 + seg.index * 0.08 }}
                      />
                    )}
                    <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                      <span className="tabular-nums">{seg.from.toFixed(0)}–{seg.to.toFixed(0)}s</span>
                      <span className="truncate">{SIZE[size] ?? size}</span>
                      {isChanged && <span className="ml-auto text-accent">changed</span>}
                    </p>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.p
                        key={view + action}
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)", transition: ENTER }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        className="mt-1 line-clamp-4 text-[12px] leading-snug text-ink/90"
                      >
                        {view === "after" && sd && sd.action_before !== sd.action_after ? (
                          <DiffText before={sd.action_before} after={sd.action_after} />
                        ) : (
                          action
                        )}
                      </motion.p>
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            {/* Dialogue lane: each shot's lines under it, on the same time axis. */}
            <div className="mt-1 flex gap-1">
              {segs.map((seg) => {
                const sd = diff.shots[seg.index];
                const before = sd?.lines_before ?? scene?.shots[seg.index]?.lines ?? [];
                const after = sd?.lines_after ?? before;
                const lines = view === "after" ? after : before;
                return (
                  <div key={seg.index} style={{ flexGrow: seg.width, flexBasis: 0 }} className="min-w-0 space-y-1">
                    {lines.map((l, i) => {
                      const prev = before[i];
                      return (
                        <p key={i} className="rounded-[8px] bg-white/[0.03] px-2 py-1 text-[11.5px] leading-snug">
                          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.12em] text-leak">{l.speaker}</span>
                          {view === "after" && prev && changed(wordDiff(prev.text, l.text)) ? (
                            <DiffText before={prev.text} after={l.text} />
                          ) : (
                            <span className="text-ink/85">{l.text}</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Before/after wipe between two pictures. Drag, or use the arrow keys. */
export function FrameWipe({ before, after, label = "Compare frames" }: { before: string; after: string; label?: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const drag = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      aria-valuetext={`${Math.round(pos)}% new`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drag(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && drag(e.clientX)}
      className="relative aspect-[9/16] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[12px] outline outline-1 -outline-offset-1 outline-white/10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={recut.media(after)} alt="New take" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={recut.media(before)}
        alt="Earlier take"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <span aria-hidden className="absolute inset-y-0 w-[2px] bg-accent shadow-[0_0_12px_rgba(242,181,68,0.7)]" style={{ left: `calc(${pos}% - 1px)` }} />
      <span
        aria-hidden
        className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-midnight"
        style={{ left: `${pos}%` }}
      >
        <ArrowLeftRight className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-ink">BEFORE</span>
      <span className="absolute right-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-midnight">NOW</span>
    </div>
  );
}

/** The opening frame that will be redrawn: the old picture flips to a storyboard card
 *  carrying the new description, until the real frame renders. */
export function StoryboardFlip({ frame, text, redraw }: { frame: string | null; text: string; redraw: boolean }) {
  return (
    <div className="relative aspect-[9/16] w-full [perspective:900px]">
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={{ rotateY: 0 }}
        animate={{ rotateY: redraw ? 180 : 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[12px] outline outline-1 -outline-offset-1 outline-white/10 [backface-visibility:hidden]">
          {frame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recut.media(frame)} alt="Current opening frame" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-surface-2" />
          )}
          {!redraw && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-ink">FRAME KEPT</span>
          )}
        </div>
        <div className="absolute inset-0 flex flex-col justify-between rounded-[12px] bg-[repeating-linear-gradient(0deg,rgba(244,239,230,0.035)_0_1px,transparent_1px_14px)] bg-surface-2 p-3 shadow-[0_0_0_1px_rgba(242,181,68,0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="font-mono text-[9px] tracking-[0.18em] text-accent">NEW OPENING FRAME</p>
          <p className="line-clamp-[10] text-[12px] italic leading-snug text-ink/85">{text}</p>
          <p className="font-mono text-[9px] tracking-[0.14em] text-muted">drawn when you recut</p>
        </div>
      </motion.div>
    </div>
  );
}

const TENSION: Record<string, number> = { setup: 0.25, inciting: 0.45, rising: 0.65, climax: 0.95, resolution: 0.35 };

/** The story's beat arc; beats being rewritten lift and pulse. */
export function StoryArc({ scenes, touched }: { scenes: Pick<RecutScene, "order" | "beat_role">[]; touched: Set<number> }) {
  const w = 560;
  const h = 120;
  const pts = scenes.map((s, i) => ({
    order: s.order,
    x: scenes.length === 1 ? w / 2 : 24 + (i * (w - 48)) / (scenes.length - 1),
    y: h - 18 - (TENSION[s.beat_role] ?? 0.5) * (h - 36),
    role: s.beat_role,
  }));
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const q = pts[i - 1];
    const mx = (q.x + p.x) / 2;
    return `${acc} C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Story arc with the beats that change">
      <motion.path d={d} fill="none" stroke="rgba(244,239,230,0.35)" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE }} />
      {pts.map((p, i) => {
        const hot = touched.has(p.order);
        return (
          <g key={p.order}>
            {hot && (
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill="rgba(242,181,68,0.18)"
                animate={{ r: [10, 16, 10], opacity: [0.9, 0.3, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
              />
            )}
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={hot ? 6 : 4}
              fill={hot ? "#f2b544" : "#8f949d"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: hot ? -4 : 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.3 + i * 0.06 }}
            />
            <text x={p.x} y={h - 2} textAnchor="middle" className="fill-[#8f949d] font-mono text-[9px]">
              {p.order}
              {p.role ? ` ${p.role}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Waveform of the current score with the scene-cut cues it was written for; new cut
 *  points (when the timing changes) slide the markers to where the new score will hit. */
export function ScoreWave({ url, cues, newCues, runtime }: { url: string | null; cues: number[]; newCues?: number[]; runtime: number }) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = await (await fetch(recut.media(url))).arrayBuffer();
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        void ctx.close();
        const data = audio.getChannelData(0);
        const n = 96;
        const size = Math.floor(data.length / n);
        const out = Array.from({ length: n }, (_, i) => {
          let m = 0;
          for (let j = i * size; j < (i + 1) * size; j += 64) m = Math.max(m, Math.abs(data[j] ?? 0));
          return m;
        });
        const top = Math.max(...out);
        if (!cancelled) setPeaks(top < 0.01 ? [] : out.map((v) => v / top));
      } catch {
        if (!cancelled) setPeaks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);
  const bars = peaks && peaks.length ? peaks : Array.from({ length: 96 }, (_, i) => 0.25 + 0.2 * Math.abs(Math.sin(i / 5)));
  const total = runtime || 1;
  const marks = (newCues ?? cues).slice(1);
  return (
    <div className="relative h-20 w-full" aria-label="Score waveform with scene cuts" role="img">
      <div className="absolute inset-0 flex items-center gap-[2px]">
        {bars.map((v, i) => (
          <motion.span
            key={i}
            className={`flex-1 rounded-full ${peaks ? "bg-ink/40" : "bg-ink/10"}`}
            initial={{ scaleY: 0.1 }}
            animate={{ scaleY: Math.max(0.06, v) }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.004 }}
            style={{ height: "100%" }}
          />
        ))}
      </div>
      {marks.map((t, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute inset-y-0 w-[2px] bg-accent/80"
          initial={{ left: `${((cues[i + 1] ?? t) / total) * 100}%` }}
          animate={{ left: `${(t / total) * 100}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
        />
      ))}
    </div>
  );
}

/** A light sweep across something that will be regenerated. */
export function Sheen({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(242,181,68,0.22)_50%,transparent_70%)] ${className}`}
      initial={{ x: "-100%" }}
      animate={{ x: ["-100%", "100%"] }}
      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.8, delay }}
    />
  );
}
