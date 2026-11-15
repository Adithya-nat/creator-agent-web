"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ProductionLine } from "@/components/production/ProductionLine";
import { stationFor } from "@/components/production/stations";
import { POSTERS } from "@/lib/posters";
import type { LiveAssets } from "@/lib/live";
import type { JobStatusResponse, StageRef } from "@/lib/types";

// Mirrors the coherence branch's pipeline (brief, dialogue_pass, film_review) so the preview
// exercises stations this build learned about as well as the classic ones.
const PIPELINE = [
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
];

const BEATS = [
  "The lighthouse lamp turns over an empty sea, as it has for forty years.",
  "Maya finds a green bottle wedged in the rocks, a letter curled inside.",
  "“Who still writes letters?” she asks the gulls.",
  "The letter is addressed to her, in her late father’s hand.",
  "She climbs the tower and reads it by the lamp’s slow sweep.",
  "At dawn she lights the lamp one last time, and lets it go dark.",
];

function mockJob(stage: string, frame: number, total: number) {
  const idx = PIPELINE.indexOf(stage);
  const stages: StageRef[] = PIPELINE.map((name, i) => ({
    name,
    seq: i + 1,
    status: i < idx ? "succeeded" : i === idx ? "running" : "pending",
    message: null,
    progress_current: name === "image_gen" ? (i < idx ? total : frame) : name === "motion" && i === idx ? 2 : null,
    progress_total: name === "image_gen" || name === "motion" ? total : null,
    tokens: null,
    started_at: null,
    ended_at: null,
  }));
  const job = {
    job_id: "preview-job",
    status: "running",
    prompt: "A lighthouse keeper finds a message in a bottle from someone she lost.",
    duration: 30,
    created_at: new Date(Date.now() - 83_000).toISOString(),
    expires_at: "",
    error: null,
    warnings: [],
    current_stage: stage,
    total_tokens: 0,
    prompt_tokens: 0,
    output_tokens: 0,
    pipeline: PIPELINE,
    stages,
    artifacts: [],
  } as JobStatusResponse;
  return { stages, job, idx };
}

/** What /live would return at this point in the run (poster images stand in
 *  for real generated frames, since the preview has no backend). */
function mockLive(idx: number, frame: number, total: number, origin: string): LiveAssets {
  const past = (name: string) => idx > PIPELINE.indexOf(name);
  const atOrPast = (name: string) => idx >= PIPELINE.indexOf(name);
  const img = (i: number) => `${origin}${POSTERS[(i * 7 + 3) % POSTERS.length]?.src ?? ""}`;
  const imageGenIdx = PIPELINE.indexOf("image_gen");
  const framesDone = idx > imageGenIdx ? total : idx === imageGenIdx ? frame : 0;
  return {
    job_id: "preview-job",
    version: `${idx}:${frame}`,
    title: past("script_writer") ? "The Last Light" : null,
    logline: past("brief") ? "A keeper’s last night at the lamp brings a letter she never expected." : null,
    beats: past("script_writer")
      ? BEATS.slice(0, total).map((text, i) => ({ order: i + 1, text, speaker: i === 2 ? "MAYA" : null }))
      : [],
    scores: atOrPast("reflection") ? { hook: 82, structure: 88, continuity: 91, payoff: 79 } : {},
    score_overall: atOrPast("reflection") ? 85 : null,
    style_ref_url: atOrPast("designer") ? img(40) : null,
    cast: past("designer") || atOrPast("designer") ? [{ name: "Maya", portrait_url: img(11) }, { name: "Ravi", portrait_url: img(12) }] : [],
    frames: Array.from({ length: framesDone }, (_, i) => ({ order: i + 1, url: img(i), status: "ok" })),
    clips: [],
    narration_url: null,
    music_url: null,
    cover_url: atOrPast("publish_kit") ? img(0) : null,
    caption: atOrPast("publish_kit")
      ? "She kept the light for forty years. Tonight it kept her. #shortfilm #lighthouse"
      : null,
  };
}

const noop = () => () => {};

export function StagePreview() {
  const q = useSearchParams();
  const auto = q.get("auto") === "1";
  const every = Number(q.get("every") ?? 4500);
  const withLive = q.get("live") !== "0";
  const total = Number(q.get("total") ?? 6);
  const [autoIdx, setAutoIdx] = useState(0);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setAutoIdx((i) => (i + 1) % PIPELINE.length), every);
    return () => clearInterval(id);
  }, [auto, every]);

  const stage = auto ? PIPELINE[autoIdx] : (q.get("stage") ?? "script_writer");
  const frame = Number(q.get("frame") ?? 3);
  const { stages, job, idx } = useMemo(() => mockJob(stage, frame, total), [stage, frame, total]);
  const live = useMemo(
    () => (withLive && origin ? mockLive(idx, frame, total, origin) : null),
    [withLive, origin, idx, frame, total],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 pb-16 pt-12">
      <nav className="mb-6 flex flex-wrap gap-2 text-xs">
        {PIPELINE.map((s) => (
          <a
            key={s}
            href={`?stage=${s}${withLive ? "" : "&live=0"}`}
            className={`rounded-full px-3 py-1 ${s === stage ? "bg-accent text-midnight" : "bg-white/5 text-muted"}`}
          >
            {stationFor(s).dept}
          </a>
        ))}
      </nav>
      <div data-testid="stage">
        <ProductionLine jobId="preview-job" stages={stages} currentStage={stage} status="running" job={job} live={live} />
      </div>
    </main>
  );
}
