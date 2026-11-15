"use client";

/* eslint-disable @next/next/no-img-element -- artifact + poster images are
   runtime URLs from the API; next/image would need every API host whitelisted. */

import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { EASE } from "./motion";
import type { ShotModel } from "./shots";

export type ShotLook = "paper" | "sketch" | "graded";

/** One shot of the film. Before its frame exists it shows a stand-in poster,
 *  never raw: a blank index card ("paper"), a pencil sketch tinted with the
 *  film's look ("sketch"), or a dim graded plate ("graded"). When `developed`
 *  and the real frame has landed, the frame develops in over the stand-in. */
export function ShotCard({
  shot,
  look,
  developed = false,
  tint = "#f2b544",
  reduced,
  kenBurns = false,
  playClip = false,
  layoutId,
  radius = "rounded-[8px]",
  className = "",
  children,
}: {
  shot: ShotModel;
  look: ShotLook;
  developed?: boolean;
  tint?: string;
  reduced: boolean;
  kenBurns?: boolean;
  playClip?: boolean;
  layoutId?: string;
  radius?: string;
  className?: string;
  children?: ReactNode;
}) {
  const real = developed && shot.frameUrl;
  const drift = kenBurns && !reduced;
  // Alternate the slow push-in direction per shot so a row never moves in lockstep.
  const dir = shot.order % 2 === 0 ? 1 : -1;

  return (
    <motion.div
      layoutId={layoutId}
      transition={{ layout: { duration: 0.55, ease: EASE } }}
      className={`relative overflow-hidden ${radius} bg-[#e9e1d0] shadow-[0_0_0_1px_oklch(1_0_0/0.1),0_10px_24px_-14px_rgba(0,0,0,0.8)] ${className}`}
    >
      <motion.div
        className="absolute inset-0"
        animate={drift ? { scale: [1.04, 1.14], x: [`${-2 * dir}%`, `${2 * dir}%`] } : { scale: 1, x: "0%" }}
        transition={
          drift
            ? { duration: 7 + (shot.order % 3), ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
            : { duration: 0.3 }
        }
      >
        {look === "paper" ? (
          // Ruled index card.
          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_13px,rgba(20,26,46,0.08)_13px,rgba(20,26,46,0.08)_14px)]" />
        ) : (
          shot.poster.src && (
            <img
              src={shot.poster.src}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full scale-[1.12] object-cover"
              style={
                look === "sketch"
                  ? { filter: "grayscale(1) contrast(1.7) brightness(1.2)", mixBlendMode: "multiply", opacity: 0.8 }
                  : developed
                    ? // Stand-in "still": tinted monochrome, so it never reads as a raw poster.
                      { filter: "grayscale(1) contrast(1.15) brightness(0.95)" }
                    : // Undeveloped negative: dark and soft.
                      { filter: "grayscale(1) brightness(0.22) contrast(1.1) blur(3px)" }
              }
            />
          )
        )}
        {look !== "paper" && (
          // The film's look laid over the stand-in.
          <div
            className="absolute inset-0"
            style={{
              background: tint,
              mixBlendMode: look === "sketch" || developed ? "color" : "soft-light",
              opacity: look === "sketch" ? 0.4 : developed ? 0.5 : 0.55,
            }}
          />
        )}
        {real && (
          <motion.img
            key={shot.frameUrl}
            src={shot.frameUrl!}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "brightness(1.9) saturate(0)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, filter: "brightness(1) saturate(1)" }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        )}
        {real && playClip && shot.clipUrl && (
          <video
            key={shot.clipUrl}
            src={shot.clipUrl}
            poster={shot.frameUrl ?? undefined}
            muted
            loop
            playsInline
            autoPlay={!reduced}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </motion.div>
      {children}
    </motion.div>
  );
}

/** A small slate label (SC 01) pinned to a card's corner. */
export function SlateTag({ n, dark = false }: { n: number; dark?: boolean }) {
  return (
    <span
      className={`absolute left-1.5 top-1.5 whitespace-nowrap rounded-[3px] px-1 py-px font-mono text-[9px] font-medium tracking-wider ${
        dark ? "bg-midnight/70 text-ink" : "bg-midnight/85 text-ink"
      }`}
    >
      SC {String(n).padStart(2, "0")}
    </span>
  );
}

/** Mirrored waveform bars; `progress` (0..1) lights the played part. */
export function Waveform({
  peaks,
  className = "",
  color = "var(--color-ink)",
  lit = "var(--color-accent)",
  sweep = false,
  reduced,
  duration = 6,
}: {
  peaks: number[];
  className?: string;
  color?: string;
  lit?: string;
  sweep?: boolean;
  reduced: boolean;
  duration?: number;
}) {
  const w = peaks.length * 3;
  const bars = (fill: string) => (
    <svg viewBox={`0 0 ${w} 40`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      {peaks.map((p, i) => {
        // Rounded so server and client render identical attributes (Math.sin
        // can differ in the last float digit across engines).
        const h = Math.round(Math.max(1.5, p * 36) * 100) / 100;
        return <rect key={i} x={i * 3} y={Math.round((20 - h / 2) * 100) / 100} width={2} height={h} rx={1} fill={fill} />;
      })}
    </svg>
  );
  const run = sweep && !reduced;
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 opacity-30">{bars(color)}</div>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={run ? { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] } : { clipPath: "inset(0 45% 0 0)" }}
        transition={run ? { duration, ease: "linear", repeat: Infinity } : { duration: 0 }}
      >
        {bars(lit)}
      </motion.div>
      {run && (
        <motion.div
          className="pointer-events-none absolute inset-y-[-4px] left-0 w-full"
          animate={{ x: ["0%", "100%"] }}
          transition={{ duration, ease: "linear", repeat: Infinity }}
        >
          <div className="h-full w-px bg-ink/80" />
        </motion.div>
      )}
    </div>
  );
}

/** Types `text` out character by character (instant under reduced motion). */
export function TypeLine({
  text,
  reduced,
  cps = 38,
  className = "",
  caret = true,
}: {
  text: string;
  reduced: boolean;
  cps?: number;
  className?: string;
  caret?: boolean;
}) {
  const [shown, setShown] = useState({ text, n: reduced ? text.length : 0 });
  if (shown.text !== text) setShown({ text, n: reduced ? text.length : 0 });

  const done = shown.n >= text.length;
  useEffect(() => {
    if (reduced || done) return;
    const id = setInterval(() => setShown((s) => ({ ...s, n: Math.min(s.text.length, s.n + 1) })), 1000 / cps);
    return () => clearInterval(id);
  }, [reduced, done, cps, text]);

  return (
    <span className={className}>
      {text.slice(0, reduced ? text.length : shown.n)}
      {caret && !reduced && (
        <span className={`ml-px inline-block w-[2px] translate-y-[2px] bg-accent ${done ? "animate-pulseGlow" : ""}`} style={{ height: "0.95em" }} />
      )}
    </span>
  );
}

/** Skeleton "pencil lines" that write themselves in sequence. */
export function PencilLines({ lines = 3, reduced, delay = 0 }: { lines?: number; reduced: boolean; delay?: number }) {
  const widths = [92, 78, 64, 84, 52];
  return (
    <div className="space-y-[5px]">
      {Array.from({ length: lines }, (_, i) => (
        <motion.div
          key={i}
          className="h-[3px] origin-left rounded-full bg-midnight/30"
          style={{ width: `${widths[i % widths.length]}%` }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: delay + i * 0.35 }}
        />
      ))}
    </div>
  );
}
