"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUSD } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL, DURATION_COLOR, orderedCategories, SCOPE_COLOR, styleDurationRows, withYou } from "@/lib/usage";
import type { UsageSummary } from "@/lib/types";

const SURFACE = "#0e1015"; // card surface, so the 2px stack gaps read as gaps, not outlines
const YOU_KEY = "you_total";
const LABEL: Record<string, string> = { ...CATEGORY_LABEL, [YOU_KEY]: "You (all categories)" };
/** Recharts' own enter/update tween, off under reduced motion. */
function useChartMotion() {
  const reduce = useReducedMotion();
  return { isAnimationActive: !reduce, animationDuration: 600, animationEasing: "ease-out" as const };
}
const AXIS = { stroke: "rgba(255,255,255,0.18)", tick: { fill: "#9aa0b4", fontSize: 11 } };
const TOOLTIP = {
  contentStyle: { background: "#1a1d28", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#edeff7" },
  itemStyle: { color: "#edeff7" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

/**
 * Daily spend stacked by category (fixed category order/colors; 2px surface gaps).
 * With `mine`, your own daily total runs over the bars as a line, so you can see
 * which days were yours inside the project's spend.
 */
export function DailySpendChart({ data, mine }: { data: UsageSummary["by_day"]; mine?: UsageSummary["by_day"] }) {
  const motion = useChartMotion();
  const cats = orderedCategories([...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "date" && k !== "total")))]);
  if (data.length === 0) return <p className="text-sm text-muted">No runs in this range yet.</p>;
  const rows = mine ? withYou(data, mine) : data;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis {...AXIS} tickFormatter={(v: number) => formatUSD(v)} width={56} />
        <Tooltip {...TOOLTIP} formatter={(v, k) => [formatUSD(Number(v)), LABEL[String(k)] ?? String(k)]} />
        <Legend itemSorter={null} formatter={(k: string) => <span className="text-xs text-muted">{LABEL[k] ?? k}</span>} />
        {cats.map((c, i) => (
          <Bar key={c} dataKey={c} stackId="spend" fill={CATEGORY_COLOR[c] ?? "#9085e9"} stroke={SURFACE} strokeWidth={2}
               radius={i === cats.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={36} {...motion} />
        ))}
        {mine && (
          <Line dataKey={YOU_KEY} type="monotone" stroke={SCOPE_COLOR.me} strokeWidth={2} strokeDasharray="4 3"
                dot={{ r: 2.5, fill: SCOPE_COLOR.me, stroke: SURFACE, strokeWidth: 1.5 }} activeDot={{ r: 4 }} {...motion} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Average cost per run by story style, 30s vs 60s side by side. */
export function StyleCostChart({ avg }: { avg: Record<string, number> }) {
  const motion = useChartMotion();
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
          <Bar key={d} dataKey={d} fill={DURATION_COLOR[d]} radius={[4, 4, 0, 0]} maxBarSize={40} {...motion} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
