// Pure run-control logic: what the pause/resume UI shows for a job right now.
// Kept free of React so the rules (where a resume picks up, which stages can take
// a breakpoint, what is kept vs still to pay) are unit-tested in one place.

import type { Checkpoint, JobStatus, StageRef, UnitProgress } from "@/lib/types";

export type ControlPhase = "idle" | "running" | "paused" | "finished";

export function controlPhase(status: JobStatus | null): ControlPhase {
  switch (status) {
    case null:
    case "queued":
      return "idle";
    case "running":
      return "running";
    case "pausing": // the server parks it within moments; to the user it's paused already
    case "paused":
      return "paused";
    default:
      return "finished";
  }
}

/** One unit of a per-unit stage, in the words a creator uses. */
const UNIT_WORD: Record<string, [one: string, many: string]> = {
  image_gen: ["frame", "frames"],
  motion: ["scene", "scenes"],
};

export function unitWord(stage: string | null, n = 1): string {
  const w = (stage && UNIT_WORD[stage]) || ["step", "steps"];
  return n === 1 ? w[0] : w[1];
}

/** Short station names, matching the production line rail. */
const SHORT: Record<string, string> = {
  brief: "Brief",
  script_writer: "Script",
  dialogue_pass: "Dialogue",
  reflection: "Notes",
  designer: "Look",
  image_gen: "Frames",
  narration: "Voice",
  motion: "Motion",
  captions: "Captions",
  music: "Score",
  assembler: "Edit",
  film_review: "Screening",
  publish_kit: "Release",
};

export const stageShort = (name: string): string =>
  SHORT[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface ResumeTarget {
  stage: string | null;
  unit: number | null;
  /** Button copy: "Resume from scene 3", "Resume at Frames", "Resume". */
  label: string;
  /** Sentence for the panel: "Picks up at scene 3 of 6. Scenes 1 to 2 are kept." */
  detail: string;
}

export function resumeTarget(cp: Checkpoint | null): ResumeTarget {
  if (!cp?.resume_stage) return { stage: null, unit: null, label: "Resume", detail: "" };
  const stage = cp.resume_stage;
  const units = cp.stages.find((s) => s.name === stage)?.units ?? null;
  if (units && cp.resume_unit != null && units.total > 0) {
    const kept = units.done.length;
    return {
      stage,
      unit: cp.resume_unit,
      label: `Resume from ${unitWord(stage)} ${cp.resume_unit}`,
      detail:
        `Picks up at ${unitWord(stage)} ${cp.resume_unit} of ${units.total}. ` +
        (kept > 0
          ? `${kept} finished ${unitWord(stage, kept)} ${kept === 1 ? "is" : "are"} kept, not made again.`
          : "Nothing in this step has been paid for yet."),
    };
  }
  return {
    stage,
    unit: null,
    label: `Resume at ${stageShort(stage)}`,
    detail: `Picks up at ${stageShort(stage)}. Everything before it is kept.`,
  };
}

export type TileState = "done" | "in_flight" | "pending";

export interface UnitTile {
  order: number;
  state: TileState;
  /** The first unit a resume will generate: the playhead sits here. */
  resumesHere: boolean;
}

/** Tiles for a per-unit stage, in order, with the resume playhead marked. */
export function unitTiles(units: UnitProgress, resumeUnit: number | null): UnitTile[] {
  const done = new Set(units.done);
  const flying = new Set(units.in_flight);
  const all = Array.from(new Set([...units.done, ...units.in_flight, ...units.pending])).sort((a, b) => a - b);
  // Older/partial payloads: fall back to 1..total.
  const orders = all.length ? all : Array.from({ length: units.total }, (_, i) => i + 1);
  return orders.map((order) => ({
    order,
    state: done.has(order) ? "done" : flying.has(order) ? "in_flight" : "pending",
    resumesHere: order === resumeUnit,
  }));
}

/** Paid units submitted before the pause and still landing in the background. */
export function landingCount(cp: Checkpoint | null): number {
  return cp?.stages.reduce((n, s) => n + (s.units?.in_flight.length ?? 0), 0) ?? 0;
}

/** Once paused: paid work still landing (it's kept), in plain words. Null when none. */
export function landingNote(cp: Checkpoint | null): string | null {
  const st = cp?.stages.find((s) => s.units?.in_flight.length);
  const n = st?.units?.in_flight.length ?? 0;
  if (!st || !n) return null;
  return `${n} ${unitWord(st.name, n)} already paid for ${n === 1 ? "is" : "are"} still landing and will be kept`;
}

/** Stages that can still take a breakpoint: not started yet (or the paused one). */
export function breakableStages(order: string[], stages: StageRef[]): string[] {
  const started = new Map(stages.map((s) => [s.name, s.status]));
  return order.filter((name) => {
    const st = started.get(name);
    return st == null || st === "pending";
  });
}

export function toggleStage(list: string[], name: string, order: string[]): string[] {
  const next = list.includes(name) ? list.filter((s) => s !== name) : [...list, name];
  return next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export interface CostSplit {
  kept: number;
  toFinish: number;
  /** 0..1 share of the whole film's cost already spent (and kept). */
  keptShare: number;
}

export function costSplit(cp: Checkpoint | null): CostSplit {
  const kept = Math.max(0, cp?.spent_usd ?? 0);
  const toFinish = Math.max(0, cp?.remaining_usd ?? 0);
  const total = kept + toFinish;
  return { kept, toFinish, keptShare: total > 0 ? kept / total : 0 };
}

// --------------------------------------------------------------------------- //
// Breakpoint sync: optimistic local edits, saved to the server without races.
// --------------------------------------------------------------------------- //
export interface BreakpointView {
  local: string[];
  /** Set when a save failed (the list was rolled back to what the server has). */
  error?: unknown;
}

/** Keeps the user's checkpoint picks in step with the server:
 *  - edits apply instantly and save after a short debounce, one request at a time;
 *  - a save's response only lands if no newer edit happened meanwhile (revisions);
 *  - a failed save rolls back to what the server last acknowledged and reports it;
 *  - a server list is adopted only when nothing is unsaved AND it was read after the
 *    last acknowledged save, so a stale checkpoint read can't undo a fresh edit. */
export class BreakpointSync {
  local: string[];
  private saved: string[];
  private rev = 0;
  private ackedRev = 0;
  private ackedAt = 0;
  private inFlight = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    initial: string[],
    private save: (stages: string[]) => Promise<string[]>,
    private notify: (v: BreakpointView) => void,
    private delayMs = 450,
    private now: () => number = Date.now,
  ) {
    this.local = initial;
    this.saved = initial;
  }

  get dirty(): boolean {
    return this.inFlight || this.rev !== this.ackedRev;
  }

  edit(stages: string[]): void {
    this.local = stages;
    this.rev += 1;
    this.notify({ local: stages });
    this.schedule(this.delayMs);
  }

  /** A server snapshot of the list, read at ``observedAt`` (ms; 0 = unknown time). */
  observe(server: string[], observedAt: number): void {
    if (this.dirty) return;
    if (this.ackedAt && observedAt <= this.ackedAt) return; // predates our last save
    this.saved = server;
    if (!sameList(server, this.local)) {
      this.local = server;
      this.notify({ local: server });
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  private async flush(): Promise<void> {
    if (this.inFlight) return; // the running save re-schedules when it sees a newer rev
    this.inFlight = true;
    const rev = this.rev;
    const stages = this.local;
    try {
      const ok = await this.save(stages);
      this.saved = ok;
      this.ackedAt = this.now();
      if (rev === this.rev) {
        this.ackedRev = rev;
        this.local = ok;
        this.notify({ local: ok });
      }
    } catch (error) {
      if (rev === this.rev) {
        this.ackedRev = rev;
        this.local = this.saved;
        this.notify({ local: this.saved, error });
      } else {
        this.notify({ local: this.local, error });
      }
    } finally {
      this.inFlight = false;
      if (rev !== this.rev) this.schedule(0); // newer edits arrived mid-save: save them now
    }
  }
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
