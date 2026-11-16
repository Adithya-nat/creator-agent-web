// TypeScript mirrors of the backend Pydantic schemas (app/schemas.py).
// Keep these in sync with the FastAPI contract.

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_warnings"
  | "failed"
  | "interrupted"
  | "pausing" // pause requested: in-flight paid units are finishing
  | "paused"; // parked: resume continues from the first unfinished unit

// "No runner is active": the live stream closes. A paused job is in here (nothing
// is running) but it is not finished; use isFinished / isParked to tell them apart.
export const TERMINAL_STATUSES: JobStatus[] = [
  "completed",
  "completed_with_warnings",
  "failed",
  "interrupted",
  "paused",
];

export const isTerminal = (s: JobStatus): boolean => TERMINAL_STATUSES.includes(s);
export const isParked = (s: JobStatus | null): boolean => s === "paused";
/** Terminal and not resumable from a pause: the film is done, failed or interrupted. */
export const isFinished = (s: JobStatus): boolean => isTerminal(s) && s !== "paused";
export const isSuccess = (s: JobStatus): boolean =>
  s === "completed" || s === "completed_with_warnings";

export type StageStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "degraded"
  | "skipped"
  | "interrupted"
  | "paused";

export interface StageRef {
  name: string;
  seq: number;
  status: StageStatus;
  message: string | null;
  progress_current: number | null;
  progress_total: number | null;
  tokens: number | null;
  cost_usd?: number | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface LogLine {
  id: number;
  stage: string | null;
  level: string;
  message: string;
  created_at: string;
}

export interface ArtifactRef {
  id: string;
  kind: string;
  url: string; // relative; prefix with API base via api.asset()
  status: string;
  order: number | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  prompt: string;
  duration: number;
  created_at: string;
  expires_at: string;
  error: string | null;
  warnings: string[];
  current_stage: string | null;
  total_tokens: number;
  prompt_tokens: number;
  output_tokens: number;
  cost_usd?: number;
  style?: StoryStyle;
  language?: Language;
  // Ordered pipeline stage names for THIS job (includes "motion" only when the
  // motion engine is enabled). Absent on older servers -> fall back to STAGE_ORDER.
  pipeline?: string[];
  stages: StageRef[];
  artifacts: ArtifactRef[];
  // Set when the film stopped for missing AI clips and can finish with stills.
  video_gap?: VideoGap | null;
  // Run controls (absent on servers without pause support).
  pause_requested?: boolean;
  breakpoints?: string[];
}

/** Per-unit state of a stage that spends per item (frames, scene clips). */
export interface UnitProgress {
  noun: string;
  total: number;
  done: number[]; // on disk: reused on resume, never billed again
  in_flight: number[]; // already submitted and paid; finishing
  pending: number[]; // not started; generated on resume
  unit_cost_usd: number;
}

export interface CheckpointStage {
  name: string;
  status: StageStatus;
  cost_usd: number;
  remaining_usd: number;
  units: UnitProgress | null;
  breakpoint: boolean;
}

/** GET /storyboard/{id}/checkpoint: where a run stands and what finishing costs. */
export interface Checkpoint {
  job_id: string;
  status: JobStatus;
  pause_requested: boolean;
  paused_stage: string | null;
  paused_message: string | null;
  resume_stage: string | null;
  resume_unit: number | null;
  breakpoints: string[];
  spent_usd: number;
  remaining_usd: number;
  estimate_basis: "history" | "units";
  stages: CheckpointStage[];
}

export interface VideoGap {
  ready: number;
  total: number;
  missing: number[];
  reason: "blocked" | "unavailable";
}

export interface JobCreatedResponse {
  job_id: string;
  status: JobStatus;
}

export interface JobListItem {
  job_id: string;
  status: JobStatus;
  prompt: string;
  duration: number;
  style: string;
  language: string;
  cost_usd: number;
  created_at: string;
  expires_at: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  allowed: boolean;
  auth_mode: "none" | "jwt";
  key_mode: "server" | "byok";
  retention_hours: number;
  media_token: string | null;
  media_token_expires_at: string | null;
}

export interface KeyCheck {
  ok: boolean;
  video_ok?: boolean;
  message: string;
  roles: Record<string, { ok: string[]; missing: string[] }>;
}

export interface LogsResponse {
  job_id: string;
  logs: LogLine[];
  next_after: number;
}

export interface SceneLine {
  speaker: string;
  text: string;
  delivery: string;
  text_en?: string | null; // English rendering of a Tamil line (UI only)
}

export type SceneVoice = "narrator" | "on_camera" | "off_screen" | "silent";

export interface SceneShot {
  size: string;
  action: string;
  lines: SceneLine[];
}

export interface BriefView {
  format: string;
  hook: string;
  logline: string;
  setting: string;
  era: "modern" | "period" | string;
  period: string;
  dialect: string;
}

export interface FilmReview {
  score: number;
  coherence: number;
  continuity: number;
  dialogue: number;
  hook: number;
  human_made: number;
  retelling: string;
  confusing_moments: string[];
}

export interface StoryboardScene {
  order: number;
  narration: string; // the on-screen caption actually used
  narration_en?: string | null;
  mode?: "narration" | "dialogue";
  lines?: SceneLine[];
  shots?: SceneShot[];
  location?: string;
  transcript?: string;
  voice?: SceneVoice;
  frame_url: string | null;
  // Per-scene motion clip (motion engine). null => show the still frame_url.
  // The UI plays this with frame_url as the poster/fallback.
  video_url: string | null;
  status: string;
  motion_kind?:
    | "generative"
    | "local_generative"
    | "composited"
    | "kenburns"
    | null;
  motion_renderer?: string | null;
  motion_model?: string | null;
  motion_reason?: string | null;
}

export interface MotionCoverage {
  total: number;
  animated: number;
  generative: number;
  local_generative: number;
  composited: number;
  kenburns: number;
  still: number;
  by_renderer: Record<string, number>;
  by_model: Record<string, number>;
}

export interface StoryboardContent {
  job_id: string;
  status: JobStatus;
  title: string;
  logline: string;
  title_en?: string | null; // English renderings for a Tamil film (the UI stays English)
  logline_en?: string | null;
  style: string;
  duration: number;
  video_url: string | null;
  style_ref_url: string | null;
  total_tokens: number;
  narrated: boolean;
  story_style?: StoryStyle;
  language?: Language;
  cover_url?: string | null;
  cost_usd?: number;
  cast?: CastMember[];
  motion_coverage?: MotionCoverage | null;
  brief?: BriefView | null;
  film_review?: FilmReview | null;
  scenes: StoryboardScene[];
}

export interface CastMember {
  name: string;
  look: string;
  voice_description: string;
  portrait_url: string | null;
}

export type StoryStyle = "narrated" | "dialogue" | "mixed";
export type Language = "en" | "ta";

export interface PlatformPost {
  caption: string;
  hashtags: string[];
}

export interface PublishKit {
  title: string;
  hook: string;
  tiktok: PlatformPost;
  reels: PlatformPost;
  shorts: PlatformPost;
  cover_order: number;
}

export interface BudgetStatus {
  month_spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  warn: boolean;
  over: boolean;
  mode: string;
  estimates: Record<StoryStyle, Record<"30" | "60", number>>;
  videos_left: Record<string, number>;
}

export interface RunRow {
  job_id: string;
  prompt: string;
  style: StoryStyle;
  language: Language;
  duration: number;
  status: string;
  cost_usd: number;
  cost_by_category: Record<string, number>;
  total_tokens: number;
  video_seconds: number;
  images: number;
  scenes: number;
  omni_scenes: number;
  fallback_scenes: number;
  judge_score: number | null;
  runtime_seconds: number;
  models: string[];
  started_at: string | null;
  finished_at: string | null;
}

export type UsageRange = "7d" | "30d" | "month" | "all";

export interface UsageSummary {
  range: UsageRange;
  runs: number;
  completed_runs: number;
  success_rate: number;
  total_cost_usd: number;
  avg_cost_per_run: number;
  avg_cost_per_second: number;
  avg_runtime_seconds: number;
  avg_judge_score: number | null;
  omni_share: number;
  by_category: Record<string, number>;
  by_model: Record<string, number>;
  by_provider: Record<string, number>;
  by_day: Array<{ date: string; total: number } & Record<string, number | string>>;
  avg_cost_by_style_duration: Record<string, number>;
  by_language: Record<string, number>;
}

export type Duration = 30 | 60;

// Friendly labels for the pipeline stages (backend names -> human copy).
export const STAGE_LABELS: Record<string, string> = {
  brief: "Planning the film",
  script_writer: "Writing the screenplay",
  dialogue_pass: "Polishing the dialogue",
  reflection: "Refining the story",
  designer: "Designing the look",
  image_gen: "Generating frames",
  narration: "Recording the narrator",
  motion: "Filming scenes with AI video",
  captions: "Syncing dialogue captions",
  music: "Composing the score",
  assembler: "Editing the film",
  film_review: "Reviewing the cut",
  publish_kit: "Writing post captions",
};

// Fallback order used only when a job has no `pipeline` (old server / pre-first
// poll). The live order comes from JobStatusResponse.pipeline via stageOrderOf().
export const STAGE_ORDER = [
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
