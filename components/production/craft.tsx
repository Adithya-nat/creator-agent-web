"use client";

/* Hand-made motion pieces for the paper stations (Writers' Room, Table Read,
   Story Notes): a pencil that writes cursive scribble line by line, push pins
   and a story thread, a read-along word highlighter, a stamp, a margin note,
   and the table of voices. Every loop is gated on `reduced`; under reduced
   motion each piece renders its finished, static state. */

import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { mulberry32 } from "@/lib/rand";
import { useTicker } from "./media";
import { EASE } from "./motion";

const LINE_GAP = 11;
const LINE_WIDTHS = [94, 82, 90, 58];

/** A line of cursive scribble: words of small loops with gaps, deterministic per seed. */
function scribble(seed: number, width: number, mid: number): string {
  const r = mulberry32(seed);
  let d = `M0 ${mid}`;
  let x = 0;
  while (x < width - 4) {
    const loops = 2 + Math.floor(r() * 4);
    for (let k = 0; k < loops && x < width - 3; k++) {
      const s = 2.6 + r() * 2.2;
      const up = 2.4 + r() * 1.8;
      // Up-stroke loop then back down to the baseline, like joined letters.
      d += ` q ${(s / 2).toFixed(2)} ${(-up * 2).toFixed(2)} ${s.toFixed(2)} 0`;
      x += s;
    }
    const gap = 3 + r() * 2.5;
    x += gap;
    if (x < width - 4) d += ` m ${gap.toFixed(2)} 0`;
  }
  return d;
}

/** The pencil: tip at the element's origin, body up and to the right. */
export function Pencil() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      className="absolute -left-[1px] -top-[25px] overflow-visible drop-shadow-[0_3px_3px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <g transform="rotate(-42 1 25)">
        <polygon points="1,25 7,22 7,28" fill="#e7c9a0" />
        <polygon points="1,25 3.4,23.8 3.4,26.2" fill="#141a2e" />
        <rect x="7" y="22" width="17" height="6" fill="var(--color-accent)" />
        <rect x="7" y="24.4" width="17" height="1.2" fill="rgba(20,26,46,0.18)" />
        <rect x="24" y="22" width="2.6" height="6" fill="#b9b4aa" />
        <rect x="26.6" y="22" width="3.4" height="6" rx="1" fill="var(--color-leader)" />
      </g>
    </svg>
  );
}

export type DraftState = "blank" | "writing" | "written";

/** Scribbled "handwriting" lines. While `writing`, the pencil draws them one
 *  after another (each line in `perLine` seconds) and rides the tip. */
export function DraftLines({
  seed,
  state,
  reduced,
  lines = 4,
  perLine = 0.6,
  ink = "rgba(20,26,46,0.72)",
  pen = true,
}: {
  seed: number;
  state: DraftState;
  reduced: boolean;
  lines?: number;
  perLine?: number;
  ink?: string;
  pen?: boolean;
}) {
  const writing = state === "writing" && !reduced;
  const visible = state !== "blank";
  const h = lines * LINE_GAP;
  const widths = Array.from({ length: lines }, (_, i) => LINE_WIDTHS[i % LINE_WIDTHS.length]);
  const write = 0.85; // share of each line spent writing; the rest is the carriage return

  // Pen keyframes: along each line, then a quick return to the next line's start.
  const xs: string[] = [];
  const ys: number[] = [];
  const times: number[] = [];
  widths.forEach((w, i) => {
    const y = i * LINE_GAP + LINE_GAP / 2 + 1;
    xs.push("0%", `${w}%`);
    ys.push(y, y);
    times.push(i / lines, (i + write) / lines);
  });
  const total = perLine * lines;

  return (
    <div className="relative w-full" style={{ height: h }}>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {visible &&
          widths.map((w, i) => (
            <motion.path
              key={`${seed}-${i}-${state}`}
              d={scribble(seed * 31 + i, w, i * LINE_GAP + LINE_GAP / 2 + 1)}
              fill="none"
              stroke={ink}
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={writing ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={
                writing ? { duration: perLine * write, ease: "linear", delay: i * perLine } : { duration: 0 }
              }
            />
          ))}
      </svg>
      {writing && pen && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          initial={{ x: "0%", y: ys[0] }}
          animate={{ x: xs, y: ys }}
          transition={{ duration: total, times, ease: "linear" }}
        >
          {/* The little wobble of a hand writing. */}
          <motion.div
            className="absolute left-0 top-0"
            animate={{ rotate: [0, -6, 2, -4, 0], y: [0, -1.5, 0, -1, 0] }}
            transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }}
          >
            <Pencil />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/** A red push pin. */
export function Pin({ reduced, delay = 0 }: { reduced: boolean; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="absolute left-1/2 top-[-5px] z-20 h-3 w-3 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff9db6_0,var(--color-leader)_45%,#8f2140_100%)] shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
      initial={reduced ? false : { opacity: 0, scale: 1.8, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
    />
  );
}

type Point = { x: number; y: number };

/** Story thread strung pin to pin along each row of a grid, in story order.
 *  Positions come from the cells' layout boxes (transform-free), so lifting or
 *  morphing a card never knocks the thread off its pin. Pins up to index
 *  `upTo` are strung; each new length draws in as it's reached. */
export function StoryThread({
  grid,
  upTo,
  reduced,
  count,
}: {
  grid: React.RefObject<HTMLElement | null>;
  upTo: number;
  reduced: boolean;
  count: number;
}) {
  const [pts, setPts] = useState<Point[]>([]);

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const measure = () => {
      const cells = Array.from(el.children).filter(
        (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.cell === "1" && c.offsetParent !== null,
      );
      setPts(cells.map((c) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 1 })));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [grid, count]);

  // One length of thread per neighbouring pair on the same row.
  const spans = pts.flatMap((b, k) => {
    const a = pts[k - 1];
    if (!a || Math.abs(a.y - b.y) > 4) return [];
    // Shallow enough to clear the next card's slate tag.
    const sag = 11;
    return [{ k, d: `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${a.y + sag} ${b.x} ${b.y}` }];
  });
  if (!spans.length) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible" aria-hidden>
      {spans.map(({ k, d }) => {
        const on = k <= upTo;
        const t = { duration: reduced ? 0 : 0.6, ease: EASE };
        return (
          <g key={k}>
            <motion.path
              d={d}
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={2.4}
              strokeLinecap="round"
              transform="translate(0 2.5)"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
              transition={t}
            />
            <motion.path
              d={d}
              fill="none"
              stroke="var(--color-leader)"
              strokeWidth={1.6}
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
              transition={t}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Read-along text: words light up one by one while `reading`, like a table
 *  read following the speaker. Unread words sit at low ink. */
export function ReadAlong({
  text,
  reading,
  reduced,
  duration,
  className = "",
  litClass = "text-midnight",
  dimClass = "text-midnight/35",
  marker = "bg-accent/45",
}: {
  text: string;
  reading: boolean;
  reduced: boolean;
  duration: number;
  className?: string;
  litClass?: string;
  dimClass?: string;
  marker?: string;
}) {
  const words = text.split(/(\s+)/);
  const count = words.filter((w) => w.trim()).length;
  const step = Math.max(90, (duration * 1000) / Math.max(1, count));
  const run = reading && !reduced;
  const tick = useTicker(step, run);
  // Restart the read whenever this card becomes the one being read.
  const [start, setStart] = useState({ run, at: tick });
  if (start.run !== run) setStart({ run, at: tick });
  const at = run ? tick - start.at : count;

  let k = -1;
  return (
    <span className={className}>
      {words.map((w, i) => {
        if (!w.trim()) return w;
        k++;
        const lit = k <= at;
        const now = run && k === at;
        return (
          <span
            key={i}
            className={`rounded-[2px] transition-[color,background-color] duration-150 ${lit ? litClass : dimClass} ${
              now ? marker : ""
            }`}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}

/** A rubber stamp that lands with a little thump. */
export function Stamp({
  children,
  reduced,
  className = "",
  tone = "text-state-ok shadow-[inset_0_0_0_1.5px_currentColor]",
}: {
  children: React.ReactNode;
  reduced: boolean;
  className?: string;
  tone?: string;
}) {
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute z-20 flex items-center gap-0.5 rounded-[3px] bg-[#e9e1d0]/85 px-1 py-px font-mono text-[9px] font-bold uppercase tracking-wider ${tone} ${className}`}
      initial={reduced ? false : { opacity: 0, scale: 1.9, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0 }}
    >
      {children}
    </motion.span>
  );
}

export const ReadStamp = ({ reduced }: { reduced: boolean }) => (
  <Stamp reduced={reduced} className="bottom-1.5 right-1.5">
    <Check className="h-2.5 w-2.5" strokeWidth={3} />
    Read
  </Stamp>
);

/** A sticky margin note with an editor's mark, slapped on a card's corner. */
export function MarginNote({ icon: Icon, reduced, tilt = 6 }: { icon: LucideIcon; reduced: boolean; tilt?: number }) {
  return (
    <motion.span
      aria-hidden
      className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-[2px] bg-accent text-midnight shadow-[0_4px_8px_-2px_rgba(0,0,0,0.6)]"
      initial={reduced ? false : { opacity: 0, scale: 0.4, rotate: tilt * 3 }}
      animate={{ opacity: 1, scale: 1, rotate: tilt }}
      transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0 }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </motion.span>
  );
}

/** Highlighter stroke sweeping over a band of a card (behind the text). */
export function Highlight({ top, reduced, delay = 0 }: { top: number; reduced: boolean; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-1.5 right-3 h-[12px] origin-left -skew-x-6 rounded-[2px] bg-accent/45 mix-blend-multiply"
      style={{ top }}
      initial={reduced ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    />
  );
}

/** First grapheme of a name, for an avatar (works for non-Latin scripts too). */
function initial(name: string): string {
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const s of seg.segment(name.trim())) return s.segment.toUpperCase();
  } catch {
    /* older engines: fall through */
  }
  return name.trim().charAt(0).toUpperCase();
}

/** The read-through table: one seat per voice, the one speaking lit with a live level meter. */
export function CastTable({ voices, speaking, reduced }: { voices: string[]; speaking: string | null; reduced: boolean }) {
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {voices.map((v, i) => {
        const on = v === speaking;
        return (
          <motion.div
            key={v}
            className="flex w-14 flex-col items-center gap-1"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.2 + Math.min(i * 0.1, 0.6) }}
          >
            <div className="relative">
              <motion.span
                className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-extrabold transition-colors duration-150 ${
                  on ? "bg-accent text-midnight" : "bg-white/[0.07] text-muted"
                }`}
                animate={{ scale: on && !reduced ? 1.12 : 1 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              >
                {initial(v)}
              </motion.span>
              {on && !reduced && (
                <motion.span
                  className="absolute inset-0 rounded-full shadow-[0_0_0_2px_var(--color-accent)]"
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.7 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </div>
            <LevelMeter on={on} reduced={reduced} />
            <span className={`max-w-full truncate font-mono text-[9px] uppercase tracking-wider ${on ? "text-ink" : "text-muted"}`}>
              {v}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function LevelMeter({ on, reduced }: { on: boolean; reduced: boolean }) {
  const bars = [0.55, 1, 0.7, 0.9];
  return (
    <span className="flex h-2.5 items-end gap-[2px]" aria-hidden>
      {bars.map((b, i) => (
        <motion.span
          key={i}
          className={`w-[3px] origin-bottom rounded-full ${on ? "bg-accent" : "bg-white/15"}`}
          style={{ height: "100%" }}
          animate={on && !reduced ? { scaleY: [0.25, b, 0.4, b * 0.8, 0.25] } : { scaleY: 0.25 }}
          transition={
            on && !reduced
              ? { duration: 0.7 + i * 0.13, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.15 }
          }
        />
      ))}
    </span>
  );
}

const SM = "(min-width: 640px)";
const subscribeSm = (cb: () => void) => {
  const m = window.matchMedia(SM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** True from the `sm` breakpoint up (server render assumes wide; the client corrects after hydration). */
export const useIsSm = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM).matches, () => true);
