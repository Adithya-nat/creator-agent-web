"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, recut } from "@/lib/api";
import type { JobStatus, RecutMap } from "@/lib/types";

/** The film's recut map (scenes, takes, cuts). Refetched when the job's status changes,
 *  and every few seconds while a recut renders so new takes land in place. Null for
 *  good on servers without recut. */
export function useRecutMap(jobId: string, status: JobStatus | null, nonce = 0) {
  const [map, setMap] = useState<RecutMap | null>(null);
  const [supported, setSupported] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!supported || status == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const next = await recut.map(jobId);
        if (cancelled) return;
        setMap(next);
        if ((status === "running" || status === "queued") && next.cuts.length > 1) timer = setTimeout(load, 5000);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
          if (!cancelled && e.status === 404 && !e.message.includes("job")) setSupported(false);
          return;
        }
        if (!cancelled) timer = setTimeout(load, 4000);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, status, supported, nonce, tick]);

  return { map, supported, refresh };
}
