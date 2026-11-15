"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BudgetStatus } from "@/lib/types";

/** Month-to-date AI spend vs the cap (refreshes every minute; null if unreachable). */
export function useBudget(refreshMs = 60_000): BudgetStatus | null {
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.getBudget().then((b) => alive && setBudget(b)).catch(() => {});
    load();
    const t = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refreshMs]);
  return budget;
}
