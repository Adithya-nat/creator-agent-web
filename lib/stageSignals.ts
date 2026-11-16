// Pure mapping: live job state -> per-stage 3D scene inputs.
//
// This is the ONE place raw job data becomes scene props, and it is deliberately
// pure + unit-tested. It reads STRUCTURAL signals only — currentStage, per-stage
// status, image_gen progress_current/total, job.duration — and treats logs as
// ambient texture (line COUNT -> activity intensity), never parsing log TEXT.
// That keeps the 3D decoupled from backend log wording: a reworded log line can
// change the log stream without silently breaking a scene.

import {
  STAGE_ORDER,
  isFinished,
  type JobStatus,
  type JobStatusResponse,
  type LogLine,
  type StageRef,
  type StageStatus,
} from "@/lib/types";

/** What a scene should draw for a stage right now. */
export type ScenePhase = "pending" | "active" | "done" | "failed";

/** Overall pipeline mood — drives palette + the completion flourish. */
export type OverallPhase = "idle" | "running" | "success" | "warnings" | "failed";

export interface StageSignal {
  name: string;
  status: StageStatus;
  phase: ScenePhase;
  /** 0..1. Real fraction for image_gen; 1 when done; 0 otherwise (the scene
   *  animates its own fill from its clock — we don't fake elapsed here). */
  progress01: number;
  /** 0..1 ambient "busyness" from log VOLUME only (never log text). */
  intensity: number;
  logCount: number;
}

export interface StageSignals {
  /** The scene to show now: the running stage, or null when terminal (→ completion). */
  active: string | null;
  overall: OverallPhase;
  done: boolean;
  /** Real image_gen progress (assembler running/done ⇒ all frames counted). */
  frames: { current: number; total: number };
  /** Overall pipeline progress 0..1 across the five stages. */
  progress01: number;
  stages: Record<string, StageSignal>;
  order: string[];
}

const FRAME_STAGE = "image_gen";
const INTENSITY_FULL_AT = 12; // ~12+ log lines in a stage reads as "fully busy"

/** The stage order for a job: its live `pipeline` (which includes "motion" only
 *  when the engine is on), or the static fallback for a null/old-server job. This
 *  is the single source of truth both the 3D scene and the pipeline list use, so
 *  a client-side list can never disagree with what the server actually runs. */
export function stageOrderOf(job: JobStatusResponse | null): string[] {
  return job?.pipeline && job.pipeline.length ? job.pipeline : STAGE_ORDER;
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function mergeStage(name: string, seq: number, byName: Map<string, StageRef>): StageRef {
  return (
    byName.get(name) ?? {
      name,
      seq,
      status: "pending",
      message: null,
      progress_current: null,
      progress_total: null,
      tokens: null,
      started_at: null,
      ended_at: null,
    }
  );
}

function phaseOf(st: StageRef, isCurrent: boolean): ScenePhase {
  switch (st.status) {
    case "succeeded":
    case "degraded":
    case "skipped":
      return "done";
    case "failed":
    case "interrupted":
      return "failed";
    case "running":
    case "paused": // the line stopped here; it is still the station in view
      return "active";
    default:
      return isCurrent ? "active" : "pending";
  }
}

function overallPhase(status: JobStatus | null): OverallPhase {
  if (status == null || status === "queued") return "idle";
  if (status === "completed") return "success";
  if (status === "completed_with_warnings") return "warnings";
  if (status === "failed" || status === "interrupted") return "failed";
  return "running";
}

export function deriveStageSignals(input: {
  stages: StageRef[];
  currentStage: string | null;
  status: JobStatus | null;
  job: JobStatusResponse | null;
  logsByStage?: Record<string, LogLine[]>;
}): StageSignals {
  const { stages, currentStage, status, job } = input;
  const logsByStage = input.logsByStage ?? {};
  const byName = new Map(stages.map((s) => [s.name, s]));
  const order = stageOrderOf(job);

  // Frames: real image_gen progress. Once a LATER stage (assembler) has left
  // pending, every frame is done — mirrors the existing StatusView derivation.
  const ig = byName.get(FRAME_STAGE);
  const asm = byName.get("assembler");
  const total = ig?.progress_total ?? (job?.duration === 60 ? 30 : 15);
  const framesDoneByLater = asm != null && asm.status !== "pending";
  const current = framesDoneByLater ? total : ig?.progress_current ?? 0;

  const stageSignals: Record<string, StageSignal> = {};
  let doneCount = 0;
  let activeFraction = 0;

  order.forEach((name, i) => {
    const st = mergeStage(name, i + 1, byName);
    const isCurrent = currentStage === name;
    const phase = phaseOf(st, isCurrent);
    const logCount = (logsByStage[name] ?? []).length;

    let progress01 = 0;
    if (phase === "done") {
      progress01 = 1;
    } else if (name === FRAME_STAGE && (st.progress_total ?? 0) > 0) {
      progress01 = clamp01((st.progress_current ?? 0) / (st.progress_total || 1));
    }

    stageSignals[name] = {
      name,
      status: st.status,
      phase,
      progress01,
      intensity: clamp01(logCount / INTENSITY_FULL_AT),
      logCount,
    };

    if (phase === "done") doneCount += 1;
    else if (phase === "active")
      activeFraction = Math.max(activeFraction, name === FRAME_STAGE ? progress01 : 0.5);
  });

  // A paused job isn't done: the line stays on the station where it stopped.
  const done = status != null && isFinished(status);
  const firstNonDone = order.find((n) => stageSignals[n].phase !== "done") ?? order[0];
  const active = done ? null : currentStage ?? firstNonDone;
  const progress01 = clamp01((doneCount + activeFraction) / order.length);

  return {
    active,
    overall: overallPhase(status),
    done,
    frames: { current, total },
    progress01,
    stages: stageSignals,
    order,
  };
}
