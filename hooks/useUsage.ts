"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toPair, type UsagePair } from "@/lib/usage";
import type { UsageRange } from "@/lib/types";

const REFRESH_MS = 60_000;

/**
 * Your usage and everyone's for one range, fetched together and cached per range.
 * Switching Everyone/You is local (no request). Switching range keeps the last numbers on
 * screen (`stale`) until the new ones land, so the page never collapses into skeletons.
 */
export function useUsage(range: UsageRange) {
  const [byRange, setByRange] = useState<Partial<Record<UsageRange, UsagePair>>>({});
  const [latest, setLatest] = useState<UsageRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([api.getUsageSummary(range, "me"), api.getUsageSummary(range, "all")])
        .then(([me, all]) => {
          if (!alive) return;
          setByRange((m) => ({ ...m, [range]: toPair(me, all) }));
          setLatest(range);
          setError(null);
        })
        .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Couldn't load usage."));
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [range]);

  const pair = byRange[range] ?? (latest ? byRange[latest] : undefined) ?? null;
  return { pair, stale: pair !== null && !byRange[range], error };
}
