import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CutView, RecutScene, SceneDiff } from "@/lib/types";
import { DiffText, FrameWipe, SceneEditTimeline, ScoreWave, StoryArc, StoryboardFlip } from "./EditViews";
import { FilmTimeline } from "./FilmTimeline";

const scene = (order: number, seconds = 10): RecutScene => ({
  order,
  mode: "dialogue",
  beat_role: order === 2 ? "climax" : "setup",
  location: "ROOF",
  planned_seconds: seconds,
  seconds,
  description: "two rivals on a roof",
  narration: "",
  shots: [
    { size: "wide", action: "they square off", camera: "", seconds: 4, lines: [{ speaker: "A", text: "Not today.", delivery: "" }] },
    { size: "close", action: "a blade flashes", camera: "", seconds: 6, lines: [] },
  ],
  frame_url: "/storyboard/j/recut/media/frame_01.png?v=1",
  clip_url: null,
  voice_url: null,
  status: "blocked",
  issues: [],
  takes: [],
});

const diff: SceneDiff = {
  order: 1,
  description_before: "two rivals duel on a roof",
  description_after: "two rivals dance-off on a roof",
  redraw_frame: true,
  shots: [
    {
      index: 1,
      seconds: 6,
      size_before: "close",
      size_after: "close",
      action_before: "a blade flashes",
      action_after: "a spin lands on the beat",
      lines_before: [],
      lines_after: [],
    },
  ],
};

describe("edit timelines render", () => {
  it("diffs words", () => {
    const html = renderToStaticMarkup(<DiffText before="a blade flashes" after="a spin flashes" />);
    expect(html).toContain("<del");
    expect(html).toContain("<ins");
  });

  it("lays a scene's shots on its time axis with the changed shot marked", () => {
    const html = renderToStaticMarkup(<SceneEditTimeline diff={{ ...diff, shots: [{ ...diff.shots[0], index: 0 }, diff.shots[0]] }} scene={scene(1)} />);
    expect(html).toContain("SCENE 1");
    expect(html).toContain("changed");
    expect(html).toContain("0–6s");
  });

  it("renders the frame views, arc, score and film timeline", () => {
    expect(renderToStaticMarkup(<FrameWipe before="/a.png" after="/b.png" />)).toContain('role="slider"');
    expect(renderToStaticMarkup(<StoryboardFlip frame={null} text="new frame" redraw />)).toContain("NEW OPENING FRAME");
    expect(renderToStaticMarkup(<StoryArc scenes={[scene(1), scene(2)]} touched={new Set([2])} />)).toContain("<svg");
    expect(renderToStaticMarkup(<ScoreWave url={null} cues={[0, 10]} runtime={20} />)).toContain("Score waveform");
    const cuts: CutView[] = [
      { cut: 1, kind: "first", at: "", summary: "First cut", note: "", picked: [], items: [], cost_usd: 5, scene_seconds: {}, video_url: null, current: false },
      { cut: 2, kind: "recut", at: "", summary: "dance-off", note: "", picked: [], items: ["clip-2"], cost_usd: 1, scene_seconds: {}, video_url: null, current: true },
    ];
    const html = renderToStaticMarkup(<FilmTimeline scenes={[scene(1), scene(2, 12)]} cuts={cuts} touched={new Set([2])} planned />);
    expect(html).toContain("CUT 2");
    expect(html).toContain("PLANNED");
    expect(html).toContain("being redone");
  });
});
