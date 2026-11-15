"use client";

/* eslint-disable @next/next/no-img-element -- runtime API/poster URLs (see primitives). */

import { AnimatePresence, motion } from "framer-motion";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";
import { useTicker, useWaveform } from "./media";
import { ENTER, EASE, rise, stagger } from "./motion";
import { PencilLines, ShotCard, SlateTag, TypeLine, Waveform } from "./primitives";
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
  return (
    <SetPiece className="flex-col gap-6">
      <motion.div
        {...rise}
        transition={ENTER}
        className="w-full max-w-md rounded-[8px] bg-[#e9e1d0] p-4 text-midnight shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]"
      >
        <p className={`${label} text-midnight/55`}>The brief</p>
        <TypeLine
          text={live?.logline ?? job?.prompt ?? "A new film"}
          reduced={reduced}
          className="mt-2 block text-[15px] leading-snug"
        />
      </motion.div>
      <div className="flex gap-2">
        {shots.slice(0, 8).map((s, i) => (
          <motion.div
            key={s.order}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...ENTER, delay: 0.4 + stagger(i) }}
          >
            <ShotCard shot={s} look="paper" reduced={reduced} layoutId={sid(s)} className="h-[30px] w-[46px]" />
          </motion.div>
        ))}
      </div>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Writers' Room / Story Notes / Table Read: a board of index cards, one per beat.
// --------------------------------------------------------------------------- //
function IndexCard({
  shot,
  i,
  reduced,
  reviewing,
  speaker,
}: {
  shot: ShotModel;
  i: number;
  reduced: boolean;
  reviewing?: boolean;
  speaker?: boolean;
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: reviewing && !reduced ? -6 : 0 }}
      transition={{ ...ENTER, delay: reviewing === undefined ? stagger(i) : 0 }}
      className={i >= 4 ? "hidden sm:block" : ""}
    >
      <ShotCard
        shot={shot}
        look="paper"
        reduced={reduced}
        layoutId={sid(shot)}
        className={`h-[92px] w-[140px] sm:h-[104px] sm:w-[164px] ${reviewing ? "ring-2 ring-leader" : ""}`}
      >
        <SlateTag n={shot.order} />
        <div className="absolute inset-x-2 bottom-2 top-6 overflow-hidden text-midnight">
          {shot.beat ? (
            <p className="line-clamp-4 text-[11px] leading-[14px] text-midnight/85">
              {speaker && shot.speaker && <span className="font-semibold">{shot.speaker}: </span>}
              {shot.beat}
            </p>
          ) : (
            <PencilLines lines={4} reduced={reduced} delay={0.3 + i * 0.25} />
          )}
        </div>
        {reviewing && (
          <motion.span
            className="absolute bottom-1.5 left-2 right-2 h-[2px] origin-left rounded-full bg-leader"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        )}
      </ShotCard>
    </motion.div>
  );
}

function Board({ shots, live, reduced, stageName, view }: ViewProps) {
  const cards = shots.slice(0, 6);
  const reviewing = view === "notes";
  const tick = useTicker(1600, reviewing && !reduced);
  const active = reviewing ? tick % Math.max(1, Math.min(cards.length, 6)) : -1;
  const scores = Object.entries(live?.scores ?? {}).slice(0, 6);
  const showScores = stageName === "reflection" && (scores.length > 0 || live?.score_overall != null);

  return (
    <SetPiece className="gap-8">
      <div className="flex flex-col items-center gap-4">
        {view === "writers" && (
          <div className="h-8 text-center">
            {live?.title ? (
              <TypeLine text={live.title} reduced={reduced} className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink" />
            ) : (
              <span className={`${label} text-muted`}>Untitled, draft one</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((s, i) => (
            <IndexCard
              key={s.order}
              shot={s}
              i={i}
              reduced={reduced}
              reviewing={reviewing ? i === active : undefined}
              speaker={stageName === "dialogue_pass"}
            />
          ))}
        </div>
      </div>
      {showScores && (
        <motion.div {...rise} transition={{ ...ENTER, delay: 0.2 }} className="hidden w-48 shrink-0 md:block">
          <p className={`${label} text-muted`}>Judge’s notes</p>
          {live?.score_overall != null && (
            <p className="mt-1 font-display text-5xl font-extrabold tabular-nums text-ink">
              {live.score_overall}
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

// --------------------------------------------------------------------------- //
// Art Department: the look reference + extracted swatches, the beats becoming
// sketched frames under that look, and the cast.
// --------------------------------------------------------------------------- //
function Art({ shots, live, reduced, tint, swatches }: ViewProps) {
  const ref = live?.style_ref_url;
  const lead = shots[0];
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
        </div>
        <div className="flex gap-1.5">
          {swatches.map((c, i) => (
            <motion.span
              key={`${c}-${i}`}
              className="h-5 w-5 rounded-full shadow-[0_0_0_1px_rgba(239,232,218,0.15)]"
              style={{ background: c }}
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...ENTER, delay: 0.5 + stagger(i, 0.08) }}
            />
          ))}
        </div>
      </motion.div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex gap-2.5">
          {shots.slice(0, 5).map((s, i) => (
            <div key={s.order} className={i >= 3 ? "hidden sm:block" : ""}>
              <ShotCard
                shot={s}
                look="sketch"
                tint={tint}
                reduced={reduced}
                layoutId={sid(s)}
                className="h-[132px] w-[74px] sm:h-[150px] sm:w-[84px]"
              >
                <SlateTag n={s.order} />
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

/** Big "03/06" progress counter: in flow above the content on phones,
 *  pinned to the monitor's top-right corner from sm up. */
function Counter({ n, of, what }: { n: number; of: number; what: string }) {
  return (
    <div className="mb-3 self-end text-right sm:absolute sm:right-6 sm:top-3 sm:mb-0">
      <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-ink sm:text-4xl">
        {slate(Math.min(n, of))}
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
                  <motion.span
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    animate={{ x: ["-100%", "250%"] }}
                    transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  />
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
            className="min-h-[3.5rem] text-[15px] italic leading-snug text-ink/90"
          >
            {hero?.beat ? `“${hero.beat}”` : ""}
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
  return (
    <SetPiece className="flex-col">
      <Counter n={filmed} of={total} what="Scenes filmed" />
      <div className="flex gap-2.5">
        {row.map((s, i) => {
          const rolling = i === filmed;
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
                    ok ? "text-state-ok" : rolling ? "text-state-bad" : "text-muted"
                  }`}
                >
                  {ok ? "Take ok" : rolling ? "● Rolling" : "Standby"}
                </span>
              </ShotCard>
            </div>
          );
        })}
      </div>
    </SetPiece>
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
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...ENTER, delay: 0.8 + k * 0.25 }}
            />
          ))}
        </svg>
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
              {shots.map((s) => (
                <ShotCard
                  key={s.order}
                  shot={s}
                  look="graded"
                  developed
                  tint={tint}
                  reduced={reduced}
                  layoutId={sid(s)}
                  radius="rounded-[3px]"
                  className="h-full min-w-0 flex-1"
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
            <motion.div
              className="h-full w-full"
              initial={false}
              animate={run ? { x: ["0%", "100%"] } : { x: "38%" }}
              transition={run ? { duration: 8, ease: "linear", repeat: Infinity } : { duration: 0 }}
            >
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
        {/* Projector spill over the screen. */}
        <div className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(242,181,68,0.12),transparent_70%)]" />
      </div>
      <p className={`${label} text-muted`}>Test screening · Scene {slate(hero?.order ?? 1)}</p>
    </SetPiece>
  );
}

// --------------------------------------------------------------------------- //
// Release: the cover and the post caption, ready for premiere.
// --------------------------------------------------------------------------- //
function Release({ shots, live, reduced, tint }: ViewProps) {
  const lead = shots[0];
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
      </motion.div>
      <div className="max-w-sm space-y-3">
        <p className={`${label} text-accent`}>Ready for premiere</p>
        <p className="font-display text-3xl font-extrabold uppercase leading-none tracking-wide text-ink">
          {live?.title ?? "Your film"}
        </p>
        {live?.caption && <TypeLine text={live.caption} reduced={reduced} className="block text-sm leading-relaxed text-ink/85" />}
        <div className="flex gap-1.5 pt-1">
          {["TikTok", "Reels", "Shorts"].map((p) => (
            <span key={p} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-muted">
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
    case "notes":
      return <Board {...props} />;
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
