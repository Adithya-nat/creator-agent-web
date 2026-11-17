"use client";

import { AnimatedNumber } from "@/components/usage/AnimatedNumber";
import { SCOPE_COLOR, SCOPE_LABEL } from "@/lib/usage";
import type { UsageScope } from "@/lib/types";

type Num = number | null | undefined;

/** One figure for the chosen view, with the other side's figure underneath for comparison. */
export function StatTile({
  label,
  value,
  format,
  sub,
  compare,
}: {
  label: string;
  value: Num;
  format: (v: number) => string;
  sub?: string;
  compare?: { scope: UsageScope; value: Num };
}) {
  return (
    <div className="glass flex h-full flex-col p-4">
      <p className="text-sm text-muted">{label}</p>
      <AnimatedNumber value={value} format={format} className="mt-1 block font-display text-2xl font-semibold text-ink" />
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {compare && (
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: SCOPE_COLOR[compare.scope] }} aria-hidden="true" />
          {SCOPE_LABEL[compare.scope]}
          <AnimatedNumber value={compare.value} format={format} className="ml-auto text-ink/80" />
        </p>
      )}
    </div>
  );
}
