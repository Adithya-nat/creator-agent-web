"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Segmented } from "@/components/ui/Segmented";
import { BudgetCard } from "@/components/usage/BudgetCard";
import { CategoryBar } from "@/components/usage/CategoryBar";
import { DailySpendChart, StyleCostChart } from "@/components/usage/Charts";
import { MeterList } from "@/components/usage/MeterList";
import { RunsTable } from "@/components/usage/RunsTable";
import { StatTile } from "@/components/usage/StatTile";
import { useBudget } from "@/hooks/useBudget";
import { api, ApiError } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import type { RunRow, UsageRange, UsageSummary } from "@/lib/types";

const RANGES: { value: UsageRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-5">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function UsagePage() {
  const [range, setRange] = useState<UsageRange>("30d");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const budget = useBudget(30_000);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getUsageSummary(range), api.getUsageRuns(100)])
      .then(([s, r]) => {
        if (!alive) return;
        setSummary(s);
        setRuns(r);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Couldn't load usage."));
    return () => {
      alive = false;
    };
  }, [range]);

  return (
    <main className="relative min-h-screen bg-aurora">
      <TopBar active="usage" />
      <div className="mx-auto max-w-6xl space-y-6 px-5 pb-16 pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Usage & cost</h1>
            <p className="mt-1 text-sm text-muted">
              Estimated AI spend per run (Google + Anthropic). Your provider billing is authoritative.
            </p>
          </div>
          <Segmented id="range" label="Time range" value={range} onChange={setRange} options={RANGES} />
        </div>

        {error && <p role="alert" className="glass p-4 text-sm text-state-bad">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
          {budget ? <BudgetCard budget={budget} /> : <div className="glass p-5 text-sm text-muted">Loading budget…</div>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Avg cost / run" value={formatUSD(summary?.avg_cost_per_run)} sub="completed runs" />
            <StatTile label="Cost / second" value={formatUSD(summary?.avg_cost_per_second)} sub="of finished video" />
            <StatTile
              label="Runs"
              value={String(summary?.runs ?? 0)}
              sub={summary ? `${Math.round(summary.success_rate * 100)}% succeeded` : undefined}
            />
            <StatTile label="Spend" value={formatUSD(summary?.total_cost_usd)} sub="in this range" />
            <StatTile
              label="AI-filmed scenes"
              value={summary ? `${Math.round(summary.omni_share * 100)}%` : "—"}
              sub="rest used a fallback"
            />
            <StatTile
              label="Avg run time"
              value={summary?.avg_runtime_seconds ? `${Math.round(summary.avg_runtime_seconds / 60)}m` : "—"}
              sub={summary?.avg_judge_score != null ? `story score ${summary.avg_judge_score}/100` : undefined}
            />
          </div>
        </div>

        <Card title="Daily spend by category">
          <DailySpendChart data={summary?.by_day ?? []} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Where the money goes">
            <CategoryBar byCategory={summary?.by_category ?? {}} />
          </Card>
          <Card title="Average cost per video">
            <StyleCostChart avg={summary?.avg_cost_by_style_duration ?? {}} />
          </Card>
        </div>

        <Card title="Spend by model">
          <MeterList rows={summary?.by_model ?? {}} />
        </Card>

        <section className="glass overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-xl font-semibold text-ink">Runs</h2>
          <RunsTable runs={runs} />
        </section>
      </div>
    </main>
  );
}
