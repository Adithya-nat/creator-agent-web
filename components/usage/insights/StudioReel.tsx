"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { EASE } from "@/components/production/motion";
import { AnimatedNumber, fmtInt } from "@/components/usage/AnimatedNumber";
import { Kicker } from "@/components/usage/insights/Section";
import { ago, fmtCompact, fmtRuntime } from "@/lib/insights";
import type { FilmPoint, StudioStats, UsageScope } from "@/lib/types";

/**
 * One frame per finished film, oldest on the left. The frame's light is its film score,
 * so the strip reads as "how many, and how good" at a glance. Frames advance in once.
 */
function Filmstrip({ films }: { films: FilmPoint[] }) {
  const reduce = useReducedMotion();
  if (films.length === 0) return null;
  const scored = films.filter((f) => f.film_score != null).length;
  return (
    <div
      className="relative mt-6 rounded-lg bg-black/50 px-2 py-3 shadow-[inset_0_0_0_1px_var(--color-line)]"
      role="img"
      aria-label={`${films.length} finished films${scored ? `, ${scored} with a film score` : ""}. Brighter frames scored higher.`}
    >
      {/* sprocket holes, top and bottom */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1 h-1 bg-[radial-gradient(circle,rgba(244,239,230,0.16)_1.2px,transparent_1.6px)] bg-[length:10px_4px]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-1 h-1 bg-[radial-gradient(circle,rgba(244,239,230,0.16)_1.2px,transparent_1.6px)] bg-[length:10px_4px]" />
      <ol className="flex h-12 items-stretch gap-[3px]">
        {films.map((f, i) => {
          const light = f.film_score != null ? 0.25 + (f.film_score / 100) * 0.75 : 0.12;
          return (
            <motion.li
              key={f.n}
              className="min-w-[6px] flex-1 origin-bottom rounded-[3px]"
              style={{ background: `rgba(242, 181, 68, ${light})` }}
              title={`Film #${f.n}${f.film_score != null ? ` · ${f.film_score}/100` : " · not reviewed"}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : 0.25 + Math.min(i * 0.025, 1) }}
            />
          );
        })}
      </ol>
    </div>
  );
}

function Credit({ value, format, label }: { value: number; format: (v: number) => string; label: string }) {
  return (
    <div className="min-w-0">
      <AnimatedNumber value={value} format={format} className="block font-display text-2xl font-semibold text-ink" />
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function Streak({ s, personal }: { s: StudioStats; personal: boolean }) {
  const reduce = useReducedMotion();
  const madeToday = ago(s.last_at) === "today";
  const alive = s.current_streak > 0;
  const nudge = !personal
    ? null
    : alive && !madeToday
      ? "Make a film today to keep it going."
      : !alive
        ? "Make a film today to start one."
        : "You're on it today.";
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3 sm:min-w-56">
      <motion.span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${alive ? "bg-accent/15 text-accent" : "bg-ink/[0.06] text-muted"}`}
        initial={reduce ? false : { scale: 0.25, opacity: 0, filter: "blur(4px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.2 }}
        aria-hidden="true"
      >
        <Flame className="size-5" strokeWidth={2} />
      </motion.span>
      <div className="min-w-0">
        <p className="text-sm text-ink">
          <AnimatedNumber value={s.current_streak} format={fmtInt} className="font-display text-xl font-semibold" /> day streak
        </p>
        <p className="text-xs text-muted">
          Longest {s.longest_streak} · {s.active_days} active {s.active_days === 1 ? "day" : "days"}
        </p>
        {nudge && <p className="mt-0.5 text-xs text-accent/90">{nudge}</p>}
      </div>
    </div>
  );
}

/** The headline: how much you (or everyone) have made, as a filmstrip and credits. */
export function StudioReel({ stats, scope }: { stats: StudioStats; scope: UsageScope }) {
  const personal = scope === "me";
  const since = stats.first_at ? new Date(stats.first_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
  const last = ago(stats.last_at);
  return (
    <section className="glass relative overflow-hidden p-5 sm:p-7" aria-labelledby="reel-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Kicker>{personal ? "Your studio · all time" : "The whole studio · all time"}</Kicker>
          <h2 id="reel-title" className="mt-2 flex items-baseline gap-3">
            <AnimatedNumber value={stats.films} format={fmtInt} className="font-display text-6xl font-semibold tracking-tight text-ink sm:text-7xl" />
            <span className="text-lg text-muted">{stats.films === 1 ? "film made" : "films made"}</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            {stats.runs === 0
              ? "No runs yet. Your first film starts the reel."
              : <>
                  from {fmtInt(stats.runs)} {stats.runs === 1 ? "run" : "runs"}
                  {!personal && stats.creators > 0 && <> by {stats.creators} {stats.creators === 1 ? "creator" : "creators"}</>}
                  {since && <> since {since}</>}
                  {last && <> · last one {last}</>}
                </>}
          </p>
        </div>
        <Streak s={stats} personal={personal} />
      </div>

      <Filmstrip films={stats.timeline} />

      <div className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        <Credit value={stats.screen_seconds} format={fmtRuntime} label="of finished film" />
        <Credit value={stats.scenes} format={fmtInt} label={`scenes shot${stats.scenes ? ` · ${Math.round((stats.ai_scenes / stats.scenes) * 100)}% by AI video` : ""}`} />
        <Credit value={stats.images} format={fmtCompact} label="frames drawn" />
        <Credit value={stats.renders} format={fmtInt} label="AI takes rendered" />
        <Credit value={stats.songs} format={fmtInt} label={stats.songs === 1 ? "score composed" : "scores composed"} />
        <Credit value={stats.published} format={fmtInt} label="in the film library" />
      </div>
    </section>
  );
}
