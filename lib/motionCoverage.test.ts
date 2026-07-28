import { describe, expect, it } from "vitest";
import { formatMotionCoverage, motionBadge } from "@/lib/motionCoverage";
import type { MotionCoverage, StoryboardScene } from "@/lib/types";

const scene: StoryboardScene = {
  order: 1,
  narration: "A beat",
  frame_url: "/frame",
  video_url: "/motion",
  status: "ok",
};

describe("formatMotionCoverage", () => {
  it("returns nothing for an old backend with no coverage metadata", () => {
    expect(formatMotionCoverage(undefined)).toBeNull();
  });

  it("shows actual Veo model allocation and total coverage", () => {
    const coverage: MotionCoverage = {
      total: 15,
      animated: 15,
      generative: 15,
      local_generative: 0,
      composited: 0,
      kenburns: 0,
      still: 0,
      by_renderer: { veo: 15 },
      by_model: {
        "veo-3.1-lite-generate-preview": 10,
        "veo-3.1-fast-generate-preview": 5,
      },
    };
    expect(formatMotionCoverage(coverage)).toBe(
      "15/15 animated · 10 Lite · 5 Fast",
    );
  });

  it("shows non-generative fallback coverage honestly", () => {
    const coverage: MotionCoverage = {
      total: 15,
      animated: 15,
      generative: 12,
      local_generative: 0,
      composited: 3,
      kenburns: 0,
      still: 0,
      by_renderer: { veo: 12, compositor: 3 },
      by_model: {},
    };
    expect(formatMotionCoverage(coverage)).toBe(
      "15/15 animated · 12 generative · 3 composited",
    );
  });
});

describe("motionBadge", () => {
  it("stays hidden for old successful scene payloads", () => {
    expect(motionBadge(scene)).toBeNull();
  });

  it("labels specific Veo models", () => {
    expect(
      motionBadge({
        ...scene,
        motion_kind: "generative",
        motion_model: "veo-3.1-lite-generate-preview",
      }),
    ).toBe("Lite");
  });

  it("labels composited and legacy degraded fallbacks", () => {
    expect(motionBadge({ ...scene, motion_kind: "composited" })).toBe(
      "composited",
    );
    expect(motionBadge({ ...scene, status: "degraded" })).toBe("fallback");
  });
});
