"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  isTerminal,
  type JobStatus,
  type JobStatusResponse,
  type LogLine,
  type StageRef,
} from "@/lib/types";

export type ConnState = "connecting" | "live" | "polling" | "closed";

export interface JobStream {
  job: JobStatusResponse | null; // metadata snapshot (prompt, created/expires, ...)
  status: JobStatus | null; // live status
  stages: StageRef[]; // live per-stage summary
  currentStage: string | null;
  logsByStage: Record<string, LogLine[]>;
  done: boolean;
  connection: ConnState;
  error: { status: number; message: string } | null; // 404 not found / 410 expired
  /** Fingerprint of the job's published artifacts, from the SSE `assets` event
   *  (null on servers without live assets, or while polling). */
  assetsVersion: string | null;
}

export const JOB_LOG_KEY = "__job__"; // bucket for stage === null (job-level logs)

const INITIAL: JobStream = {
  job: null,
  status: null,
  stages: [],
  currentStage: null,
  logsByStage: {},
  done: false,
  connection: "connecting",
  error: null,
  assetsVersion: null,
};

/**
 * Live job state via SSE (/events) with an automatic polling fallback.
 *
 * Flow: fetch one GET /{id} snapshot for metadata, then subscribe to SSE for
 * live status/stage/log. EventSource auto-reconnects (Last-Event-ID) on transient
 * drops; on a hard close (e.g. 503 when streaming is disabled, or a buffering
 * proxy) we fall back to polling GET /{id} + /logs?after= so a long job never
 * looks frozen. 404/410 surface as an error (not found / expired).
 */
export function useJobStream(jobId: string): JobStream {
  const [state, setState] = useState<JobStream>(INITIAL);
  const [streamFor, setStreamFor] = useState(jobId);
  if (streamFor !== jobId) {
    // New job: reset during render instead of in the effect.
    setStreamFor(jobId);
    setState(INITIAL);
  }

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let cursor = 0;
    const seen = new Set<number>();

    const patch = (p: Partial<JobStream>) =>
      setState((s) => ({ ...s, ...p }));

    const appendLogs = (lines: LogLine[]) => {
      const fresh = lines.filter((l) => !seen.has(l.id));
      if (fresh.length === 0) return;
      for (const l of fresh) {
        seen.add(l.id);
        if (l.id > cursor) cursor = l.id;
      }
      setState((s) => {
        const next = { ...s.logsByStage };
        for (const l of fresh) {
          const key = l.stage ?? JOB_LOG_KEY;
          next[key] = [...(next[key] ?? []), l];
        }
        return { ...s, logsByStage: next };
      });
    };

    // SSE carries status/stages/logs but NOT the full job (warnings, error). When
    // a job finishes over SSE we refetch the job once so the warnings banner and
    // failure detail render. (The polling path already refreshes job each tick.)
    let terminalRefreshed = false;
    const refreshJobOnce = async () => {
      if (terminalRefreshed) return;
      terminalRefreshed = true;
      try {
        const job = await api.getJob(jobId);
        if (!cancelled) patch({ job });
      } catch {
        /* keep the existing job metadata */
      }
    };

    const startPolling = () => {
      if (cancelled) return;
      patch({ connection: "polling" });
      const tick = async () => {
        if (cancelled) return;
        try {
          const job = await api.getJob(jobId);
          const logs = await api.getLogs(jobId, { after: cursor });
          if (cancelled) return;
          patch({
            job,
            status: job.status,
            stages: job.stages,
            currentStage: job.current_stage,
          });
          appendLogs(logs.logs);
          if (isTerminal(job.status)) {
            patch({ done: true, connection: "closed" });
            return;
          }
        } catch (e) {
          if (
            e instanceof ApiError &&
            (e.status === 404 || e.status === 410)
          ) {
            patch({
              error: { status: e.status, message: e.message },
              connection: "closed",
            });
            return;
          }
          // transient error: keep polling
        }
        pollTimer = setTimeout(tick, 1500);
      };
      void tick();
    };

    const openSSE = () => {
      es = new EventSource(api.eventsUrl(jobId));
      es.onopen = () => !cancelled && patch({ connection: "live" });

      es.addEventListener("status", (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data);
          patch({ status: d.status, currentStage: d.current_stage ?? null });
          if (isTerminal(d.status)) void refreshJobOnce();
        } catch {
          /* ignore malformed frame */
        }
      });
      es.addEventListener("stage", (e) => {
        try {
          patch({ stages: JSON.parse((e as MessageEvent).data) as StageRef[] });
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("assets", (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data);
          if (typeof d.version === "string") patch({ assetsVersion: d.version });
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("log", (e) => {
        try {
          appendLogs([JSON.parse((e as MessageEvent).data) as LogLine]);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("done", (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data);
          patch({ status: d.status, done: true, connection: "closed" });
        } catch {
          patch({ done: true, connection: "closed" });
        }
        void refreshJobOnce();
        es?.close();
      });
      es.onerror = () => {
        // CONNECTING -> browser is auto-reconnecting; leave it. CLOSED -> a hard
        // failure (503 / proxy / server closed): fall back to polling.
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          setState((s) =>
            s.done || s.error ? s : { ...s, connection: "polling" },
          );
          startPolling();
        }
      };
    };

    (async () => {
      try {
        const job = await api.getJob(jobId);
        if (cancelled) return;
        patch({
          job,
          status: job.status,
          stages: job.stages,
          currentStage: job.current_stage,
        });
        openSSE(); // also replays logs for an already-finished job, then closes
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
          patch({
            error: { status: e.status, message: e.message },
            connection: "closed",
          });
        } else {
          startPolling(); // backend unreachable now; polling will surface errors
        }
      }
    })();

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId]);

  return state;
}
