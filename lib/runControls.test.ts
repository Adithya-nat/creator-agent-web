import { describe, expect, it, vi } from "vitest";
import {
  BreakpointSync,
  breakableStages,
  controlPhase,
  costSplit,
  landingCount,
  landingNote,
  resumeTarget,
  toggleStage,
  unitTiles,
} from "./runControls";
import type { Checkpoint, StageRef } from "./types";

const cp = (over: Partial<Checkpoint> = {}): Checkpoint => ({
  job_id: "j",
  status: "paused",
  pause_requested: false,
  paused_stage: "motion",
  paused_message: "Paused after 2 of 6 AI clips; 4 left",
  resume_stage: "motion",
  resume_unit: 3,
  breakpoints: [],
  spent_usd: 3,
  remaining_usd: 1,
  estimate_basis: "units",
  stages: [
    {
      name: "motion",
      status: "paused",
      cost_usd: 1,
      remaining_usd: 1,
      breakpoint: false,
      units: { noun: "AI clips", total: 6, done: [1, 2], in_flight: [], pending: [3, 4, 5, 6], unit_cost_usd: 0.25 },
    },
  ],
  ...over,
});

const stage = (name: string, status: StageRef["status"]): StageRef => ({
  name,
  seq: 1,
  status,
  message: null,
  progress_current: null,
  progress_total: null,
  tokens: null,
  started_at: null,
  ended_at: null,
});

describe("controlPhase", () => {
  it("maps statuses to the control the dock shows", () => {
    expect(controlPhase("running")).toBe("running");
    expect(controlPhase("pausing")).toBe("paused"); // pause is instant to the user
    expect(controlPhase("paused")).toBe("paused");
    expect(controlPhase("queued")).toBe("idle");
    expect(controlPhase("completed")).toBe("finished");
    expect(controlPhase("failed")).toBe("finished");
  });
});

describe("resumeTarget", () => {
  it("names the exact unit a resume starts at", () => {
    const t = resumeTarget(cp());
    expect(t.label).toBe("Resume from scene 3");
    expect(t.detail).toContain("scene 3 of 6");
    expect(t.detail).toContain("2 finished scenes are kept");
  });

  it("falls back to the stage when it has no units", () => {
    const t = resumeTarget(cp({ resume_stage: "music", resume_unit: null, stages: [] }));
    expect(t.label).toBe("Resume at Score");
  });

  it("is a plain Resume without a checkpoint", () => {
    expect(resumeTarget(null).label).toBe("Resume");
  });
});

describe("unitTiles", () => {
  it("orders tiles and puts the playhead on the resume unit", () => {
    const tiles = unitTiles({ noun: "", total: 4, done: [1], in_flight: [2], pending: [3, 4], unit_cost_usd: 0 }, 3);
    expect(tiles.map((t) => t.state)).toEqual(["done", "in_flight", "pending", "pending"]);
    expect(tiles.filter((t) => t.resumesHere).map((t) => t.order)).toEqual([3]);
  });

  it("fills 1..total when the payload has no unit lists", () => {
    const tiles = unitTiles({ noun: "", total: 3, done: [], in_flight: [], pending: [], unit_cost_usd: 0 }, null);
    expect(tiles.map((t) => t.order)).toEqual([1, 2, 3]);
  });
});

describe("landingNote", () => {
  it("counts paid units still landing after the pause", () => {
    const c = cp({ stages: [{ ...cp().stages[0], units: { ...cp().stages[0].units!, in_flight: [3, 4] } }] });
    expect(landingNote(c)).toBe("2 scenes already paid for are still landing and will be kept");
    expect(landingCount(c)).toBe(2);
  });
  it("says nothing when nothing is in flight", () => {
    expect(landingNote(null)).toBeNull();
    expect(landingNote(cp())).toBeNull();
    expect(landingCount(null)).toBe(0);
  });
});

describe("breakpoints", () => {
  it("only offers stages that haven't started", () => {
    const order = ["brief", "script_writer", "image_gen", "motion"];
    const stages = [stage("brief", "succeeded"), stage("script_writer", "running")];
    expect(breakableStages(order, stages)).toEqual(["image_gen", "motion"]);
  });

  it("toggles and keeps pipeline order", () => {
    const order = ["a", "b", "c"];
    expect(toggleStage(["c"], "a", order)).toEqual(["a", "c"]);
    expect(toggleStage(["a", "c"], "a", order)).toEqual(["c"]);
  });
});

describe("costSplit", () => {
  it("splits kept vs to-finish", () => {
    expect(costSplit(cp())).toEqual({ kept: 3, toFinish: 1, keptShare: 0.75 });
    expect(costSplit(null).keptShare).toBe(0);
  });
});

describe("BreakpointSync", () => {
  const flush = async () => {
    await vi.runAllTimersAsync();
  };

  it("never lets an earlier save overwrite a newer edit", async () => {
    vi.useFakeTimers();
    const calls: string[][] = [];
    let release!: (v: string[]) => void;
    const save = vi.fn((stages: string[]) => {
      calls.push(stages);
      return calls.length === 1 ? new Promise<string[]>((r) => (release = r)) : Promise.resolve(stages);
    });
    const sync = new BreakpointSync([], save, () => {}, 450);

    sync.edit(["motion"]);
    await vi.advanceTimersByTimeAsync(450); // Motion save goes out and hangs
    sync.edit(["motion", "music"]); // edit while it's in flight
    release(["motion"]); // the stale Motion response lands
    await flush();
    expect(sync.local).toEqual(["motion", "music"]);
    sync.edit(["motion", "music", "captions"]);
    await flush();
    // One request at a time; Music is saved, never lost.
    expect(calls).toEqual([["motion"], ["motion", "music"], ["motion", "music", "captions"]]);
    expect(sync.local).toEqual(["motion", "music", "captions"]);
    vi.useRealTimers();
  });

  it("ignores a checkpoint read that predates the last save", async () => {
    vi.useFakeTimers();
    let t = 1000;
    const sync = new BreakpointSync([], async (s) => s, () => {}, 0, () => t);
    sync.edit(["motion"]);
    await flush(); // acked at t=1000
    sync.observe([], 900); // GET started before the save: stale
    expect(sync.local).toEqual(["motion"]);
    t = 2000;
    sync.observe([], 1500); // read after the save: the breakpoint fired and was consumed
    expect(sync.local).toEqual([]);
    vi.useRealTimers();
  });

  it("rolls back and reports when a save fails", async () => {
    vi.useFakeTimers();
    const views: { local: string[]; error?: unknown }[] = [];
    const sync = new BreakpointSync(["music"], async () => Promise.reject(new Error("down")), (v) => views.push(v), 0);
    sync.edit(["music", "motion"]);
    await flush();
    expect(sync.local).toEqual(["music"]);
    expect(views.at(-1)?.error).toBeInstanceOf(Error);
    vi.useRealTimers();
  });

  it("adopts the server list while nothing is unsaved", () => {
    const sync = new BreakpointSync([], async (s) => s, () => {});
    sync.observe(["edit"], 0);
    expect(sync.local).toEqual(["edit"]);
  });
});
