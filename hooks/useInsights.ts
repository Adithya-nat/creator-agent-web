"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { UsageInsights } from "@/lib/types";

const REFRESH_MS = 120_000;

/**
 * The studio's all-time story, bucketed in the viewer's own timezone. `missing` = the API
 * predates insights (404), so the page shows spend only instead of an error.
 */
export function useInsights() {
  const [data, setData] = useState<UsageInsights | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const load = () =>
      api
        .getUsageInsights(tz)
        .then((d) => alive && setData(d))
        .catch((e) => alive && e instanceof ApiError && e.status === 404 && setMissing(true));
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return { data, missing };
}
