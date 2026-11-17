import { describe, expect, it } from "vitest";
import { aboutTime, filmBlocks, keyOf, ripple, shotSegments, suggestions, toggle, touchedScenes, wordDiff } from "./recut";
import type { RecutMap, RecutRef } from "./types";

const clip4: RecutRef = { kind: "clip", unit: 4 };
const frame2: RecutRef = { kind: "frame", unit: 2 };

describe("selection", () => {
  it("replaces on click, adds and removes with a modifier", () => {
    expect(toggle([clip4], frame2, false)).toEqual([frame2]);
    expect(toggle([clip4], frame2, true)).toEqual([clip4, frame2]);
    expect(toggle([clip4, frame2], clip4, true)).toEqual([frame2]);
    expect(toggle([clip4], clip4, false)).toEqual([]);
  });
});

describe("ripple", () => {
  it("a clip rebuilds its captions and the edit only", () => {
    expect([...ripple([clip4], [1, 2, 3, 4], true)].sort()).toEqual(["captions-4", "clip-4", "edit"]);
  });
  it("a frame takes its clip and the cover with it", () => {
    expect(ripple([frame2], [1, 2], true)).toEqual(new Set(["frame-2", "clip-2", "captions-2", "release", "edit"]));
  });
  it("the story touches every scene", () => {
    expect(touchedScenes(ripple([{ kind: "story", unit: null }], [1, 2, 3], true))).toEqual(new Set([1, 2, 3]));
  });
  it("drops clips when the film has no video stage", () => {
    expect(ripple([frame2], [1, 2], false).has("clip-2")).toBe(false);
  });
  it("a release rewrite leaves the edit alone", () => {
    expect(ripple([{ kind: "release", unit: null }], [1], true)).toEqual(new Set(["release"]));
  });
});

describe("timeline geometry", () => {
  it("sizes blocks by seconds and can show a past cut's timing", () => {
    const scenes = [
      { order: 1, seconds: 10 },
      { order: 2, seconds: 30 },
    ];
    const now = filmBlocks(scenes);
    expect(now.map((b) => b.width)).toEqual([0.25, 0.75]);
    const then = filmBlocks(scenes, { "1": 20, "2": 20 });
    expect(then.map((b) => [b.start, b.width])).toEqual([
      [0, 0.5],
      [0.5, 0.5],
    ]);
  });
  it("lays out shots on the clip's time axis", () => {
    const segs = shotSegments([{ seconds: 3 }, { seconds: 4 }, { seconds: 5 }]);
    expect(segs.map((s) => [s.from, s.to])).toEqual([
      [0, 3],
      [3, 7],
      [7, 12],
    ]);
    expect(segs[2].start + segs[2].width).toBeCloseTo(1);
  });
});

describe("wordDiff", () => {
  it("marks removed and added words, keeping the rest", () => {
    const parts = wordDiff("They clash swords in the rain", "They spin and dance in the rain");
    expect(parts.filter((p) => p.op === "del").map((p) => p.text.trim())).toEqual(["clash swords"]);
    expect(parts.filter((p) => p.op === "add").map((p) => p.text.trim())).toEqual(["spin and dance"]);
    expect(parts.map((p) => (p.op === "del" ? "" : p.text)).join("")).toBe("They spin and dance in the rain");
  });
  it("is all-same for identical text and handles Tamil", () => {
    expect(wordDiff("வா இங்கே", "வா இங்கே")).toEqual([{ text: "வா இங்கே", op: "same" }]);
  });
});

describe("suggestions", () => {
  it("leads with a compliant direction for a blocked scene", () => {
    const map = { scenes: [{ order: 4, status: "blocked" }] } as unknown as RecutMap;
    expect(suggestions([clip4], map)[0]).toMatch(/non-violent/);
    expect(suggestions([], map)).toEqual([]);
  });
});

it("formats rough durations", () => {
  expect(aboutTime(42)).toBe("~40s");
  expect(aboutTime(200)).toBe("~3 min");
  expect(keyOf({ kind: "look", unit: null })).toBe("look");
});
