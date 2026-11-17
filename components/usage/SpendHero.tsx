"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber, fmtInt, fmtPct } from "@/components/usage/AnimatedNumber";
import { formatUSD } from "@/lib/format";
import { SCOPE_COLOR, share, type UsagePair } from "@/lib/usage";
import type { UsageScope } from "@/lib/types";

const R = 54;
const SPRING = { type: "spring", duration: 0.9, bounce: 0 } as const;

/** Your slice of the project's spend as a ring: the arc is you, the track is everyone else. */
function ShareRing({ part }: { part: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative grid size-36 shrink-0 place-items-center self-center" role="img"
         aria-label={`You account for ${fmtPct(part)} of the project's spend`}>
      <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={R} fill="none" stroke={SCOPE_COLOR.all} strokeOpacity={0.28} strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={R} fill="none" stroke={SCOPE_COLOR.me} strokeWidth="10" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: part, opacity: part > 0 ? 1 : 0 }}
          transition={SPRING}
        />
      </svg>
      <div className="text-center" aria-hidden="true">
        <AnimatedNumber value={part} format={fmtPct} className="font-display text-3xl font-semibold" />
        <p className="text-xs text-muted">is you</p>
      </div>
    </div>
  );
}

function Legend({ scope, value, active }: { scope: UsageScope; value: number; active: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-[background-color,opacity] duration-150 ${
      active ? "bg-ink/[0.05]" : "opacity-70"}`}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: SCOPE_COLOR[scope], opacity: scope === "all" ? 0.9 : 1 }} />
      <span className="text-sm text-muted">{scope === "all" ? "Everyone" : "You"}</span>
      <AnimatedNumber value={value} format={formatUSD} className="ml-auto text-sm text-ink" />
    </div>
  );
}

/** The headline: spend for the chosen view, and how you sit inside the whole project. */
export function SpendHero({ pair, scope }: { pair: UsagePair; scope: UsageScope }) {
  const project = pair.all;
  const view = scope === "all" && project ? project : pair.me;
  const showingProject = view === project;
  return (
    <div className="glass flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">{showingProject ? "Project spend" : "Your spend"}</p>
          {showingProject && project?.creators != null && (
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs tabular-nums text-muted">
              {fmtInt(project.creators)} {project.creators === 1 ? "creator" : "creators"}
            </span>
          )}
        </div>
        <AnimatedNumber value={view.total_cost_usd} format={formatUSD}
                        className="mt-1 block font-display text-5xl font-semibold tracking-tight text-ink" />
        <p className="mt-1 text-sm text-muted">
          <AnimatedNumber value={view.runs} format={fmtInt} /> {view.runs === 1 ? "run" : "runs"} ·{" "}
          <AnimatedNumber value={view.success_rate} format={fmtPct} /> succeeded
        </p>
        {project ? (
          <div className="mt-4 grid gap-1 sm:max-w-xs">
            <Legend scope="all" value={project.total_cost_usd} active={showingProject} />
            <Legend scope="me" value={pair.me.total_cost_usd} active={!showingProject} />
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Project-wide totals appear once the API is updated.</p>
        )}
      </div>
      {project && <ShareRing part={share(pair.me.total_cost_usd, project.total_cost_usd)} />}
    </div>
  );
}
