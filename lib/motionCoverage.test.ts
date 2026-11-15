import { describe, expect, it } from "vitest";
import { formatMotionCoverage, modelLabel, motionBadge, voiceBadge } from "@/lib/motionCoverage";
import type { MotionCoverage, StoryboardScene } from "@/lib/types";

const base: MotionCoverage = {
  total: 0, animated: 0, generative: 0, local_generative: 0, composited: 0,
  kenburns: 0, still: 0, by_renderer: {}, by_model: {},
};

const scene: StoryboardScene = {
  order: 1, narration: "x", frame_url: null, video_url: null, status: "ok",
};

describe("motion coverage", () => {
  it("is null without coverage", () => {
    expect(formatMotionCoverage(undefined)).toBeNull();
    expect(formatMotionCoverage(base)).toBeNull();
  });

  it("summarises Omni-filmed scenes and fallbacks", () => {
    const c = { ...base, total: 10, animated: 10, generative: 8, kenburns: 2,
      by_model: { "gemini-omni-1.2-flash": 7, "gemini-omni-1.1-flash": 1 } };
    expect(formatMotionCoverage(c)).toBe("8/10 AI-filmed · 7 Omni 1.2 · 1 Omni 1.1 · 2 fallback");
  });

  it("labels models and badges", () => {
    expect(modelLabel("gemini-omni-1.2-flash")).toBe("Omni 1.2");
    expect(motionBadge(scene)).toBeNull();
    expect(motionBadge({ ...scene, motion_kind: "generative", motion_model: "gemini-omni-1.2-flash" })).toBe("Omni 1.2");
    expect(motionBadge({ ...scene, motion_kind: "kenburns" })).toBe("fallback");
    expect(voiceBadge({ ...scene, voice: "on_camera" })?.label).toBe("Spoken on camera");
    expect(voiceBadge({ ...scene, voice: "silent" })).toBeNull();
  });
});
