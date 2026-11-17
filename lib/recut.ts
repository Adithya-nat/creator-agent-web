// Pure recut logic: what is picked, what rebuilds because of it, and the geometry and
// diffs the edit timelines draw. No React, so every rule is unit-tested here.

import type { RecutKind, RecutMap, RecutRef, RecutScene } from "@/lib/types";

export const keyOf = (r: { kind: string; unit: number | null }) => (r.unit == null ? r.kind : `${r.kind}-${r.unit}`);

const SCENE_KINDS = new Set<RecutKind>(["scene", "frame", "clip", "voice"]);

export const LABEL: Record<string, string> = {
  story: "Story",
  look: "Look",
  scene: "Script",
  frame: "Frame",
  clip: "Clip",
  voice: "Voice",
  score: "Score",
  release: "Release",
  captions: "Captions",
  edit: "Edit",
};

export const refLabel = (r: { kind: string; unit: number | null }) =>
  r.unit == null ? LABEL[r.kind] ?? r.kind : `${LABEL[r.kind] ?? r.kind} ${r.unit}`;

/** Click replaces the selection; Shift/Cmd-click adds or removes. */
export function toggle(sel: RecutRef[], ref: RecutRef, additive: boolean): RecutRef[] {
  const k = keyOf(ref);
  const has = sel.some((r) => keyOf(r) === k);
  if (!additive) return has && sel.length === 1 ? [] : [ref];
  return has ? sel.filter((r) => keyOf(r) !== k) : [...sel, ref];
}

/** Everything that rebuilds because of the picks (mirrors app/redo/targets.py closure). */
export function ripple(sel: RecutRef[], scenes: number[], hasClips: boolean): Set<string> {
  const out = new Set(sel.map(keyOf));
  const every = (kind: string) => scenes.forEach((n) => out.add(`${kind}-${n}`));
  for (const r of sel) {
    if (r.kind === "story") {
      ["look", "score", "release"].forEach((k) => out.add(k));
      ["scene", "frame", "clip", "voice", "captions"].forEach(every);
    } else if (r.kind === "look") {
      ["frame", "clip", "captions"].forEach(every);
      out.add("release");
    } else if (r.kind === "scene") {
      ["frame", "clip", "voice", "captions"].forEach((k) => out.add(`${k}-${r.unit}`));
    } else if (r.kind === "frame") {
      ["clip", "captions"].forEach((k) => out.add(`${k}-${r.unit}`));
      out.add("release");
    } else if (r.kind === "clip" || r.kind === "voice") {
      out.add(`captions-${r.unit}`);
    }
  }
  if ([...out].some((k) => k !== "release")) out.add("edit");
  if (!hasClips) for (const k of [...out]) if (k.startsWith("clip-")) out.delete(k);
  return out;
}

/** Scene numbers touched by a set of keys (for the film timeline blocks). */
export function touchedScenes(keys: Iterable<string>): Set<number> {
  const out = new Set<number>();
  for (const k of keys) {
    const m = /^(scene|frame|clip|voice)-(\d+)$/.exec(k);
    if (m) out.add(Number(m[2]));
  }
  return out;
}

export interface Block {
  order: number;
  start: number; // 0..1 of the film
  width: number; // 0..1
  seconds: number;
}

/** Scene blocks sized by real seconds (a past cut's timing when given). */
export function filmBlocks(scenes: Pick<RecutScene, "order" | "seconds">[], timing?: Record<string, number>): Block[] {
  const secs = scenes.map((s) => Math.max(0.5, timing?.[String(s.order)] ?? s.seconds ?? 0));
  const total = secs.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return scenes.map((s, i) => {
    const b = { order: s.order, start: at / total, width: secs[i] / total, seconds: secs[i] };
    at += secs[i];
    return b;
  });
}

export interface Segment {
  index: number;
  start: number;
  width: number;
  from: number; // seconds
  to: number;
}

/** A multi-shot clip's shots on its time axis. */
export function shotSegments(shots: { seconds: number }[]): Segment[] {
  const secs = shots.map((s) => Math.max(0.5, s.seconds || 0));
  const total = secs.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return secs.map((s, index) => {
    const seg = { index, start: at / total, width: s / total, from: at, to: at + s };
    at += s;
    return seg;
  });
}

export type DiffOp = "same" | "add" | "del";
export interface DiffPart {
  text: string;
  op: DiffOp;
}

/** Word-level diff (LCS). Whitespace is kept with the word before it. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(?<=\s)/).filter(Boolean);
  const b = after.split(/(?<=\s)/).filter(Boolean);
  const norm = (w: string) => w.trim().toLowerCase();
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (text: string, op: DiffOp) => {
    const last = out[out.length - 1];
    if (last && last.op === op) last.text += text;
    else out.push({ text, op });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) {
      push(b[j], "same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push(a[i++], "del");
    else push(b[j++], "add");
  }
  while (i < n) push(a[i++], "del");
  while (j < m) push(b[j++], "add");
  return out;
}

export const changed = (parts: DiffPart[]) => parts.some((p) => p.op !== "same");

/** One-tap notes under the director field, picked for what is selected. */
export function suggestions(sel: RecutRef[], map: RecutMap | null): string[] {
  if (!sel.length) return [];
  const scene = (n: number | null) => map?.scenes.find((s) => s.order === n);
  const out: string[] = [];
  const first = sel[0];
  const blocked = sel.some((r) => SCENE_KINDS.has(r.kind) && scene(r.unit)?.status === "blocked");
  if (blocked) out.push("Keep the story beat, make the action non-violent", "Turn the fight into a dance-off");
  if (sel.some((r) => scene(r.unit)?.status === "qc")) out.push("Make sure every line is spoken clearly");
  switch (first.kind) {
    case "clip":
      out.push("Same scene, a new take", "Slower, more dramatic camera", "Tighter close-ups on faces");
      break;
    case "frame":
      out.push("A different camera angle", "Fix the character's face to match their look", "Warmer light");
      break;
    case "scene":
      out.push("Make the dialogue funnier", "Raise the stakes", "Shorter, punchier lines");
      break;
    case "voice":
      out.push("Calmer, warmer read", "More urgency");
      break;
    case "look":
      out.push("Moody neon noir", "Soft pastel animation", "Grainy 16mm film");
      break;
    case "score":
      out.push("Lighter and playful", "Bigger, more epic build", "Minimal piano");
      break;
    case "story":
      out.push("Add a twist ending", "Make it a comedy", "Give the villain a reason");
      break;
    case "release":
      out.push("Punchier hook", "More hashtags for reach");
      break;
  }
  return [...new Set(out)].slice(0, 5);
}

/** "~3 min" style duration. */
export function aboutTime(seconds: number): string {
  if (seconds < 60) return `~${Math.max(10, Math.round(seconds / 10) * 10)}s`;
  return `~${Math.round(seconds / 60)} min`;
}

/** Which lanes a film has (narrated scenes get a voice lane; clips need the video stage). */
export function lanes(map: RecutMap): ("scene" | "frame" | "clip" | "voice")[] {
  const order = ["scene", "frame", "clip", "voice"] as const;
  return order.filter((k) => map.kinds.includes(k));
}

/** The take that a "compare" view should pair with the current item (latest first). */
export function latestTake(scene: RecutScene, kind: "frame" | "clip") {
  return [...scene.takes].filter((t) => t.kind === kind).sort((a, b) => b.cut - a.cut)[0] ?? null;
}
