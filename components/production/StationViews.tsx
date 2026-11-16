"use client";

/* eslint-disable @next/next/no-img-element -- runtime API/poster URLs (see primitives). */

import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { ArrowUpRight, Check, type LucideIcon, Scissors, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";
import { useTicker, useWaveform } from "./media";
import { ENTER, EASE, rise, stagger } from "./motion";
import {
  CastTable,
  DraftLines,
  type DraftState,
  Highlight,
  MarginNote,
  Pencil,
  Pin,
  ReadAlong,
  ReadStamp,
  StoryThread,
  useIsSm,
} from "./craft";
import { ShotCard, SlateTag, TypeLine, Waveform } from "./primitives";
import { slate, type ShotModel } from "./shots";
import type { StationView } from "./stations";

export interface ViewProps {
  view: StationView;
  stageName: string;
  shots: ShotModel[];
  live: LiveAssets | null;
  job: JobStatusResponse | null;
  stage: StageRef | undefined;
  frames: { current: number; total: number };
  reduced: boolean;
  tint: string;
  swatches: string[];
  /** Stand-in look for this station (paper before art, sketch at art, graded after). */
  look: "paper" | "sketch" | "graded";
}

const sid = (s: ShotModel) => `shot-${s.order}`;
const developedShots = (shots: ShotModel[], frames: { current: number }) =>
  shots.filter((s, i) => s.frameUrl || i < frames.current);
const label = "font-mono text-[10px] font-medium uppercase tracking-[0.2em]";

/** Shared stage frame for each view: fills the monitor, centers its content. */
function SetPiece({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`absolute inset-0 flex items-center justify-center px-4 sm:px-8 ${className}`}>{children}</div>;
}

// --------------------------------------------------------------------------- //
// Development (brief): the pitch card, the scene plan slots underneath.
// --------------------------------------------------------------------------- //
function Development({ shots, job, live, reduced }: ViewProps) {
  const slots = shots.slice(0, 8);
  const tick = useTicker(1300, !reduced);
  const active = reduced ? -1 : tick % Math.max(1, slots.length);
  const firstPass = tick < slots.length;
  return (
    <SetPiece className="flex-col gap-6">
      <motion.div
        {...rise}
        transition={ENTER}
        className="relative w-full max-w-md rounded-[8px] bg-[#e9e1d0] p-4 text-midnight shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]"
      >
        {!reduced && (
          // Desk lamp glow breathing behind the pitch.
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(242,181,68,0.18),transparent)]"
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <p className={`${label} text-midnight/55`}>The brief</p>
        <TypeLine
          text={live?.logline ?? job?.prompt ?? "A new film"}
          reduced={reduced}
          className="mt-2 block text-[15px] leading-snug"
        />
      </motion.div>
      <div className="flex gap-2">
        {slots.map((s, i) => {
          const state: DraftState = reduced ? "written" : i === active ? "writing" : !firstPass || i < active ? "written" : "blank";
          return (
            <motion.div
              key={s.order}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: i === active ? -4 : 0 }}
              transition={{ default: { duration: 0.4, ease: EASE }, opacity: { ...ENTER, delay: 0.4 + stagger(i) } }}
            >
              <ShotCard
                shot={s}
                look="paper"
                reduced={reduced}
                layoutId={sid(s)}
                className={`h-[34px] w-[52px] transition-shadow duration-300 ${i === active ? "ring-2 ring-accent" : ""}`}
              >
                <div className="absolute inset-x-1.5 top-1.5">
                  <DraftLines key={state === "writing" ? tick : state} seed={s.order + 40} state={state} reduced={reduced} lines={2} perLine={0.5} pen={false} />
                </div>
              </ShotCard>
            </motion.div>
          );
        })}
      </div>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Paper stations: Writers' Room, Table Read, Story Notes. A corkboard of index
// cards, one per beat, pinned and strung on a story thread.
// --------------------------------------------------------------------------- //
const TILT = [-1.2, 0.8, -0.5, 1.1, -0.9, 0.6];

/** One pinned card. The grid cell stays put (the thread is tied to it); the card
 *  inside enters, tilts, and lifts toward you while it's being worked on. */
function PinnedCard({
  shot,
  i,
  reduced,
  lifted,
  ring,
  size,
  children,
  overlay,
  outside,
}: {
  shot: ShotModel;
  i: number;
  reduced: boolean;
  lifted: boolean;
  ring?: string;
  size: string;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  /** Rendered over the card but outside its clip (margin notes). */
  outside?: React.ReactNode;
}) {
  return (
    <div data-cell="1" className="relative">
      <Pin reduced={reduced} delay={0.25 + stagger(i, 0.08)} />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12, rotate: 0 }}
        animate={{
          opacity: 1,
          y: lifted && !reduced ? -5 : 0,
          scale: lifted && !reduced ? 1.04 : 1,
          rotate: lifted || reduced ? 0 : TILT[i % TILT.length],
        }}
        transition={{
          default: { duration: 0.45, ease: EASE },
          opacity: { ...ENTER, delay: stagger(i) },
        }}
        className={`relative ${lifted ? "z-10" : ""}`}
      >
        <ShotCard
          shot={shot}
          look="paper"
          reduced={reduced}
          layoutId={sid(shot)}
          className={`${size} transition-shadow duration-300 ${lifted ? `${ring ?? ""} shadow-[0_22px_40px_-16px_rgba(0,0,0,0.9)]` : ""}`}
        >
          <SlateTag n={shot.order} />
          <div className="absolute inset-x-2.5 bottom-2 top-7 overflow-hidden text-midnight">{children}</div>
          {overlay}
        </ShotCard>
        {outside}
      </motion.div>
    </div>
  );
}

const CARD = "h-[92px] w-[140px] sm:h-[104px] sm:w-[164px]";

/** Cards that fit the board at this width, and the shared work cycle: `active`
 *  is the card being worked on, `firstPass` until every card has had a turn. */
function useBoard(shots: ShotModel[], ms: number, run: boolean) {
  const sm = useIsSm();
  const cards = shots.slice(0, sm ? 6 : 4);
  const n = Math.max(1, cards.length);
  const tick = useTicker(ms, run);
  return { cards, n, tick, active: run ? tick % n : -1, firstPass: tick < n };
}

function Beat({ shot, speaker }: { shot: ShotModel; speaker?: boolean }) {
  return (
    <p className="line-clamp-4 text-[11px] leading-[14px] text-midnight/85">
      {speaker && shot.speaker && <span className="font-semibold">{shot.speaker}: </span>}
      {shot.beat}
    </p>
  );
}

function WritersHeader({ live, reduced }: { live: LiveAssets | null; reduced: boolean }) {
  return (
    <div className="min-h-8 max-w-xl text-center">
      {live?.title ? (
        <TypeLine text={live.title} reduced={reduced} className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink" />
      ) : (
        <span className={`${label} text-muted`}>Untitled, draft one</span>
      )}
      {live?.brief?.hook && (
        <motion.p {...rise} transition={{ ...ENTER, delay: 0.3 }} className="mt-1 line-clamp-1 text-xs text-muted">
          <span className={`${label} mr-1.5 text-accent`}>Hook</span>
          {live.brief.hook}
        </motion.p>
      )}
    </div>
  );
}

/** Writers' Room: a pencil drafts each card in turn, the thread strung to the
 *  card being written. Once every card is drafted the pencil keeps revising. */
function Writers({ shots, live, reduced }: ViewProps) {
  const PER_LINE = 0.55;
  const LINES = 4;
  const hasText = shots.some((s) => s.beat);
  const { cards, n, tick, active, firstPass } = useBoard(shots, LINES * PER_LINE * 1000 + 600, !reduced && !hasText);
  const grid = useRef<HTMLDivElement>(null);
  const strung = hasText || reduced || !firstPass ? n : active;

  return (
    <SetPiece>
      <div className="flex flex-col items-center gap-5">
        <WritersHeader live={live} reduced={reduced} />
        <div ref={grid} className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((s, i) => {
            const state: DraftState =
              reduced || hasText ? "written" : i === active ? "writing" : !firstPass || i < active ? "written" : "blank";
            return (
              <PinnedCard key={s.order} shot={s} i={i} reduced={reduced} lifted={i === active} ring="ring-2 ring-accent" size={CARD}>
                {s.beat ? (
                  <Beat shot={s} />
                ) : (
                  // Keyed by pass so a revision pass rewrites the card from scratch.
                  <DraftLines key={state === "writing" ? tick : state} seed={s.order} state={state} reduced={reduced} lines={LINES} perLine={PER_LINE} />
                )}
              </PinnedCard>
            );
          })}
          <StoryThread grid={grid} upTo={strung} reduced={reduced} count={cards.length} />
        </div>
      </div>
    </SetPiece>
  );
}

/** Table Read: each card is read aloud in turn, words lighting up as they're
 *  spoken; the speaking voice lights up at the table below. Read cards get stamped. */
function TableRead({ shots, reduced }: ViewProps) {
  const READ_S = 3.4;
  const { cards, tick, active, firstPass } = useBoard(shots, READ_S * 1000 + 600, !reduced);
  const grid = useRef<HTMLDivElement>(null);
  const hasText = shots.some((s) => s.beat);
  const voices = hasText
    ? Array.from(new Set(shots.filter((s) => s.beat).map((s) => s.speaker?.trim().toUpperCase() || "NARRATOR"))).slice(0, 5)
    : ["NARRATOR"];
  const now = active >= 0 ? cards[active] : undefined;
  const speaking = now ? now.speaker?.trim().toUpperCase() || "NARRATOR" : null;

  return (
    <SetPiece>
      <div className="flex flex-col items-center gap-4">
        <div ref={grid} className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((s, i) => {
            const reading = i === active;
            const read = !reading && active >= 0 && (!firstPass || i < active);
            return (
              <PinnedCard
                key={s.order}
                shot={s}
                i={i}
                reduced={reduced}
                lifted={reading}
                ring="ring-2 ring-accent"
                size="h-[92px] w-[140px] sm:h-[96px] sm:w-[164px]"
                overlay={read && <ReadStamp reduced={reduced} />}
              >
                {s.beat ? (
                  <p className="line-clamp-4 text-[11px] leading-[14px]">
                    {s.speaker && <span className={`font-semibold ${reading ? "text-midnight" : "text-midnight/85"}`}>{s.speaker}: </span>}
                    <ReadAlong text={s.beat} reading={reading} reduced={reduced} duration={READ_S * 0.9} dimClass={reading ? "text-midnight/30" : "text-midnight/85"} />
                  </p>
                ) : (
                  <div className="relative">
                    <DraftLines seed={s.order} state="written" reduced={reduced} lines={4} />
                    {reading && !reduced && <Highlight key={tick} top={0} reduced={reduced} />}
                  </div>
                )}
              </PinnedCard>
            );
          })}
          <StoryThread grid={grid} upTo={cards.length} reduced={reduced} count={cards.length} />
        </div>
        <CastTable voices={voices} speaking={speaking} reduced={reduced} />
      </div>
    </SetPiece>
  );
}

const NOTE_MARKS: LucideIcon[] = [Check, Scissors, Sparkles, Check, ArrowUpRight, Check];

/** Story Notes: the editor works the board card by card, highlighter across a
 *  line and a margin note slapped on; the judge's scores land alongside. */
function Notes({ shots, live, reduced }: ViewProps) {
  const { cards, tick, active, firstPass } = useBoard(shots, 1800, !reduced);
  const grid = useRef<HTMLDivElement>(null);
  const scores = Object.entries(live?.scores ?? {}).slice(0, 6);
  const showScores = scores.length > 0 || live?.score_overall != null;

  return (
    <SetPiece className="gap-8">
      <div ref={grid} className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((s, i) => {
          const reviewing = i === active;
          const reviewed = reduced || (!reviewing && (!firstPass || i < active));
          return (
            <PinnedCard
              key={s.order}
              shot={s}
              i={i}
              reduced={reduced}
              lifted={reviewing}
              ring="ring-2 ring-leader"
              size={CARD}
              outside={reviewed && <MarginNote icon={NOTE_MARKS[s.order % NOTE_MARKS.length]} reduced={reduced} tilt={i % 2 ? -6 : 6} />}
              overlay={
                <>
                  {reviewing && (
                    <motion.span
                      className="absolute bottom-1.5 left-2 right-2 h-[2px] origin-left rounded-full bg-leader"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1.4, ease: EASE }}
                    />
                  )}
                </>
              }
            >
              {reviewing && !reduced && <Highlight key={tick} top={(tick % 3) * 14} reduced={reduced} delay={0.2} />}
              <div className="relative">
                {s.beat ? <Beat shot={s} /> : <DraftLines seed={s.order} state="written" reduced={reduced} lines={4} />}
              </div>
            </PinnedCard>
          );
        })}
        <StoryThread grid={grid} upTo={cards.length} reduced={reduced} count={cards.length} />
      </div>
      {showScores && (
        <motion.div {...rise} transition={{ ...ENTER, delay: 0.2 }} className="hidden w-48 shrink-0 md:block">
          <p className={`${label} text-muted`}>Judge’s notes</p>
          {live?.score_overall != null && (
            <p className="mt-1 font-display text-5xl font-extrabold tabular-nums text-ink">
              <CountUp to={live.score_overall} reduced={reduced} />
              <span className="text-lg text-muted">/100</span>
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {scores.map(([k, v], i) => (
              <li key={k}>
                <div className="flex justify-between text-[11px] text-muted">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="tabular-nums text-ink">{v}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full origin-left rounded-full bg-accent"
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: v / 100 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.3 + stagger(i) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </SetPiece>
  );
}

/** A number that counts up to `to` once (instant under reduced motion). */
function CountUp({ to, reduced }: { to: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const c = animate(0, to, { duration: 1.1, ease: EASE, onUpdate: (v) => (el.textContent = String(Math.round(v))) });
    return () => c.stop();
  }, [to, reduced]);
  return <span ref={ref}>{to}</span>;
}

// --------------------------------------------------------------------------- //
// Art Department: the look reference + extracted swatches, the beats becoming
// sketched frames under that look, and the cast.
// --------------------------------------------------------------------------- //
const LOUPE = [
  [30, 28],
  [68, 40],
  [42, 66],
  [72, 76],
  [24, 52],
];

function Art({ shots, live, reduced, tint, swatches }: ViewProps) {
  const ref = live?.style_ref_url;
  const lead = shots[0];
  const sketches = shots.slice(0, 5);
  const tick = useTicker(1500, !reduced);
  const pick = tick % Math.max(1, swatches.length);
  const shading = reduced ? -1 : tick % Math.max(1, Math.min(sketches.length, 3));
  return (
    <SetPiece className="gap-6 sm:gap-10">
      <motion.div {...rise} transition={ENTER} className="flex shrink-0 flex-col items-center gap-3">
        <div className="relative h-[170px] w-[120px] overflow-hidden rounded-[8px] media-outline sm:h-[200px] sm:w-[140px]">
          {ref ? (
            <motion.img
              src={ref}
              alt=""
              className="h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          ) : (
            lead && <ShotCard shot={lead} look="sketch" tint={tint} reduced={reduced} className="h-full w-full" />
          )}
          <span className={`${label} absolute bottom-1.5 left-1.5 rounded-[3px] bg-midnight/80 px-1 py-px text-ink`}>Look ref</span>
          {!reduced && (
            <motion.span
              aria-hidden
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--color-ink),0_6px_14px_rgba(0,0,0,0.6)]"
              initial={false}
              animate={{
                left: `${LOUPE[tick % LOUPE.length][0]}%`,
                top: `${LOUPE[tick % LOUPE.length][1]}%`,
                backgroundColor: swatches[pick] ?? "#f2b544",
              }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          )}
        </div>
        <div className="flex gap-1.5">
          {swatches.map((c, i) => (
            <motion.span
              key={`${c}-${i}`}
              className={`h-5 w-5 rounded-full transition-shadow duration-300 ${
                i === pick && !reduced ? "shadow-[0_0_0_2px_var(--color-ink)]" : "shadow-[0_0_0_1px_rgba(239,232,218,0.15)]"
              }`}
              style={{ background: c }}
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: i === pick && !reduced ? 1.25 : 1 }}
              transition={{ default: { duration: 0.35, ease: EASE }, opacity: { ...ENTER, delay: 0.5 + stagger(i, 0.08) } }}
            />
          ))}
        </div>
      </motion.div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex gap-2.5">
          {sketches.map((s, i) => (
            <div key={s.order} className={i >= 3 ? "hidden sm:block" : ""}>
              <ShotCard
                shot={s}
                look="sketch"
                tint={tint}
                reduced={reduced}
                layoutId={sid(s)}
                className={`h-[132px] w-[74px] sm:h-[150px] sm:w-[84px] ${i === shading ? "ring-2 ring-accent" : ""}`}
              >
                <SlateTag n={s.order} />
                {i === shading && <Shading key={tick} />}
              </ShotCard>
            </div>
          ))}
        </div>
        {live?.cast.length ? (
          <div className="flex flex-wrap gap-3">
            {live.cast.slice(0, 4).map((c, i) => (
              <motion.div
                key={c.name}
                className="flex items-center gap-2"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ENTER, delay: 0.3 + stagger(i) }}
              >
                <span className="h-8 w-8 overflow-hidden rounded-full bg-surface-2 shadow-[0_0_0_1px_rgba(239,232,218,0.15)]">
                  {c.portrait_url && <img src={c.portrait_url} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="text-xs text-ink">{c.name}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className={`${label} text-muted`}>Casting…</p>
        )}
      </div>
    </SetPiece>
  );
}

/** Pencil cross-hatching sweeping across a sketch, the pencil riding the edge. */
function Shading() {
  return (
    <>
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(20,26,46,0.32)_0,rgba(20,26,46,0.32)_1px,transparent_1px,transparent_5px)] mix-blend-multiply"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 1.3, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ x: "0%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.3, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute left-0 top-1/2"
          animate={{ y: [-30, 26, -18, 34, -26] }}
          transition={{ duration: 1.3, ease: "easeInOut" }}
        >
          <Pencil />
        </motion.span>
      </motion.span>
    </>
  );
}

/** Big "03/06" progress counter: in flow above the content on phones,
 *  pinned to the monitor's top-right corner from sm up. */
function Counter({ n, of, what }: { n: number; of: number; what: string }) {
  return (
    <div className="mb-3 self-end text-right sm:absolute sm:right-6 sm:top-3 sm:mb-0">
      <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-ink sm:text-4xl">
        <span className="relative inline-flex overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={Math.min(n, of)}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {slate(Math.min(n, of))}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-lg text-muted">/{slate(of)}</span>
      </p>
      <p className={`${label} mt-1 text-muted`}>{what}</p>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Camera & Lab: the contact sheet. Frames develop on REAL progress.
// --------------------------------------------------------------------------- //
function Camera({ shots, frames, reduced, tint }: ViewProps) {
  const n = shots.length;
  const rows = n <= 8 ? 1 : n <= 18 ? 2 : 3;
  const cols = Math.ceil(n / rows);
  const tileH = rows === 1 ? 200 : rows === 2 ? 128 : 84;
  const done = (s: ShotModel, i: number) => !!s.frameUrl || i < frames.current;
  return (
    <SetPiece className="flex-col">
      <Counter n={frames.current} of={frames.total} what="Frames developed" />
      <div
        className="grid max-w-full gap-2 [grid-template-columns:repeat(var(--m),minmax(0,64px))] sm:[grid-template-columns:repeat(var(--c),minmax(0,var(--w)))]"
        style={
          {
            "--c": cols,
            "--w": `${Math.round((tileH * 9) / 16)}px`,
            // Phones: at least two rows so tiles stay legible.
            "--m": n > 3 ? Math.min(Math.ceil(n / Math.max(2, rows)), 5) : n,
          } as React.CSSProperties
        }
      >
        {shots.map((s, i) => {
          const developed = done(s, i);
          const next = !developed && i === frames.current;
          return (
            <div key={s.order} className="relative">
              <ShotCard
                shot={s}
                look="graded"
                developed={developed}
                tint={tint}
                reduced={reduced}
                layoutId={sid(s)}
                className={`aspect-[9/16] w-full ${next ? "ring-2 ring-accent" : ""}`}
              >
                {rows < 3 && <SlateTag n={s.order} />}
                {next && !reduced && (
                  <>
                    <motion.span
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      animate={{ x: ["-100%", "250%"] }}
                      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                    />
                    {/* Shutter flash. */}
                    <motion.span
                      className="absolute inset-0 bg-white"
                      animate={{ opacity: [0, 0, 0.55, 0] }}
                      transition={{ duration: 2.4, times: [0, 0.82, 0.86, 1], repeat: Infinity, ease: "easeOut" }}
                    />
                  </>
                )}
              </ShotCard>
            </div>
          );
        })}
      </div>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Voice Booth / Subtitles: a hero shot cycling through the developed frames.
// --------------------------------------------------------------------------- //
function useHero(shots: ShotModel[], frames: { current: number }, reduced: boolean, ms: number) {
  const pool = developedShots(shots, frames);
  const list = pool.length ? pool : shots;
  const tick = useTicker(ms, !reduced && list.length > 1);
  return list[tick % Math.max(1, list.length)];
}

function Hero({ shot, reduced, tint, children }: { shot: ShotModel; reduced: boolean; tint: string; children?: React.ReactNode }) {
  return (
    <div className="relative h-[230px] w-[130px] shrink-0 sm:h-[270px] sm:w-[152px]">
      <AnimatePresence initial={false}>
        <motion.div
          key={shot.order}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <ShotCard shot={shot} look="graded" developed tint={tint} reduced={reduced} kenBurns className="h-full w-full">
            <SlateTag n={shot.order} />
            {children}
          </ShotCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Voice({ shots, frames, live, reduced, tint }: ViewProps) {
  const hero = useHero(shots, frames, reduced, 3600);
  const wave = useWaveform(live?.narration_url ?? null, 7);
  return (
    <SetPiece className="gap-6 sm:gap-10">
      {hero && <Hero shot={hero} reduced={reduced} tint={tint} />}
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {!reduced && <span className="absolute inset-0 animate-ping rounded-full bg-state-bad/60" />}
            <span className="relative h-2.5 w-2.5 rounded-full bg-state-bad" />
          </span>
          <span className={`${label} text-ink`}>On air</span>
          <span className={`${label} text-muted`}>· Narrator</span>
        </div>
        <Waveform peaks={wave.peaks} sweep reduced={reduced} duration={7} className="h-14 w-full" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hero?.order}
            {...rise}
            transition={ENTER}
            className="min-h-[3.5rem] text-[15px] italic leading-snug"
          >
            {hero?.beat ? (
              <ReadAlong
                text={`“${hero.beat}”`}
                reading
                reduced={reduced}
                duration={3.2}
                litClass="text-ink/90"
                dimClass="text-ink/30"
                marker="bg-accent/25"
              />
            ) : (
              ""
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </SetPiece>
  );
}

function tc(seconds: number) {
  const s = Math.max(0, seconds);
  const f = Math.floor((s % 1) * 24);
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return `${pad(s / 60)}:${pad(s % 60)}:${pad(f)}`;
}

function Subtitles({ shots, frames, job, reduced, tint }: ViewProps) {
  const hero = useHero(shots, frames, reduced, 4200);
  const per = (job?.duration ?? 30) / Math.max(1, shots.length);
  const lines = shots.filter((s) => s.beat).slice(0, 5);
  return (
    <SetPiece className="gap-6 sm:gap-10">
      {hero && (
        <Hero shot={hero} reduced={reduced} tint={tint}>
          {hero.beat && (
            <div className="absolute inset-x-2 bottom-3 flex justify-center">
              <span className="rounded-[4px] bg-midnight/80 px-1.5 py-1 text-center text-[10px] font-semibold leading-tight text-ink">
                <TypeLine key={hero.order} text={hero.beat.slice(0, 90)} reduced={reduced} cps={28} caret={false} />
              </span>
            </div>
          )}
        </Hero>
      )}
      <ul className="hidden w-full max-w-sm space-y-2 sm:block">
        {(lines.length ? lines : shots.slice(0, 5)).map((s) => {
          const on = s.order === hero?.order;
          return (
            <li key={s.order} className={`rounded-[6px] px-3 py-2 transition-colors duration-150 ${on ? "bg-white/[0.06]" : ""}`}>
              <p className={`font-mono text-[10px] tabular-nums ${on ? "text-accent" : "text-muted"}`}>
                {tc((s.order - 1) * per)} → {tc(s.order * per)}
              </p>
              <p className={`mt-0.5 line-clamp-1 text-[13px] ${on ? "text-ink" : "text-muted"}`}>{s.beat ?? "…"}</p>
              {on && !reduced && (
                <motion.span
                  key={s.order}
                  className="mt-1.5 block h-[2px] origin-left rounded-full bg-accent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 4.2, ease: "linear" }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Motion Unit: the shots start to move; finished clips play.
// --------------------------------------------------------------------------- //
function Vfx({ shots, live, stage, reduced, tint }: ViewProps) {
  const filmed = stage?.progress_current ?? live?.clips.length ?? 0;
  const total = stage?.progress_total ?? shots.length;
  const row = shots.slice(0, 5);
  const held = stage?.status === "paused"; // paused: the next scene waits, nothing rolls
  return (
    <SetPiece className="flex-col">
      <Counter n={filmed} of={total} what="Scenes filmed" />
      <div className="flex gap-2.5">
        {row.map((s, i) => {
          const next = i === filmed;
          const rolling = next && !held;
          const ok = !!s.clipUrl || i < filmed;
          return (
            <div key={s.order} className={i >= 3 ? "hidden sm:block" : ""}>
              <ShotCard
                shot={s}
                look="graded"
                developed
                tint={tint}
                reduced={reduced}
                kenBurns={ok || rolling}
                playClip
                layoutId={sid(s)}
                className={`h-[180px] w-[101px] sm:h-[204px] sm:w-[115px] ${rolling ? "ring-2 ring-accent" : ""}`}
              >
                <SlateTag n={s.order} />
                <span
                  className={`${label} absolute bottom-1.5 left-1.5 rounded-[3px] bg-midnight/80 px-1 py-px ${
                    ok ? "text-state-ok" : rolling ? "text-state-bad" : next ? "text-state-warn" : "text-muted"
                  }`}
                >
                  {ok ? "Take ok" : rolling ? "● Rolling" : next ? "❚❚ Held" : "Standby"}
                </span>
                {rolling && <Clapper reduced={reduced} />}
              </ShotCard>
            </div>
          );
        })}
      </div>
    </SetPiece>
  );
}

/** A little clapperboard snapping shut on each take. */
function Clapper({ reduced }: { reduced: boolean }) {
  const stripes = "bg-[repeating-linear-gradient(115deg,#efe8da_0,#efe8da_4px,#141a2e_4px,#141a2e_8px)]";
  return (
    <span aria-hidden className="absolute right-1.5 top-1.5 block h-[18px] w-[26px]">
      <motion.span
        className={`absolute left-0 top-0 h-[5px] w-full origin-left rounded-[1px] ${stripes}`}
        initial={false}
        animate={reduced ? { rotate: 0 } : { rotate: [-28, -28, 0, 0] }}
        transition={reduced ? { duration: 0 } : { duration: 2, times: [0, 0.7, 0.78, 1], repeat: Infinity, ease: "easeIn" }}
      />
      <span className="absolute inset-x-0 bottom-0 top-[6px] rounded-[1px] bg-midnight shadow-[0_0_0_1px_rgba(239,232,218,0.3)]">
        <span className={`absolute inset-x-0 top-0 h-[3px] ${stripes}`} />
      </span>
    </span>
  );
}

// --------------------------------------------------------------------------- //
// Scoring Stage: a score ribbon threads through the shots.
// --------------------------------------------------------------------------- //
function Score({ shots, live, reduced, tint }: ViewProps) {
  const wave = useWaveform(live?.music_url ?? null, 11, 96);
  return (
    <SetPiece className="flex-col gap-5">
      <div className="relative">
        <div className="flex gap-2.5 opacity-80">
          {shots.slice(0, 6).map((s, i) => (
            <div key={s.order} className={i >= 4 ? "hidden sm:block" : ""}>
              <ShotCard shot={s} look="graded" developed tint={tint} reduced={reduced} layoutId={sid(s)} className="h-[150px] w-[84px]" />
            </div>
          ))}
        </div>
        <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-[-24px] top-1/2 h-24 w-[calc(100%+48px)] -translate-y-1/2" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1="0" x2="600" y1={40 + k * 10} y2={40 + k * 10} stroke="rgba(239,232,218,0.18)" strokeWidth="1" />
          ))}
          <motion.path
            d="M0 60 C 75 20, 125 100, 200 60 S 325 20, 400 60 S 525 100, 600 60"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.4, ease: EASE }}
          />
          {[90, 210, 330, 450, 540].map((x, k) => (
            <motion.circle
              key={x}
              cx={x}
              cy={[45, 70, 50, 75, 55][k]}
              r="4.5"
              fill="var(--color-ink)"
              initial={reduced ? false : { opacity: 0, scale: 0 }}
              animate={reduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                default: { ...ENTER, delay: 0.8 + k * 0.25 },
                y: { duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: 1.6 + k * 0.28 },
              }}
            />
          ))}
        </svg>
        {!reduced && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-24 -translate-y-1/2">
            <motion.div
              className="h-full w-full"
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 4.5, ease: "linear", repeat: Infinity }}
            >
              <div className="h-full w-[2px] bg-gradient-to-b from-transparent via-accent to-transparent shadow-[0_0_12px_var(--color-accent)]" />
            </motion.div>
          </div>
        )}
      </div>
      <div className="flex w-full max-w-lg items-center gap-3">
        <span className={`${label} w-12 text-muted`}>Score</span>
        <Waveform peaks={wave.peaks} sweep reduced={reduced} duration={9} className="h-10 flex-1" />
      </div>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Edit Bay: picture and sound on a timeline, a playhead running the cut.
// --------------------------------------------------------------------------- //
function Edit({ shots, live, job, reduced, tint }: ViewProps) {
  const voice = useWaveform(live?.narration_url ?? null, 7, 120);
  const music = useWaveform(live?.music_url ?? null, 11, 120);
  const dur = job?.duration ?? 30;
  const run = !reduced;
  const n = Math.max(1, shots.length);
  const head = useMotionValue(0.38);
  const headX = useTransform(head, (v) => `${v * 100}%`);
  const [clip, setClip] = useState(-1);
  useMotionValueEvent(head, "change", (v) => setClip(Math.min(n - 1, Math.floor(v * n))));
  useEffect(() => {
    if (!run) {
      head.set(0.38);
      return;
    }
    const c = animate(head, [0, 1], { duration: 8, ease: "linear", repeat: Infinity });
    return () => c.stop();
  }, [run, head]);
  return (
    <SetPiece>
      <div className="w-full max-w-3xl">
        <div className="ml-12 flex justify-between font-mono text-[10px] tabular-nums text-muted">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <span key={p}>{tc(p * dur).slice(0, 5)}</span>
          ))}
        </div>
        <div className="relative mt-2 space-y-2">
          <Track name="V1">
            <div className="flex h-full gap-px">
              {shots.map((s, i) => (
                <ShotCard
                  key={s.order}
                  shot={s}
                  look="graded"
                  developed
                  tint={tint}
                  reduced={reduced}
                  layoutId={sid(s)}
                  radius="rounded-[3px]"
                  className={`h-full min-w-0 flex-1 transition-[opacity,filter] duration-200 ${
                    clip === i || clip < 0 ? "" : "opacity-55 saturate-50"
                  }`}
                />
              ))}
            </div>
          </Track>
          <Track name="A1">
            <Waveform peaks={voice.peaks} reduced={reduced} lit="var(--color-ink)" className="h-full w-full" />
          </Track>
          <Track name="A2">
            <Waveform peaks={music.peaks} reduced={reduced} lit="var(--color-leader)" className="h-full w-full" />
          </Track>
          <div className="pointer-events-none absolute inset-y-[-6px] left-12 right-0">
            <motion.div className="h-full w-full" style={{ x: headX }}>
              <div className="relative h-full w-[2px] bg-accent">
                <span className="absolute -left-[5px] -top-1 h-3 w-3 rotate-45 rounded-[2px] bg-accent" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SetPiece>
  );
}

function Track({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 font-mono text-[10px] text-muted">{name}</span>
      <div className="h-14 min-w-0 flex-1 overflow-hidden rounded-[4px] bg-white/[0.04] p-1 sm:h-16">{children}</div>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Screening Room: the finished cut plays for a fresh viewer.
// --------------------------------------------------------------------------- //
function Screening({ shots, frames, reduced, tint }: ViewProps) {
  const hero = useHero(shots, frames, reduced, 2400);
  return (
    <SetPiece className="flex-col gap-4">
      <div className="relative">
        {hero && <Hero shot={hero} reduced={reduced} tint={tint} />}
        {/* Projector spill over the screen, flickering like a lamp. */}
        <motion.div
          className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(242,181,68,0.16),transparent_70%)]"
          animate={reduced ? { opacity: 1 } : { opacity: [1, 0.75, 1, 0.88, 1, 0.8, 1] }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <Audience reduced={reduced} />
      </div>
      <p className={`${label} text-muted`}>Test screening · Scene {slate(hero?.order ?? 1)}</p>
    </SetPiece>
  );
}

const HEADS = [
  { x: -78, s: 0.92, d: 5.2 },
  { x: -36, s: 1.06, d: 6.4 },
  { x: 8, s: 0.98, d: 4.6 },
  { x: 50, s: 1.1, d: 7.1 },
  { x: 92, s: 0.9, d: 5.8 },
];

/** A front row in silhouette, shifting now and then in their seats. */
function Audience({ reduced }: { reduced: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -bottom-3 left-1/2 h-12 w-0">
      {HEADS.map((h, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 40 44"
          className="absolute bottom-0 h-12 w-11 drop-shadow-[0_-1px_0_rgba(242,181,68,0.25)]"
          style={{ left: h.x - 22, scale: h.s, originY: 1 }}
          animate={reduced ? { rotate: 0 } : { rotate: [0, 0, i % 2 ? 4 : -4, 0, 0] }}
          transition={reduced ? { duration: 0 } : { duration: h.d, repeat: Infinity, ease: "easeInOut", times: [0, 0.55, 0.65, 0.78, 1] }}
        >
          <circle cx="20" cy="15" r="10" fill="#0b0f1d" />
          <path d="M2 44 C 2 30, 10 25, 20 25 C 30 25, 38 30, 38 44 Z" fill="#0b0f1d" />
        </motion.svg>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Release: the cover and the post caption, ready for premiere.
// --------------------------------------------------------------------------- //
const PLATFORMS = ["TikTok", "Reels", "Shorts"];

function Release({ shots, live, reduced, tint }: ViewProps) {
  const lead = shots[0];
  const tick = useTicker(1400, !reduced);
  const lit = reduced ? -1 : tick % PLATFORMS.length;
  return (
    <SetPiece className="gap-6 sm:gap-10">
      <motion.div
        className="relative h-[240px] w-[135px] shrink-0 sm:h-[280px] sm:w-[158px]"
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {live?.cover_url ? (
          <img src={live.cover_url} alt="" className="h-full w-full rounded-[8px] object-cover media-outline" />
        ) : (
          lead && <ShotCard shot={lead} look="graded" developed tint={tint} reduced={reduced} layoutId={sid(lead)} className="h-full w-full" />
        )}
        {!reduced && (
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[8px]">
            <motion.span
              className="absolute inset-y-[-20%] w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ["-150%", "400%"] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.2 }}
            />
          </span>
        )}
      </motion.div>
      <div className="max-w-sm space-y-3">
        <p className={`${label} text-accent`}>Ready for premiere</p>
        <p className="font-display text-3xl font-extrabold uppercase leading-none tracking-wide text-ink">
          {live?.title ?? "Your film"}
        </p>
        {live?.caption && <TypeLine text={live.caption} reduced={reduced} className="block text-sm leading-relaxed text-ink/85" />}
        {live?.review?.score != null && (
          <motion.div {...rise} transition={{ ...ENTER, delay: 0.3 }} className="flex items-baseline gap-2">
            <span className={`${label} text-muted`}>Test screening</span>
            <span className="font-display text-xl font-extrabold tabular-nums text-ink">
              {live.review.score}
              <span className="text-xs text-muted">/100</span>
            </span>
          </motion.div>
        )}
        {live?.review?.retelling && (
          <p className="line-clamp-2 text-xs italic text-muted">“{live.review.retelling}”</p>
        )}
        <div className="flex gap-1.5 pt-1">
          {PLATFORMS.map((p, i) => (
            <span
              key={p}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-[color,background-color,box-shadow] duration-300 ${
                i === lit ? "bg-accent/15 text-ink shadow-[inset_0_0_0_1px_var(--color-accent)]" : "bg-white/[0.06] text-muted"
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </SetPiece>
  );
}

function Generic({ shots, reduced, tint }: ViewProps) {
  return (
    <SetPiece>
      <div className="flex gap-2.5">
        {shots.slice(0, 5).map((s, i) => (
          <div key={s.order} className={i >= 3 ? "hidden sm:block" : ""}>
            <ShotCard shot={s} look="graded" developed tint={tint} reduced={reduced} layoutId={sid(s)} className="h-[190px] w-[107px]" />
          </div>
        ))}
      </div>
    </SetPiece>
  );
}

export function StationView(props: ViewProps) {
  switch (props.view) {
    case "development":
      return <Development {...props} />;
    case "writers":
      return <Writers {...props} />;
    case "tableread":
      return <TableRead {...props} />;
    case "notes":
      return <Notes {...props} />;
    case "art":
      return <Art {...props} />;
    case "camera":
      return <Camera {...props} />;
    case "voice":
      return <Voice {...props} />;
    case "subtitles":
      return <Subtitles {...props} />;
    case "vfx":
      return <Vfx {...props} />;
    case "score":
      return <Score {...props} />;
    case "edit":
      return <Edit {...props} />;
    case "screening":
      return <Screening {...props} />;
    case "release":
      return <Release {...props} />;
    default:
      return <Generic {...props} />;
  }
}
