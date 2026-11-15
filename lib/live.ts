// Live assets: what a running job has produced so far (GET /storyboard/{id}/live).
// Kept apart from lib/types.ts so the two evolve independently.

export interface LiveBeat {
  order: number;
  text: string;
  speaker: string | null;
}

export interface LiveMedia {
  order: number;
  url: string;
  status: string;
}

export interface LiveAssets {
  job_id: string;
  version: string;
  title: string | null;
  logline: string | null;
  beats: LiveBeat[];
  scores: Record<string, number>;
  score_overall: number | null;
  style_ref_url: string | null;
  cast: { name: string; portrait_url: string | null }[];
  frames: LiveMedia[];
  clips: LiveMedia[];
  narration_url: string | null;
  music_url: string | null;
  cover_url: string | null;
  caption: string | null;
  /** Creative brief / test-screening review: absent on pipelines without
   *  those stages (and on servers that predate them). */
  brief?: { format: string; hook: string; logline: string } | null;
  review?: { score: number | null; retelling: string } | null;
}
