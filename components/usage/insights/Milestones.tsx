"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Check } from "lucide-react";
import { EASE } from "@/components/production/motion";
import { GrowBar, Panel } from "@/components/usage/insights/Section";
import { fmtRuntime, milestones } from "@/lib/insights";
import type { CreatorRank, StudioStats } from "@/lib/types";

const show = (family: string, v: number) => (family === "screen" ? fmtRuntime(v) : String(Math.round(v)));

/** Your next goals with progress, then everything already earned. Always personal. */
export function Milestones({ stats }: { stats: StudioStats }) {
  const reduce = useReducedMotion();
  const { earned, next } = milestones(stats);
  return (
    <Panel kicker="Milestones · you" title="Next up" aside={`${earned.length} earned`}>
      <ul className="space-y-4">
        {next.slice(0, 3).map((m, i) => (
          <li key={m.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-ink">{m.title}</span>
                <span className="text-muted"> · {m.goal}</span>
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted">
                {show(m.family, m.value)} / {show(m.family, m.target)}
              </span>
            </div>
            <GrowBar value={m.progress} className="mt-2 h-1.5" delay={0.1 + i * 0.1} label={`${m.title}: ${Math.round(m.progress * 100)}% there`} />
          </li>
        ))}
      </ul>
      {earned.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4" aria-label="Earned milestones">
          {earned.map((m, i) => (
            <motion.li
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
              title={m.goal}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(0.3 + i * 0.05, 0.9) }}
            >
              <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
              {m.title}
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RankRow({ label, hint, ahead, others, delay }: { label: string; hint: string; ahead: number | null; others: number; delay: number }) {
  const reduce = useReducedMotion();
  const beat = ahead == null ? null : Math.round(ahead * others);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink">{label} <span className="text-xs text-muted">{hint}</span></span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {beat == null ? "not enough data" : `ahead of ${beat} of ${others}`}
        </span>
      </div>
      {/* A track with you as a dot: left = behind everyone, right = ahead of everyone. */}
      <div className="relative mt-2.5 h-1.5 rounded-full bg-gradient-to-r from-ink/[0.05] to-leak/25" aria-hidden="true">
        {ahead != null && (
          // Full-width layer moved by transform (x% = % of the track), so no layout per frame.
          <motion.span
            className="absolute inset-0"
            initial={reduce ? { x: `${ahead * 100}%`, opacity: 0 } : { x: "0%", opacity: 0 }}
            whileInView={{ x: `${ahead * 100}%`, opacity: 1 }}
            viewport={{ once: true }}
            transition={reduce ? { duration: 0.3 } : { type: "spring", duration: 0.9, bounce: 0, delay }}
          >
            <span className="absolute left-0 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leak shadow-[0_0_0_3px_var(--color-surface),0_0_14px_rgba(110,231,249,0.55)]" />
          </motion.span>
        )}
      </div>
    </li>
  );
}

/** Where you sit among the other creators, without naming or showing anyone. */
export function RankCard({ rank }: { rank: CreatorRank | null }) {
  if (!rank) {
    return (
      <Panel kicker="Among creators" title="How you compare">
        <div className="flex flex-1 items-center gap-3 text-sm text-muted">
          <Award className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Rankings appear once three creators have made films. Nobody is ever named.
        </div>
      </Panel>
    );
  }
  const others = rank.creators - 1;
  return (
    <Panel kicker={`Among ${rank.creators} creators`} title="How you compare" aside="Anonymous: only your own spot is shown">
      <ul className="space-y-5">
        <RankRow label="Films made" hint="" ahead={rank.films} others={others} delay={0.1} />
        <RankRow label="Film score" hint="average review" ahead={rank.score} others={others} delay={0.2} />
        <RankRow label="Value" hint="lower cost per second" ahead={rank.value} others={others} delay={0.3} />
      </ul>
    </Panel>
  );
}
