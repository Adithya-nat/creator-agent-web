"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Star, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EASE } from "@/components/production/motion";
import { filmsPage } from "@/components/studio/showcase";
import { AnimatedNumber } from "@/components/usage/AnimatedNumber";
import { GrowBar, Panel } from "@/components/usage/insights/Section";
import { api } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { bestFilm, fmtRuntime, pageToScreen, scoreTrend, spotLabel, spotPicks, STYLE_LABEL, stageShares } from "@/lib/insights";
import { STAGE_LABELS, type StudioStats, type UsageScope } from "@/lib/types";

const FILM = "#f2b544"; // accent: the finished film
const SCRIPT = "#6ee7f9"; // leak: the script on the page
const AXIS = { stroke: "rgba(255,255,255,0.18)", tick: { fill: "#9aa0b4", fontSize: 11 } };
const TOOLTIP = {
  contentStyle: { background: "#1a1d28", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#edeff7" },
  itemStyle: { color: "#edeff7" },
  cursor: { stroke: "rgba(255,255,255,0.12)" },
};
const SERIES: Record<string, string> = { film_score: "Finished film", judge_score: "Script" };

function Figure({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-ink/[0.035] px-3.5 py-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 font-display text-2xl font-semibold text-ink">{children}</div>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Script score vs finished-film score, film by film, with the trend and the gap called out. */
export function ScoreTimeline({ stats, scope }: { stats: StudioStats; scope: UsageScope }) {
  const reduce = useReducedMotion();
  const rows = stats.timeline.filter((f) => f.film_score != null || f.judge_score != null);
  const trend = scoreTrend(stats.timeline);
  const gap = pageToScreen(stats.timeline);
  const best = bestFilm(stats.timeline);
  const up = trend && trend.delta >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <Panel
      kicker="Craft"
      title={scope === "me" ? "Is your filmmaking getting better?" : "Is the studio's filmmaking getting better?"}
      aside="Script = the story judge, before filming. Film = the review of the finished cut."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Figure
          label={trend ? `Last ${trend.window} films` : "Recent films"}
          note={trend ? `vs ${Math.round(trend.earlier)} before` : "Needs 4 reviewed films"}
        >
          {trend ? (
            <span className="flex items-center gap-2">
              <AnimatedNumber value={trend.recent} format={(v) => `${Math.round(v)}`} />
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${up ? "bg-state-ok/15 text-state-ok" : "bg-state-bad/15 text-state-bad"}`}>
                <Trend className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                {up ? "+" : "−"}{Math.abs(Math.round(trend.delta))} pts
              </span>
            </span>
          ) : "—"}
        </Figure>
        <Figure label="Page to screen" note={gap != null ? (gap > 0 ? "points lost between script and cut" : "the cut beats the script") : "Needs a reviewed film"}>
          {gap != null ? <AnimatedNumber value={-gap} format={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v))} pts`} /> : "—"}
        </Figure>
        <Figure label="Best film" note={best ? `#${best.n} · ${STYLE_LABEL[best.style] ?? best.style} ${best.duration}s · ${formatUSD(best.cost_usd)}` : "Needs a reviewed film"}>
          {best ? (
            <span className="flex items-center gap-2">
              <Trophy className="size-5 text-accent" strokeWidth={2} aria-hidden="true" />
              <AnimatedNumber value={best.film_score} format={(v) => `${Math.round(v)}/100`} />
              {best.job_id && (
                <Link href={`/status/${best.job_id}`} className="press ml-auto inline-flex items-center gap-0.5 text-xs font-normal text-muted hover:text-ink">
                  Open<ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              )}
            </span>
          ) : "—"}
        </Figure>
      </div>

      {rows.length >= 2 ? (
        <div className="mt-5">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="n" {...AXIS} tickFormatter={(n: number) => `#${n}`} />
              <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={44} />
              <Tooltip {...TOOLTIP} labelFormatter={(n) => `Film #${n}`} formatter={(v, k) => [`${v}/100`, SERIES[String(k)] ?? String(k)]} />
              <Legend formatter={(k: string) => <span className="text-xs text-muted">{SERIES[k] ?? k}</span>} />
              <Line dataKey="judge_score" type="monotone" stroke={SCRIPT} strokeWidth={2} strokeDasharray="4 3" connectNulls
                    dot={{ r: 2.5, fill: SCRIPT, strokeWidth: 0 }} isAnimationActive={!reduce} animationDuration={900} />
              <Line dataKey="film_score" type="monotone" stroke={FILM} strokeWidth={2.5} connectNulls
                    dot={{ r: 3.5, fill: FILM, stroke: "#0e1015", strokeWidth: 1.5 }} activeDot={{ r: 5 }}
                    isAnimationActive={!reduce} animationDuration={1100} animationBegin={200} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">Finish two reviewed films to see the trend.</p>
      )}
    </Panel>
  );
}

/** Spend by pipeline stage, in pipeline order, so you can see which step costs what. */
export function PipelineCost({ stats }: { stats: StudioStats }) {
  const { rows, top } = stageShares(stats.stages);
  const timed = rows.some((r) => r.avg_seconds != null);
  if (rows.length === 0) {
    return <Panel kicker="The pipeline" title="Where the money goes, step by step"><p className="text-sm text-muted">No spend yet.</p></Panel>;
  }
  return (
    <Panel
      kicker="The pipeline"
      title={top ? <>{STAGE_LABELS[top.stage] ?? top.stage} is {Math.round(top.share * 100)}% of the spend</> : "Where the money goes"}
      aside={timed ? "Bars compare stages to the costliest. Times: runs from the last 24 hours." : "Bars compare stages to the costliest."}
    >
      <ol className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={r.stage} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[200px_minmax(0,1fr)_150px]">
            <span className={`truncate ${r === top ? "text-ink" : "text-muted"}`}>
              <span className="mr-2 inline-block w-4 text-right font-mono text-[10px] text-muted/70">{i + 1}</span>
              {STAGE_LABELS[r.stage] ?? (r.stage === "other" ? "Other work" : r.stage)}
            </span>
            <GrowBar value={top ? r.share / top.share : 0} className="order-3 col-span-2 h-1.5 sm:order-none sm:col-span-1"
                     fill={r === top ? "bg-accent" : "bg-accent/45"} delay={0.05 * i} />
            <span className="text-right text-xs tabular-nums text-muted">
              <span className="text-ink">{formatUSD(r.cost_usd)}</span> · {r.share < 0.01 && r.share > 0 ? "<1" : Math.round(r.share * 100)}%
              {r.avg_seconds != null && r.avg_seconds >= 1 && <> · {fmtRuntime(r.avg_seconds)}</>}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/**
 * The shooting ratio, a film-set number: seconds of AI footage rendered for every second
 * that ends up in a finished film. Retakes and trims push it up.
 */
export function ShootingRatio({ stats }: { stats: StudioStats }) {
  const reduce = useReducedMotion();
  const ratio = stats.shooting_ratio;
  return (
    <Panel kicker="Shooting ratio" title="Footage rendered for every second you keep">
      {ratio ? (
        <>
          <p className="font-display text-5xl font-semibold tracking-tight text-ink">
            <AnimatedNumber value={ratio} format={(v) => v.toFixed(1)} />
            <span className="text-2xl text-muted"> : 1</span>
          </p>
          <div className="mt-5 space-y-2.5" aria-hidden="true">
            {[
              { label: "Rendered", w: 1, cls: "bg-leak/70" },
              { label: "In the film", w: 1 / ratio, cls: "bg-accent" },
            ].map((b, i) => (
              <div key={b.label} className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 text-xs text-muted">
                {b.label}
                <span className="h-3 overflow-hidden rounded-[4px] bg-ink/[0.05]">
                  <motion.span
                    className={`block h-full origin-left rounded-[4px] ${b.cls}`}
                    initial={reduce ? { scaleX: b.w, opacity: 0 } : { scaleX: 0 }}
                    whileInView={{ scaleX: b.w, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={reduce ? { duration: 0.3 } : { duration: 0.8, ease: EASE, delay: 0.15 + i * 0.25 }}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {fmtRuntime(stats.rendered_seconds)} of AI footage over {stats.renders} renders.{" "}
            {ratio <= 1.3 ? "Almost every take makes the cut." : ratio <= 2 ? "Some retakes and trims, as on any set." : "A lot of footage ends up on the floor; clearer scene notes mean fewer retakes."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">Appears after a finished film with AI-filmed scenes.</p>
      )}
    </Panel>
  );
}

/** Each style and length you've made: what it costs and how it reviews. Flags the best value. */
export function SweetSpots({ stats }: { stats: StudioStats }) {
  const reduce = useReducedMotion();
  const picks = spotPicks(stats.sweet_spots);
  if (stats.sweet_spots.length === 0) {
    return <Panel kicker="Formats" title="Your best-value format"><p className="text-sm text-muted">Finish a film to compare formats.</p></Panel>;
  }
  const maxCost = Math.max(...stats.sweet_spots.map((s) => s.avg_cost_usd));
  const value = picks.value ? spotLabel(picks.value) : null;
  return (
    <Panel kicker="Formats" title={value ? <>{value.style} {value.duration} gets the most score per dollar</> : "Cost per format"}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {stats.sweet_spots.map((s, i) => {
          const { style, duration } = spotLabel(s.key);
          const badges = [s.key === picks.value && "Best value", s.key === picks.top && "Top score"].filter(Boolean) as string[];
          return (
            <motion.li
              key={s.key}
              className={`rounded-xl p-3.5 ${badges.length ? "bg-accent/[0.07] shadow-[inset_0_0_0_1px_rgba(242,181,68,0.25)]" : "bg-ink/[0.035]"}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.1, 0.5) }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-ink">{style} · {duration}</span>
                <span className="text-xs text-muted">{s.films} {s.films === 1 ? "film" : "films"}</span>
                {badges.map((b) => (
                  <span key={b} className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                    <Star className="size-3" strokeWidth={2.25} aria-hidden="true" />{b}
                  </span>
                ))}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted">
                <div>
                  <dt>Avg cost</dt>
                  <dd className="mt-0.5 text-sm tabular-nums text-ink">{formatUSD(s.avg_cost_usd)}</dd>
                  <GrowBar value={maxCost ? s.avg_cost_usd / maxCost : 0} className="mt-1.5 h-1" fill="bg-leak/70" delay={0.2 + i * 0.1} />
                </div>
                <div>
                  <dt>Film score</dt>
                  <dd className="mt-0.5 text-sm tabular-nums text-ink">{s.avg_film_score != null ? `${Math.round(s.avg_film_score)}/100` : "not reviewed"}</dd>
                  <GrowBar value={(s.avg_film_score ?? 0) / 100} className="mt-1.5 h-1" delay={0.3 + i * 0.1} />
                </div>
              </dl>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** A poster, or the title on a dark card if the image can't load. */
function Poster({ src, title }: { src: string; title: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="grid aspect-[9/16] w-full place-items-center bg-gradient-to-b from-surface-2 to-midnight p-3 text-center font-display text-sm text-ink/80">
        {title}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- poster served by the API
    <img src={src} alt={`Poster for ${title}`} loading="lazy" decoding="async" onError={() => setBroken(true)}
         className="block aspect-[9/16] w-full object-cover outline outline-1 -outline-offset-1 outline-white/10 transition-[scale] duration-500 ease-out group-hover:scale-[1.03]" />
  );
}

/** Your published films, as posters that link to their homepage page. */
export function YourShelf({ stats }: { stats: StudioStats }) {
  const reduce = useReducedMotion();
  const genres = Object.entries(stats.genres);
  return (
    <Panel
      kicker="Your library · you"
      title={stats.library.length ? `${stats.library.length} ${stats.library.length === 1 ? "film" : "films"} on the homepage` : "Nothing on the homepage yet"}
      aside={genres.length ? genres.map(([g, n]) => `${g}${n > 1 ? ` ×${n}` : ""}`).join(" · ") : undefined}
    >
      {stats.library.length === 0 ? (
        <p className="text-sm text-muted">Publish a finished film from its result page and it joins the homepage library, with a poster.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {stats.library.slice(0, 6).map((f, i) => (
            <motion.li
              key={f.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.08, 0.5) }}
            >
              <a href={filmsPage(f.id)} target="_blank" rel="noopener" className="group block">
                <span className="block overflow-hidden rounded-xl shadow-[0_0_0_1px_var(--color-line)] transition-shadow duration-300 group-hover:shadow-[0_0_0_1px_rgba(242,181,68,0.35),0_18px_40px_-20px_rgba(242,181,68,0.35)]">
                  <Poster src={api.apiUrl(f.poster)} title={f.title} />
                </span>
                <span className="mt-2 block truncate text-xs text-ink">{f.title}</span>
                <span className="block truncate text-[11px] text-muted">{f.genre}</span>
              </a>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
