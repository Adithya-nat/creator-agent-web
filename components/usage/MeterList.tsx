"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatUSD } from "@/lib/format";
import { SCOPE_COLOR } from "@/lib/usage";

const SPRING = { type: "spring", duration: 0.7, bounce: 0 } as const;

/**
 * Named rows, each a bar against the largest value. With `mine`, your part of each
 * row is drawn inside the project's bar. Bars grow with scaleX (no layout work).
 */
export function MeterList({ rows, mine }: { rows: Record<string, number>; mine?: Record<string, number> }) {
  const reduce = useReducedMotion();
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  const max = Math.max(0, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-muted">No spend in this range yet.</p>;
  const grow = (v: number) => ({
    initial: reduce ? false : { scaleX: 0 },
    animate: { scaleX: max ? v / max : 0 },
    transition: SPRING,
  });
  return (
    <ul className="space-y-3">
      {entries.map(([name, v]) => (
        <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[200px_minmax(0,1fr)_120px]">
          <span className="truncate font-mono text-xs text-muted" title={name}>{name}</span>
          <span className="relative order-3 col-span-2 h-2 overflow-hidden rounded-full bg-ink/[0.07] sm:order-none sm:col-span-1">
            <motion.span {...grow(v)} className="absolute inset-0 origin-left rounded-full"
                         style={{ background: SCOPE_COLOR.all, opacity: mine ? 0.55 : 1 }} />
            {mine && <motion.span {...grow(mine[name] ?? 0)} className="absolute inset-0 origin-left rounded-full"
                                  style={{ background: SCOPE_COLOR.me }} />}
          </span>
          <span className="text-right tabular-nums text-ink">
            {formatUSD(v)}
            {mine && <span className="ml-1.5 text-xs text-muted">you {formatUSD(mine[name] ?? 0)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
