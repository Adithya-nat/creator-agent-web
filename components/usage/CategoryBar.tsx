"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatUSD } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL, orderedCategories, SCOPE_LABEL, share } from "@/lib/usage";
import type { UsageScope } from "@/lib/types";

const FALLBACK = "#9085e9";
const SPRING = { type: "spring", duration: 0.6, bounce: 0 } as const;

/** One whole as a segmented bar. Segments resize with a layout (transform) animation. */
function Split({ byCategory, cats, label, thin }: { byCategory: Record<string, number>; cats: string[]; label: string; thin?: boolean }) {
  const reduce = useReducedMotion();
  const total = cats.reduce((a, c) => a + (byCategory[c] ?? 0), 0);
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs text-muted">{label}</span>
      <motion.div
        className={`flex w-full gap-[2px] overflow-hidden rounded-[4px] ${thin ? "h-2.5" : "h-4"} ${total > 0 ? "" : "bg-ink/[0.06]"}`}
        initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
        aria-hidden="true"
      >
        {cats.map((c) =>
          (byCategory[c] ?? 0) > 0 ? (
            <motion.div key={c} layout transition={SPRING} className="h-full min-w-[2px]"
                        style={{ flex: `${byCategory[c]} 1 0%`, background: CATEGORY_COLOR[c] ?? FALLBACK }}
                        title={`${CATEGORY_LABEL[c] ?? c}: ${formatUSD(byCategory[c])}`} />
          ) : null,
        )}
      </motion.div>
    </div>
  );
}

/** Where the money goes for the chosen view, with the other side's mix right under it. */
export function CategoryBar({
  byCategory,
  scope,
  compare,
}: {
  byCategory: Record<string, number>;
  scope: UsageScope;
  compare?: { scope: UsageScope; byCategory: Record<string, number> };
}) {
  const cats = orderedCategories([...new Set([...Object.keys(byCategory), ...Object.keys(compare?.byCategory ?? {})])]);
  const shown = cats.filter((c) => byCategory[c] > 0);
  const total = shown.reduce((a, c) => a + byCategory[c], 0);
  if (total <= 0) return <p className="text-sm text-muted">No spend in this range yet.</p>;
  return (
    <div>
      <div className="space-y-2">
        <Split byCategory={byCategory} cats={cats} label={SCOPE_LABEL[scope]} />
        {compare && <Split byCategory={compare.byCategory} cats={cats} label={SCOPE_LABEL[compare.scope]} thin />}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {shown.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_COLOR[c] ?? FALLBACK }} />
            <span className="text-muted">{CATEGORY_LABEL[c] ?? c}</span>
            <span className="ml-auto tabular-nums text-ink">{formatUSD(byCategory[c])}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round(share(byCategory[c], total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
