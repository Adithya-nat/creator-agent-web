"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { api, ApiError } from "@/lib/api";
import { controlPhase } from "@/lib/runControls";
import type { Checkpoint, JobStatus } from "@/lib/types";

/** How often to refresh the checkpoint per phase: fast while a pause drains (the
 *  in-flight tiles tick over), slow while running, once when parked. */
const POLL_MS: Record<string, number | null> = { pausing: 1200, running: 4000, paused: null };

/** The job's checkpoint (per-unit state + cost to finish). Null until it lands, and
 *  null for good on a server without run controls (the UI then hides them). */
export function useCheckpoint(jobId: string, status: JobStatus | null, nonce = 0) {
  const [cp, setCp] = useState<Checkpoint | null>(null);
  const [supported, setSupported] = useState(true);
  const phase = controlPhase(status);

  useEffect(() => {
    if (!supported || phase === "idle" || phase === "finished") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const next = await api.getCheckpoint(jobId);
        if (!cancelled) setCp(next);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          if (!cancelled) setSupported(false);
          return;
        }
        // transient: try again on the next tick
      }
      const every = POLL_MS[phase];
      if (!cancelled && every) timer = setTimeout(tick, every);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, phase, supported, nonce]);

  return { checkpoint: cp, supported };
}

export type ControlAction = "pause" | "resume" | "withdraw" | "finish" | null;

export interface RunControls {
  busy: ControlAction;
  error: string | null;
  pause: () => Promise<boolean>;
  /** Resume a paused job, or withdraw a pause that is still draining. */
  resume: (opts?: { allowStills?: boolean }) => Promise<boolean>;
  breakpoints: string[];
  setBreakpoints: (stages: string[]) => void;
}

const MESSAGES: Record<number, string> = {
  400: "Add your Gemini key to resume this film.",
  429: "You already have a film rendering. Try again when it finishes.",
  409: "The film changed state just now. It may already be running or finished.",
  404: "This film has expired and can't be controlled any more.",
  410: "This film has expired and can't be controlled any more.",
};

/** Pause / resume / breakpoint actions for one job, with optimistic breakpoints
 *  (saved after a short debounce, so toggling several in a row is one request). */
export function useRunControls(
  jobId: string,
  status: JobStatus | null,
  serverBreakpoints: string[] | undefined,
  onResumed: () => void,
): RunControls {
  const { needsKey, hasKey, openKeyDialog } = useAccount();
  const [busy, setBusy] = useState<ControlAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakpoints, setLocal] = useState<string[]>(serverBreakpoints ?? []);
  const [synced, setSynced] = useState(serverBreakpoints);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the server's list when it changes (e.g. a breakpoint fired and was
  // consumed), unless the user has unsaved toggles in flight.
  if (serverBreakpoints !== synced) {
    setSynced(serverBreakpoints);
    if (!dirty && serverBreakpoints) setLocal(serverBreakpoints);
  }

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const fail = (e: unknown) => {
    setError(
      e instanceof ApiError
        ? (MESSAGES[e.status] ?? e.message)
        : "Can't reach the server. Is the API running?",
    );
  };

  const pause = useCallback(async () => {
    setBusy("pause");
    setError(null);
    try {
      await api.pauseJob(jobId);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(null);
    }
  }, [jobId]);

  const resume = useCallback(
    async (opts?: { allowStills?: boolean }) => {
      const draining = status === "pausing";
      // A parked film resumes as a new run, which needs the tester's key (BYOK).
      // Withdrawing a pause doesn't: the draining run keeps the key it has.
      if (!draining && needsKey && !hasKey) {
        setError(MESSAGES[400]);
        openKeyDialog();
        return false;
      }
      setBusy(opts?.allowStills ? "finish" : draining ? "withdraw" : "resume");
      setError(null);
      try {
        const res = await api.resumeJob(jobId, opts);
        if (res.status !== 202) {
          let detail = "";
          try {
            const d = (await res.json())?.detail;
            detail = typeof d === "string" ? d : (d?.message ?? "");
          } catch {
            /* non-JSON */
          }
          if (res.status === 400) openKeyDialog();
          throw new ApiError(res.status, detail || "Couldn't resume the film.");
        }
        // Withdrawing a pause keeps the same live stream; a parked job's stream has
        // closed, so re-subscribe to watch the new run.
        if (!draining) onResumed();
        return true;
      } catch (e) {
        fail(e);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [jobId, status, onResumed, needsKey, hasKey, openKeyDialog],
  );

  const setBreakpoints = useCallback(
    (stages: string[]) => {
      setLocal(stages);
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const { breakpoints: saved } = await api.setBreakpoints(jobId, stages);
          setLocal(saved);
        } catch (e) {
          fail(e);
        } finally {
          setDirty(false);
        }
      }, 450);
    },
    [jobId],
  );

  return { busy, error, pause, resume, breakpoints, setBreakpoints };
}
