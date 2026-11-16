import { api } from "@/lib/api";
import { pickPosters, POSTERS, type Poster } from "@/lib/posters";
import { mulberry32 } from "@/lib/rand";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";

/** One shot of the film as it moves down the line: its beat text once the
 *  script exists, its real frame/clip once rendered, and a stand-in poster to
 *  show (treated, never raw) until then. */
export interface ShotModel {
  order: number;
  beat: string | null;
  speaker: string | null;
  frameUrl: string | null;
  clipUrl: string | null;
  poster: Poster;
}

const MAX_SHOTS = 30;

/** How many shots the film has, from the best signal available so far. */
export function shotCount(
  live: LiveAssets | null,
  job: JobStatusResponse | null,
  stages: StageRef[],
): number {
  const ig = stages.find((s) => s.name === "image_gen");
  // Frames can outnumber beats (a scene may hold several shots): take the most
  // specific count we have, else a sensible default for the runtime.
  const n =
    Math.max(live?.beats.length ?? 0, ig?.progress_total ?? 0, live?.frames.length ?? 0) ||
    (job?.duration === 60 ? 8 : 5);
  return Math.max(1, Math.min(n, MAX_SHOTS));
}

export function buildShots(live: LiveAssets | null, count: number, posters: Poster[]): ShotModel[] {
  const beats = new Map((live?.beats ?? []).map((b) => [b.order, b]));
  const frames = new Map((live?.frames ?? []).map((f) => [f.order, f.url]));
  const clips = new Map((live?.clips ?? []).map((c) => [c.order, c.url]));
  return Array.from({ length: count }, (_, i) => {
    const order = i + 1;
    const beat = beats.get(order);
    const frame = frames.get(order);
    const clip = clips.get(order);
    return {
      order,
      beat: beat?.text ?? null,
      speaker: beat?.speaker ?? null,
      frameUrl: frame ?? null,
      clipUrl: clip ?? null,
      poster: posters[i % Math.max(1, posters.length)],
    };
  });
}

/** Stand-in posters for a job: seeded by the job id alone, so the server and
 *  client render the same cards (no hydration mismatch) and a reload keeps them. */
export function standIns(jobId: string, count: number, pool: readonly Poster[] = POSTERS): Poster[] {
  if (pool.length === 0) return pickPosters(count); // imageless stubs
  let seed = 0;
  for (let i = 0; i < jobId.length; i++) seed = (Math.imul(seed, 31) + jobId.charCodeAt(i)) >>> 0;
  const rnd = mulberry32(seed);
  const deck = [...pool];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Array.from({ length: count }, (_, i) => deck[i % deck.length]);
}

/** The same payload with every asset URL made absolute (API base prefixed). The
 *  production line is app UI, so it stays English: a Tamil film's title, logline
 *  and beats show their English rendering when the server has one. */
export function resolveLive(live: LiveAssets | null): LiveAssets | null {
  if (!live) return null;
  const abs = (u: string | null) => (u ? api.asset(u) : null);
  return {
    ...live,
    title: live.title_en || live.title,
    logline: live.logline_en || live.logline,
    beats: live.beats.map((b) => (b.text_en ? { ...b, text: b.text_en } : b)),
    style_ref_url: abs(live.style_ref_url),
    narration_url: abs(live.narration_url),
    music_url: abs(live.music_url),
    cover_url: abs(live.cover_url),
    cast: live.cast.map((c) => ({ ...c, portrait_url: abs(c.portrait_url) })),
    frames: live.frames.map((f) => ({ ...f, url: api.asset(f.url) })),
    clips: live.clips.map((c) => ({ ...c, url: api.asset(c.url) })),
  };
}

/** Two-digit slate number: 1 -> "01". */
export const slate = (n: number) => String(n).padStart(2, "0");
