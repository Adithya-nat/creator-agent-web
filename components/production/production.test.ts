import { describe, expect, it } from "vitest";
import { liveSignal } from "@/hooks/useLiveAssets";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";
import { syntheticPeaks } from "./media";
import { buildShots, resolveLive, shotCount, standIns } from "./shots";
import { stationFor, STATIONS } from "./stations";

const live = (over: Partial<LiveAssets> = {}): LiveAssets => ({
  job_id: "j",
  version: "v1",
  title: null,
  logline: null,
  beats: [],
  scores: {},
  score_overall: null,
  style_ref_url: null,
  cast: [],
  frames: [],
  clips: [],
  narration_url: null,
  music_url: null,
  cover_url: null,
  caption: null,
  ...over,
});

const stage = (name: string, over: Partial<StageRef> = {}): StageRef => ({
  name,
  seq: 1,
  status: "running",
  message: null,
  progress_current: null,
  progress_total: null,
  tokens: null,
  started_at: null,
  ended_at: null,
  ...over,
});

describe("shotCount", () => {
  it("defaults by runtime before anything is known", () => {
    expect(shotCount(null, null, [])).toBe(5);
    expect(shotCount(null, { duration: 60 } as JobStatusResponse, [])).toBe(8);
  });

  it("takes the larger of beats and real frame total (a scene can hold several shots)", () => {
    const beats = [1, 2, 3].map((order) => ({ order, text: "b", speaker: null }));
    expect(shotCount(live({ beats }), null, [])).toBe(3);
    expect(shotCount(live({ beats }), null, [stage("image_gen", { progress_total: 7 })])).toBe(7);
  });

  it("is capped so the contact sheet stays legible", () => {
    expect(shotCount(null, null, [stage("image_gen", { progress_total: 90 })])).toBe(30);
  });
});

describe("buildShots", () => {
  it("joins beats, frames and clips by order and keeps a stand-in for every shot", () => {
    const shots = buildShots(
      live({
        beats: [{ order: 2, text: "Who sent this?", speaker: "MAYA" }],
        frames: [{ order: 1, url: "http://api/f1", status: "ok" }],
        clips: [{ order: 1, url: "http://api/c1", status: "ok" }],
      }),
      3,
      standIns("job", 3),
    );
    expect(shots.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(shots[0]).toMatchObject({ frameUrl: "http://api/f1", clipUrl: "http://api/c1", beat: null });
    expect(shots[1]).toMatchObject({ beat: "Who sent this?", speaker: "MAYA", frameUrl: null });
    expect(shots.every((s) => s.poster)).toBe(true);
  });
});

describe("standIns", () => {
  it("is deterministic per job (SSR and client agree) and differs across jobs", () => {
    const a = standIns("job-a", 6).map((p) => p.id);
    expect(standIns("job-a", 6).map((p) => p.id)).toEqual(a);
    expect(standIns("job-b", 6).map((p) => p.id)).not.toEqual(a);
  });
});

describe("resolveLive", () => {
  it("prefixes relative asset URLs and leaves absolute ones", () => {
    const r = resolveLive(
      live({
        style_ref_url: "/storyboard/j/artifacts/1",
        frames: [{ order: 1, url: "http://cdn/x.png", status: "ok" }],
        cast: [{ name: "Maya", portrait_url: "/storyboard/j/artifacts/2" }],
      }),
    )!;
    expect(r.style_ref_url).toMatch(/^https?:\/\/.+\/storyboard\/j\/artifacts\/1$/);
    expect(r.frames[0].url).toBe("http://cdn/x.png");
    expect(r.cast[0].portrait_url).toMatch(/\/artifacts\/2$/);
    expect(resolveLive(null)).toBeNull();
  });
});

describe("stations", () => {
  it("covers every classic pipeline stage plus brief, dialogue_pass and film_review", () => {
    for (const name of [
      "brief",
      "script_writer",
      "dialogue_pass",
      "reflection",
      "designer",
      "image_gen",
      "narration",
      "motion",
      "captions",
      "music",
      "assembler",
      "film_review",
      "publish_kit",
    ]) {
      expect(STATIONS[name], name).toBeDefined();
    }
  });

  it("gives each paper station its own scene", () => {
    expect(STATIONS.script_writer.view).toBe("writers");
    expect(STATIONS.dialogue_pass.view).toBe("tableread");
    expect(STATIONS.reflection.view).toBe("notes");
  });

  it("falls back to a generic station for stages this build doesn't know", () => {
    const st = stationFor("color_grade");
    expect(st.view).toBe("generic");
    expect(st.dept).toBe("Color Grade");
    expect(st.action({ live: null, stage: undefined, frames: { current: 0, total: 0 } })).toContain("Color Grade");
  });

  it("action lines use real progress and assets", () => {
    const frames = { current: 4, total: 9 };
    expect(STATIONS.image_gen.action({ live: null, stage: undefined, frames })).toBe("Developed 4 of 9 frames");
    expect(
      STATIONS.reflection.action({ live: live({ score_overall: 85 }), stage: undefined, frames }),
    ).toContain("85/100");
    expect(
      STATIONS.motion.action({ live: null, stage: stage("motion", { progress_current: 2, progress_total: 5 }), frames }),
    ).toBe("Filming scene 3 of 5");
  });
});

describe("liveSignal", () => {
  it("prefers the SSE fingerprint, else tracks artifacts + stage progress", () => {
    expect(liveSignal("abc", null, [])).toBe("abc");
    const a = liveSignal(null, null, [stage("image_gen", { progress_current: 1 })]);
    const b = liveSignal(null, null, [stage("image_gen", { progress_current: 2 })]);
    expect(a).not.toBe(b);
  });
});

describe("syntheticPeaks", () => {
  it("is stable for a seed and bounded to 0..1", () => {
    const p = syntheticPeaks(7, 64);
    expect(syntheticPeaks(7, 64)).toEqual(p);
    expect(p).toHaveLength(64);
    expect(p.every((v) => v > 0 && v <= 1)).toBe(true);
  });
});

describe("parseUtc", () => {
  it("treats zone-less timestamps as UTC and respects explicit zones", async () => {
    const { parseUtc } = await import("./ProductionLine");
    expect(parseUtc("2026-11-14T10:00:00")).toBe(Date.UTC(2026, 10, 14, 10));
    expect(parseUtc("2026-11-14T10:00:00Z")).toBe(Date.UTC(2026, 10, 14, 10));
    expect(parseUtc("2026-11-14T10:00:00+05:30")).toBe(Date.UTC(2026, 10, 14, 4, 30));
  });
});
