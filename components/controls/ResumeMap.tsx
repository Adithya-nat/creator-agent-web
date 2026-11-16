"use client";

/* eslint-disable @next/next/no-img-element -- frames are runtime API URLs */

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { EASE, ENTER, stagger } from "@/components/production/motion";
import { slate } from "@/components/production/shots";
import { type TileState, unitTiles, unitWord } from "@/lib/runControls";
import type { UnitProgress } from "@/lib/types";

const STATE_TEXT: Record<TileState, string> = {
  done: "kept, won't be paid for again",
  in_flight: "already paid for, finishing",
  pending: "not started, made on resume",
};

/** Every unit of the stage the run stopped in: kept, finishing, or still to make,
 *  with a playhead on the exact unit a resume starts at. */
export function ResumeMap({
  stage,
  units,
  resumeUnit,
  thumbs,
  reduced,
}: {
  stage: string;
  units: UnitProgress;
  resumeUnit: number | null;
  thumbs: Map<number, string>;
  reduced: boolean;
}) {
  const tiles = unitTiles(units, resumeUnit);
  const word = unitWord(stage);

  return (
    <div>
      <ol
        aria-label={`${unitWord(stage, 2)} in this step`}
        className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2 pt-7"
      >
        {tiles.map((t, i) => {
          const thumb = thumbs.get(t.order);
          return (
            <motion.li
              key={t.order}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ ...ENTER, delay: stagger(i, 0.05, 0.5) }}
              aria-label={`${word} ${t.order}: ${STATE_TEXT[t.state]}${t.resumesHere ? ". Resume starts here." : ""}`}
              className="relative"
            >
              {t.resumesHere && (
                <motion.span
                  layoutId="resume-playhead"
                  transition={{ duration: 0.45, ease: EASE }}
                  aria-hidden
                  className="absolute -top-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
                >
                  <span className="whitespace-nowrap rounded-full bg-accent px-1.5 py-[3px] font-mono text-[9px] font-semibold tracking-[0.12em] text-midnight">
                    RESUME
                  </span>
                  <span className="h-2 w-[2px] bg-accent" />
                </motion.span>
              )}
              <Tile state={t.state} thumb={thumb} order={t.order} reduced={reduced} resumesHere={t.resumesHere} />
            </motion.li>
          );
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-state-ok" /> Kept ({units.done.length})
        </li>
        {units.in_flight.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-accent animate-pulseGlow" /> Paid for, finishing ({units.in_flight.length})
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full border border-dashed border-muted" /> Made on resume ({units.pending.length})
        </li>
      </ul>
    </div>
  );
}

function Tile({
  state,
  thumb,
  order,
  reduced,
  resumesHere,
}: {
  state: TileState;
  thumb: string | undefined;
  order: number;
  reduced: boolean;
  resumesHere: boolean;
}) {
  // Outer radius 9px = inner 7px + 2px inset, so the spinning ring stays concentric.
  return (
    <div
      className={`relative aspect-[9/16] overflow-hidden rounded-[9px] ${
        state === "pending"
          ? `border border-dashed ${resumesHere ? "border-accent/70" : "border-white/15"}`
          : "border border-transparent"
      } ${state === "done" ? "shadow-[0_0_0_1px_rgba(108,192,139,0.45)]" : ""}`}
    >
      {state === "in_flight" && (
        <motion.span
          aria-hidden
          className="absolute inset-[-60%] bg-[conic-gradient(from_0deg,transparent_0_62%,var(--color-accent)_82%,transparent_100%)]"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
        />
      )}
      <div
        className={`absolute overflow-hidden bg-surface-2 ${
          state === "in_flight" ? "inset-[2px] rounded-[7px]" : "inset-0"
        }`}
      >
        {thumb && (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className={`media-outline h-full w-full object-cover transition-[opacity,filter] duration-300 ${
              state === "pending" ? "opacity-25 grayscale" : state === "in_flight" ? "opacity-70" : ""
            }`}
          />
        )}
        <span className="absolute left-1 top-1 rounded-[4px] bg-black/55 px-1 font-mono text-[9px] tabular-nums text-ink/90">
          {slate(order)}
        </span>
        {state === "done" && (
          <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-state-ok text-midnight">
            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}
