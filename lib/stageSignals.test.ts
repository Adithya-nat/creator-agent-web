import { describe, expect, it } from "vitest";
import { deriveStageSignals, stageOrderOf } from "@/lib/stageSignals";
import {
  STAGE_ORDER,
  type JobStatusResponse,
  type LogLine,
  type StageRef,
  type StageStatus,
} from "@/lib/types";

const MOTION_PIPELINE = [
  "script_writer",
  "reflection",
  "designer",
  "image_gen",
  "motion",
  "assembler",
];

function stage(name: string, status: StageStatus, extra: Partial<StageRef> = {}): StageRef {
  return {
    name,
    seq: 0,
    status,
    message: null,
    progress_current: null,
    progress_total: null,
    tokens: null,
    started_at: null,
    ended_at: null,
    ...extra,
  };
}

function job(duration = 30): JobStatusResponse {
  return {
    job_id: "j",
    status: "running",
    prompt: "p",
    duration,
    created_at: "",
    expires_at: "",
    error: null,
    warnings: [],
    current_stage: null,
    total_tokens: 0,
    prompt_tokens: 0,
    output_tokens: 0,
    stages: [],
    artifacts: [],
  };
}

function logLines(n: number): LogLine[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    stage: "x",
    level: "info",
    message: `line ${i}`,
    created_at: "",
  }));
}

describe("deriveStageSignals", () => {
  it("idle before anything runs: first stage is the active scene", () => {
    const s = deriveStageSignals({ stages: [], currentStage: null, status: null, job: null });
    expect(s.overall).toBe("idle");
    expect(s.done).toBe(false);
    expect(s.active).toBe("script_writer"); // firstNonDone
    expect(s.frames).toEqual({ current: 0, total: 15 }); // no job → 30s default
  });

  it("queued maps to idle overall", () => {
    const s = deriveStageSignals({ stages: [], currentStage: null, status: "queued", job: job() });
    expect(s.overall).toBe("idle");
  });

  it("mid-pipeline: current stage is active, earlier stages done, progress advances", () => {
    const s = deriveStageSignals({
      stages: [
        stage("script_writer", "succeeded"),
        stage("reflection", "succeeded"),
        stage("designer", "running"),
      ],
      currentStage: "designer",
      status: "running",
      job: job(),
    });
    expect(s.active).toBe("designer");
    expect(s.stages.script_writer.phase).toBe("done");
    expect(s.stages.reflection.phase).toBe("done");
    expect(s.stages.designer.phase).toBe("active");
    expect(s.stages.image_gen.phase).toBe("pending");
    expect(s.overall).toBe("running");
    // 2 of 10 fallback stages done + a half-weighted active stage => (2 + 0.5)/10
    expect(s.progress01).toBeCloseTo(0.25, 5);
  });

  it("skipped stages count as done (e.g. narration in a dialogue film)", () => {
    const s = deriveStageSignals({
      stages: [stage("narration", "skipped"), stage("motion", "running")],
      currentStage: "motion",
      status: "running",
      job: job(),
    });
    expect(s.stages.narration.phase).toBe("done");
    expect(s.stages.motion.phase).toBe("active");
  });

  it("image_gen exposes REAL frame progress (structural, not a guess)", () => {
    const s = deriveStageSignals({
      stages: [stage("image_gen", "running", { progress_current: 6, progress_total: 15 })],
      currentStage: "image_gen",
      status: "running",
      job: job(),
    });
    expect(s.frames).toEqual({ current: 6, total: 15 });
    expect(s.stages.image_gen.progress01).toBeCloseTo(0.4, 5);
  });

  it("60s job frames total is 30 by default", () => {
    const s = deriveStageSignals({ stages: [], currentStage: null, status: "running", job: job(60) });
    expect(s.frames.total).toBe(30);
  });

  it("once assembler has left pending, all frames count as done", () => {
    const s = deriveStageSignals({
      stages: [
        stage("image_gen", "succeeded", { progress_current: 15, progress_total: 15 }),
        stage("assembler", "running"),
      ],
      currentStage: "assembler",
      status: "running",
      job: job(),
    });
    expect(s.frames).toEqual({ current: 15, total: 15 });
    expect(s.active).toBe("assembler");
  });

  it("terminal success: done, no active scene, success overall", () => {
    const s = deriveStageSignals({
      stages: [stage("assembler", "succeeded")],
      currentStage: null,
      status: "completed",
      job: job(),
    });
    expect(s.done).toBe(true);
    expect(s.active).toBeNull();
    expect(s.overall).toBe("success");
  });

  it("completed_with_warnings maps to warnings overall", () => {
    const s = deriveStageSignals({
      stages: [stage("image_gen", "degraded")],
      currentStage: null,
      status: "completed_with_warnings",
      job: job(),
    });
    expect(s.overall).toBe("warnings");
    expect(s.stages.image_gen.phase).toBe("done"); // degraded still "done" visually
  });

  it("a failed stage surfaces as failed phase + overall", () => {
    const s = deriveStageSignals({
      stages: [stage("image_gen", "failed")],
      currentStage: null,
      status: "failed",
      job: job(),
    });
    expect(s.stages.image_gen.phase).toBe("failed");
    expect(s.overall).toBe("failed");
    expect(s.done).toBe(true);
  });

  it("intensity comes from log VOLUME only, clamped to 1", () => {
    const s = deriveStageSignals({
      stages: [stage("designer", "running")],
      currentStage: "designer",
      status: "running",
      job: job(),
      logsByStage: { designer: logLines(6), image_gen: logLines(50) },
    });
    expect(s.stages.designer.intensity).toBeCloseTo(0.5, 5); // 6 / 12
    expect(s.stages.image_gen.intensity).toBe(1); // clamped
  });
});

describe("stageOrderOf", () => {
  it("null job -> the 5-stage fallback", () => {
    expect(stageOrderOf(null)).toEqual(STAGE_ORDER);
  });

  it("old server (no pipeline) -> the fallback", () => {
    expect(stageOrderOf(job())).toEqual(STAGE_ORDER);
  });

  it("job with pipeline -> the pipeline (motion included)", () => {
    expect(stageOrderOf({ ...job(), pipeline: MOTION_PIPELINE })).toEqual(MOTION_PIPELINE);
  });
});

describe("deriveStageSignals with the motion pipeline", () => {
  it("motion is a real stage: active when running, no phantom cap", () => {
    const s = deriveStageSignals({
      stages: [
        stage("script_writer", "succeeded"),
        stage("reflection", "succeeded"),
        stage("designer", "succeeded"),
        stage("image_gen", "succeeded", { progress_current: 15, progress_total: 15 }),
        stage("motion", "running", { progress_current: 2, progress_total: 15 }),
      ],
      currentStage: "motion",
      status: "running",
      job: { ...job(), pipeline: MOTION_PIPELINE },
    });
    expect(s.order).toEqual(MOTION_PIPELINE);
    expect(s.active).toBe("motion");
    expect(s.stages.motion.phase).toBe("active");
    // 4 of 6 done + half-weighted active motion => (4 + 0.5)/6
    expect(s.progress01).toBeCloseTo(4.5 / 6, 5);
  });

  it("all six stages done -> progress reaches 1.0 (no 5/6 cap)", () => {
    const s = deriveStageSignals({
      stages: MOTION_PIPELINE.map((n) => stage(n, "succeeded")),
      currentStage: null,
      status: "completed",
      job: { ...job(), pipeline: MOTION_PIPELINE },
    });
    expect(s.progress01).toBeCloseTo(1, 5);
    expect(s.done).toBe(true);
  });
});
