import {
  Aperture,
  Captions,
  Clapperboard,
  Highlighter,
  Lightbulb,
  type LucideIcon,
  MessagesSquare,
  Mic,
  Music,
  NotebookPen,
  Palette,
  Scissors,
  Send,
  Film,
  Popcorn,
} from "lucide-react";
import type { LiveAssets } from "@/lib/live";
import { STAGE_LABELS, type StageRef } from "@/lib/types";

/** Which station view renders a stage. Unknown stages fall back to "generic". */
export type StationView =
  | "development"
  | "writers"
  | "tableread"
  | "notes"
  | "art"
  | "camera"
  | "voice"
  | "vfx"
  | "subtitles"
  | "score"
  | "edit"
  | "screening"
  | "release"
  | "generic";

export interface ActionContext {
  live: LiveAssets | null;
  stage: StageRef | undefined;
  frames: { current: number; total: number };
}

export interface StationDef {
  view: StationView;
  /** Department name shown large in the header. */
  dept: string;
  /** Short track label. */
  short: string;
  icon: LucideIcon;
  /** The live action line under the department name. */
  action: (c: ActionContext) => string;
  /** Stand-in treatment before real frames exist (the look is locked at art). */
  look: "paper" | "sketch" | "graded";
}

const progress = (s: StageRef | undefined) =>
  s?.progress_total ? { n: s.progress_current ?? 0, of: s.progress_total } : null;

const quoted = (t: string | null | undefined) => (t ? `“${t}”` : null);

export const STATIONS: Record<string, StationDef> = {
  brief: {
    view: "development",
    dept: "Development",
    short: "Brief",
    icon: Lightbulb,
    look: "paper",
    action: () => "Shaping the idea into a brief",
  },
  script_writer: {
    view: "writers",
    dept: "Writers’ Room",
    short: "Script",
    icon: NotebookPen,
    look: "paper",
    action: ({ live }) =>
      live?.beats.length
        ? `${live.beats.length} beats on the board${live.title ? ` for ${quoted(live.title)}` : ""}`
        : "Breaking the story into beats",
  },
  dialogue_pass: {
    view: "tableread",
    dept: "Table Read",
    short: "Dialogue",
    icon: MessagesSquare,
    look: "paper",
    action: () => "Reading every line aloud and tightening it",
  },
  reflection: {
    view: "notes",
    dept: "Story Notes",
    short: "Notes",
    icon: Highlighter,
    look: "paper",
    action: ({ live }) =>
      live?.score_overall != null
        ? `Scored ${live.score_overall}/100, tightening the weak beats`
        : "Reviewing every beat",
  },
  designer: {
    view: "art",
    dept: "Art Department",
    short: "Look",
    icon: Palette,
    look: "sketch",
    action: ({ live }) =>
      live?.cast.length
        ? `Casting ${live.cast.map((c) => c.name).slice(0, 3).join(", ")}${live.cast.length > 3 ? "…" : ""}`
        : "Locking the look and casting the film",
  },
  image_gen: {
    view: "camera",
    dept: "Camera & Lab",
    short: "Frames",
    icon: Aperture,
    look: "graded",
    action: ({ frames }) =>
      frames.current > 0
        ? `Developed ${frames.current} of ${frames.total} frames`
        : `Lighting ${frames.total} frames`,
  },
  narration: {
    view: "voice",
    dept: "Voice Booth",
    short: "Voice",
    icon: Mic,
    look: "graded",
    action: () => "Recording the narrator",
  },
  motion: {
    view: "vfx",
    dept: "Motion Unit",
    short: "Motion",
    icon: Clapperboard,
    look: "graded",
    action: ({ stage }) => {
      const p = progress(stage);
      return p ? `Filming scene ${Math.min(p.n + 1, p.of)} of ${p.of}` : "Filming the scenes";
    },
  },
  captions: {
    view: "subtitles",
    dept: "Subtitles",
    short: "Captions",
    icon: Captions,
    look: "graded",
    action: () => "Syncing captions to every spoken line",
  },
  music: {
    view: "score",
    dept: "Scoring Stage",
    short: "Score",
    icon: Music,
    look: "graded",
    action: () => "Composing the score",
  },
  assembler: {
    view: "edit",
    dept: "Edit Bay",
    short: "Edit",
    icon: Scissors,
    look: "graded",
    action: () => "Cutting picture and sound together",
  },
  film_review: {
    view: "screening",
    dept: "Screening Room",
    short: "Screening",
    icon: Popcorn,
    look: "graded",
    action: () => "A fresh viewer is watching the cut",
  },
  publish_kit: {
    view: "release",
    dept: "Release",
    short: "Release",
    icon: Send,
    look: "graded",
    action: ({ live }) => (live?.title ? `Preparing ${quoted(live.title)} for release` : "Writing the post captions"),
  },
};

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** The station for any stage name, including ones this build doesn't know yet. */
export function stationFor(name: string): StationDef {
  return (
    STATIONS[name] ?? {
      view: "generic",
      dept: titleCase(name),
      short: titleCase(name).split(" ")[0],
      icon: Film,
      look: "graded",
      action: () => STAGE_LABELS[name] ?? `${titleCase(name)} in progress`,
    }
  );
}
