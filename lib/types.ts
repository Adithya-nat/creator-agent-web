// TypeScript mirrors of the backend Pydantic schemas (app/schemas.py).
// Keep these in sync with the FastAPI contract.

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_warnings"
  | "failed"
  | "interrupted";

export const TERMINAL_STATUSES: JobStatus[] = [
  "completed",
  "completed_with_warnings",
  "failed",
  "interrupted",
];

export const isTerminal = (s: JobStatus): boolean => TERMINAL_STATUSES.includes(s);
export const isSuccess = (s: JobStatus): boolean =>
  s === "completed" || s === "completed_with_warnings";

export type StageStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "degraded"
  | "interrupted";

export interface StageRef {
  name: string;
  seq: number;
  status: StageStatus;
  message: string | null;
  progress_current: number | null;
  progress_total: number | null;
  tokens: number | null;
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
  // Ordered pipeline stage names for THIS job (includes "motion" only when the
  // motion engine is enabled). Absent on older servers -> fall back to STAGE_ORDER.
  pipeline?: string[];
  stages: StageRef[];
  artifacts: ArtifactRef[];
}

export interface JobCreatedResponse {
  job_id: string;
  status: JobStatus;
}

export interface LogsResponse {
  job_id: string;
  logs: LogLine[];
  next_after: number;
}

export interface StoryboardScene {
  order: number;
  narration: string;
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
  style: string;
  duration: number;
  video_url: string | null;
  style_ref_url: string | null;
  total_tokens: number;
  narrated: boolean;
  motion_coverage?: MotionCoverage | null;
  scenes: StoryboardScene[];
}

export type Duration = 30 | 60;

// Friendly labels for the pipeline stages (backend names -> human copy).
export const STAGE_LABELS: Record<string, string> = {
  script_writer: "Writing the script",
  reflection: "Refining the story",
  designer: "Designing the look",
  image_gen: "Generating frames",
  motion: "Animating the frames",
  assembler: "Assembling the film",
};

// Fallback order used only when a job has no `pipeline` (old server / pre-first
// poll). The live order comes from JobStatusResponse.pipeline via stageOrderOf().
export const STAGE_ORDER = [
  "script_writer",
  "reflection",
  "designer",
  "image_gen",
  "assembler",
];
