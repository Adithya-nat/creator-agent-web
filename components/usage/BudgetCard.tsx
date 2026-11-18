"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatUSD } from "@/lib/format";
import { monthEndForecast } from "@/lib/insights";
import type { BudgetStatus } from "@/lib/types";

/**
 * Month-to-date spend vs the cap as a meter, with status in text (not color alone), and
 * where this month lands at the current pace as a dashed marker on the same meter.
 */
export function BudgetCard({ budget }: { budget: BudgetStatus }) {
  const reduce = useReducedMotion();
  const cap = Math.max(1, budget.cap_usd);
  const pct = Math.min(1, budget.month_spent_usd / cap);
  const forecast = monthEndForecast(budget.month_spent_usd);
  const lands = forecast ? Math.min(1, forecast.projected / cap) : null;
  const overPace = forecast != null && forecast.projected > budget.cap_usd;
  const state = budget.over ? "Over budget" : budget.warn ? "Nearing the cap" : overPace ? "Pace runs past the cap" : "On track";
  const tone = budget.over ? "bg-state-bad" : budget.warn ? "bg-state-warn" : "bg-[#3987e5]";
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="glass flex h-full flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">Your budget · this month</p>
        <p className={`text-xs ${overPace || budget.warn || budget.over ? "text-state-warn" : "text-muted"}`}>{state}</p>
      </div>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
        {formatUSD(budget.month_spent_usd)}
        <span className="text-base font-normal text-muted"> of {formatUSD(budget.cap_usd)}</span>
      </p>
      <div className="mt-auto pt-5" />
      <div className="relative h-2.5 rounded-full bg-white/10" role="meter"
           aria-valuemin={0} aria-valuemax={budget.cap_usd} aria-valuenow={budget.month_spent_usd}
           aria-label="Monthly AI budget used">
        {lands != null && lands > pct && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 origin-left rounded-full border border-dashed border-ink/35"
            style={{ width: `${lands * 100}%` }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: pct / lands }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={reduce ? { duration: 0.3 } : { type: "spring", duration: 0.9, bounce: 0, delay: 0.5 }}
          />
        )}
        <motion.div
          className={`absolute inset-y-0 left-0 w-full origin-left rounded-full ${tone}`}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ type: "spring", duration: 0.8, bounce: 0 }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {formatUSD(budget.remaining_usd)} left · about {budget.videos_left["dialogue_30"] ?? 0} dialogue 30s or{" "}
        {budget.videos_left["dialogue_60"] ?? 0} 60s videos
      </p>
      {forecast && (
        <p className="mt-1 text-xs text-muted">
          At this pace: <span className={overPace ? "text-state-warn" : "text-ink"}>~{formatUSD(forecast.projected)}</span> by {monthEnd}
          <span className="text-muted/70"> (dashed)</span>
        </p>
      )}
    </div>
  );
}
