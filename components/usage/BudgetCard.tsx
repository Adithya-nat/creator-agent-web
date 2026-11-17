import { formatUSD } from "@/lib/format";
import type { BudgetStatus } from "@/lib/types";

/** Month-to-date spend vs the cap as a meter, with status shown in text (not color alone). */
export function BudgetCard({ budget }: { budget: BudgetStatus }) {
  const pct = Math.min(100, (budget.month_spent_usd / Math.max(1, budget.cap_usd)) * 100);
  const state = budget.over ? "Over budget" : budget.warn ? "Nearing the cap" : "On track";
  const tone = budget.over ? "bg-state-bad" : budget.warn ? "bg-state-warn" : "bg-[#3987e5]";
  return (
    <div className="glass flex h-full flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">Your budget · this month</p>
        <p className="text-xs text-muted">{state}</p>
      </div>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
        {formatUSD(budget.month_spent_usd)}
        <span className="text-base font-normal text-muted"> of {formatUSD(budget.cap_usd)}</span>
      </p>
      <div className="mt-auto pt-5" />
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="meter"
           aria-valuemin={0} aria-valuemax={budget.cap_usd} aria-valuenow={budget.month_spent_usd}
           aria-label="Monthly AI budget used">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {formatUSD(budget.remaining_usd)} left · about {budget.videos_left["dialogue_30"] ?? 0} dialogue 30s or{" "}
        {budget.videos_left["dialogue_60"] ?? 0} 60s videos
      </p>
    </div>
  );
}
