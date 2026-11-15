"use client";

import Link from "next/link";
import { useBudget } from "@/hooks/useBudget";
import { formatUSD } from "@/lib/format";

/** Compact month-to-date spend vs the monthly cap; links to the usage dashboard. */
export function BudgetMeter() {
  const b = useBudget();
  if (!b) return null;
  const pct = Math.min(100, (b.month_spent_usd / Math.max(1, b.cap_usd)) * 100);
  const tone = b.over ? "bg-state-bad" : b.warn ? "bg-state-warn" : "bg-accent";
  return (
    <Link
      href="/usage"
      title={`${formatUSD(b.month_spent_usd)} of ${formatUSD(b.cap_usd)} AI budget used this month`}
      className="hidden items-center gap-2 rounded-full border border-line bg-surface/50 px-3 py-1.5 text-xs text-muted backdrop-blur-md transition-colors hover:text-ink sm:inline-flex"
    >
      <span className="tabular-nums">{formatUSD(b.month_spent_usd)}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">{formatUSD(b.cap_usd)}</span>
    </Link>
  );
}
