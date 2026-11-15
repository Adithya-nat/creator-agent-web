"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUSD } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL, DURATION_COLOR, orderedCategories, styleDurationRows } from "@/lib/usage";
import type { UsageSummary } from "@/lib/types";

const SURFACE = "#1c2440"; // card surface, so the 2px stack gaps read as gaps, not outlines
const AXIS = { stroke: "rgba(255,255,255,0.18)", tick: { fill: "#9aa0b4", fontSize: 11 } };
const TOOLTIP = {
  contentStyle: { background: "#1a1d28", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#edeff7" },
  itemStyle: { color: "#edeff7" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

/** Daily spend stacked by category (fixed category order/colors; 2px surface gaps). */
export function DailySpendChart({ data }: { data: UsageSummary["by_day"] }) {
  const cats = orderedCategories([...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "date" && k !== "total")))]);
  if (data.length === 0) return <p className="text-sm text-muted">No runs in this range yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis {...AXIS} tickFormatter={(v: number) => formatUSD(v)} width={56} />
        <Tooltip {...TOOLTIP} formatter={(v, k) => [formatUSD(Number(v)), CATEGORY_LABEL[String(k)] ?? String(k)]} />
        <Legend itemSorter={null} formatter={(k: string) => <span className="text-xs text-muted">{CATEGORY_LABEL[k] ?? k}</span>} />
        {cats.map((c, i) => (
          <Bar key={c} dataKey={c} stackId="spend" fill={CATEGORY_COLOR[c] ?? "#9085e9"} stroke={SURFACE} strokeWidth={2}
               radius={i === cats.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Average cost per run by story style, 30s vs 60s side by side. */
export function StyleCostChart({ avg }: { avg: Record<string, number> }) {
  const rows = styleDurationRows(avg);
  if (rows.length === 0) return <p className="text-sm text-muted">Finish a few runs to see averages.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="storyStyle" {...AXIS} tickFormatter={(s: string) => s[0].toUpperCase() + s.slice(1)} />
        <YAxis {...AXIS} tickFormatter={(v: number) => formatUSD(v)} width={56} />
        <Tooltip {...TOOLTIP} formatter={(v, k) => [formatUSD(Number(v)), `${k}s video`]} />
        <Legend formatter={(k: string) => <span className="text-xs text-muted">{k}s video</span>} />
        {(["30", "60"] as const).map((d) => (
          <Bar key={d} dataKey={d} fill={DURATION_COLOR[d]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
