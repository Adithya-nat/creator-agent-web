"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ENTER, EXIT } from "@/components/production/motion";
import { Segmented } from "@/components/ui/Segmented";
import { fmtInt, fmtMinutes, fmtPct } from "@/components/usage/AnimatedNumber";
import { BudgetCard } from "@/components/usage/BudgetCard";
import { CategoryBar } from "@/components/usage/CategoryBar";
import { DailySpendChart, StyleCostChart } from "@/components/usage/Charts";
import { MeterList } from "@/components/usage/MeterList";
import { RunsTable } from "@/components/usage/RunsTable";
import { SpendHero } from "@/components/usage/SpendHero";
import { StatTile } from "@/components/usage/StatTile";
import { useBudget } from "@/hooks/useBudget";
import { useUsage } from "@/hooks/useUsage";
import { api } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { viewOf } from "@/lib/usage";
import type { RunRow, UsageRange, UsageScope, UsageSummary } from "@/lib/types";

const RANGES: { value: UsageRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const SCOPES: { value: UsageScope; label: React.ReactNode; hint: string }[] = [
  { value: "all", hint: "Every creator's runs, as totals", label: <span className="flex items-center gap-1.5"><Users className="size-4" strokeWidth={2} aria-hidden="true" />Everyone</span> },
  { value: "me", hint: "Only your own runs", label: <span className="flex items-center gap-1.5"><User className="size-4" strokeWidth={2} aria-hidden="true" />Just you</span> },
];

const fmtScore = (v: number) => `${Math.round(v)}/100`;
const orNull = (v: number | null | undefined) => (v ? v : null);

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {aside && <p className="text-xs text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Skeleton() {
  const block = "animate-pulseGlow rounded-[1.25rem] bg-ink/[0.035]";
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className={`${block} h-56`} />
        <div className={`${block} h-56`} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className={`${block} h-32`} />)}
      </div>
      <div className={`${block} h-80`} />
    </div>
  );
}

export default function UsagePage() {
  const [range, setRange] = useState<UsageRange>("30d");
  const [scope, setScope] = useState<UsageScope>("all");
  const { pair, stale, error } = useUsage(range);
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const budget = useBudget(30_000);
  const reduce = useReducedMotion();

  // Your runs don't depend on the range or the view: load them once.
  useEffect(() => {
    api.getUsageRuns(100).then(setRuns).catch(() => setRuns([]));
  }, []);

  const projectReady = pair?.all != null;
  const shown: UsageScope = projectReady ? scope : "me";
  const v = pair ? viewOf(pair, shown) : null;
  const vs = (pick: (s: UsageSummary) => number | null | undefined) =>
    v?.other ? { scope: v.otherScope, value: pick(v.other) } : undefined;
  // In the project view, draw your part inside each chart; in your view the totals stand alone.
  const mine = shown === "all" ? pair?.me : undefined;

  // Staged entrance, once, when the first numbers land (100ms apart; reduced motion = fade).
  const section: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: ENTER } }
    : { hidden: { opacity: 0, y: 12, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER } };

  return (
    <main className="relative min-h-screen bg-aurora">
      <TopBar active="usage" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-24 sm:px-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Usage & cost</h1>
            <div className="relative mt-1 min-h-5 text-sm text-muted">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.p
                  key={shown}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)", transition: ENTER }}
                  exit={{ opacity: 0, filter: "blur(4px)", transition: EXIT }}
                >
                  {shown === "all"
                    ? "Estimated AI spend across every creator. Prompts stay private."
                    : "Estimated AI spend on your own runs. Billing is authoritative."}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(!pair || projectReady) && <Segmented id="scope" label="Whose usage" value={shown} onChange={setScope} options={SCOPES} />}
            <Segmented id="range" label="Time range" value={range} onChange={setRange} options={RANGES} />
          </div>
        </header>

        {error && <p role="alert" className="glass p-4 text-sm text-state-bad">{pair ? `Couldn't refresh: ${error}` : error}</p>}

        {!pair || !v ? (
          !error && <Skeleton />
        ) : (
          <motion.div
            className="space-y-6 transition-opacity duration-150"
            style={{ opacity: stale ? 0.55 : 1 }}
            aria-busy={stale}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div variants={section} className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <SpendHero pair={pair} scope={shown} />
              {budget ? <BudgetCard budget={budget} /> : <div className="glass p-5 text-sm text-muted">Loading budget…</div>}
            </motion.div>

            <motion.div variants={section} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Avg cost / run" value={v.view.avg_cost_per_run} format={formatUSD} sub="completed runs"
                        compare={vs((s) => s.avg_cost_per_run)} />
              <StatTile label="Cost / second" value={v.view.avg_cost_per_second} format={formatUSD} sub="of finished video"
                        compare={vs((s) => s.avg_cost_per_second)} />
              <StatTile label="Runs" value={v.view.runs} format={fmtInt} sub={`${v.view.completed_runs} completed`}
                        compare={vs((s) => s.runs)} />
              <StatTile label="AI-filmed scenes" value={v.view.omni_share} format={fmtPct} sub="rest used a fallback"
                        compare={vs((s) => s.omni_share)} />
              <StatTile label="Avg run time" value={orNull(v.view.avg_runtime_seconds)} format={fmtMinutes} sub="start to finish"
                        compare={vs((s) => orNull(s.avg_runtime_seconds))} />
              <StatTile label="Story score" value={v.view.avg_judge_score} format={fmtScore} sub="judge average"
                        compare={vs((s) => s.avg_judge_score)} />
            </motion.div>

            <motion.div variants={section}>
              <Card title="Daily spend by category" aside={mine ? "Dashed line: your share of each day" : undefined}>
                <DailySpendChart data={v.view.by_day} mine={mine?.by_day} />
              </Card>
            </motion.div>

            <motion.div variants={section} className="grid gap-6 lg:grid-cols-2">
              <Card title="Where the money goes">
                <CategoryBar byCategory={v.view.by_category} scope={shown}
                             compare={v.other ? { scope: v.otherScope, byCategory: v.other.by_category } : undefined} />
              </Card>
              <Card title="Average cost per video">
                <StyleCostChart avg={v.view.avg_cost_by_style_duration} />
              </Card>
            </motion.div>

            <motion.div variants={section}>
              <Card title="Spend by model" aside={mine ? "Bright part of each bar is you" : undefined}>
                <MeterList rows={v.view.by_model} mine={mine?.by_model} />
              </Card>
            </motion.div>

            <motion.section variants={section} className="glass overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
                <h2 className="font-display text-xl font-semibold text-ink">Your runs</h2>
                <p className="text-xs text-muted">Only you can see your prompts</p>
              </div>
              {runs ? <RunsTable runs={runs} /> : <p className="p-5 text-sm text-muted">Loading runs…</p>}
            </motion.section>
          </motion.div>
        )}
      </div>
    </main>
  );
}
