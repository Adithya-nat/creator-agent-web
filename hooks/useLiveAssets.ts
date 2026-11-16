"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";

/** Change signal for refetching /live: the SSE `assets` fingerprint when the
 *  server sends one, else (polling / older stream) the artifact ids on the job
 *  snapshot plus the stage snapshot, which moves whenever a stage finishes. */
export function liveSignal(
  assetsVersion: string | null,
  job: JobStatusResponse | null,
  stages: StageRef[],
): string {
  if (assetsVersion) return assetsVersion;
  const arts = (job?.artifacts ?? []).map((a) => a.id).join(",");
  const st = stages.map((s) => `${s.name}:${s.status}:${s.progress_current ?? ""}`).join(",");
  return `${arts}|${st}`;
}

/** The real assets a job has produced so far, refetched (debounced) whenever
 *  `signal` changes. Returns null until the first fetch lands, and stays null
 *  for good on a server without the /live endpoint, so the UI simply keeps its
 *  stand-ins. */
export function useLiveAssets(jobId: string, signal: string, enabled = true): LiveAssets | null {
  const [live, setLive] = useState<LiveAssets | null>(null);
  const [liveFor, setLiveFor] = useState(jobId);
  const unsupported = useRef(false);

  if (liveFor !== jobId) {
    setLiveFor(jobId);
    setLive(null);
  }

  useEffect(() => {
    unsupported.current = false;
  }, [jobId]);

  useEffect(() => {
    if (!enabled || unsupported.current) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const next = await api.getLive(jobId);
        if (!cancelled) setLive((prev) => (prev?.version === next.version ? prev : next));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) unsupported.current = true;
        // Anything else is transient: the next signal change retries.
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [jobId, signal, enabled]);

  return live;
}
