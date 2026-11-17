// Typed client over the Creator Agent API (FastAPI).

import type {
  BudgetStatus,
  JobListItem,
  KeyCheck,
  Me,
  Checkpoint,
  JobCreatedResponse,
  Language,
  PublishKit,
  RunRow,
  StoryStyle,
  UsageRange,
  UsageScope,
  UsageSummary,
  JobStatusResponse,
  LogsResponse,
  StoryboardContent,
} from "./types";
import type { LibraryDetails, LibraryDraft, LibraryEntry, PosterLook } from "./types";
import type { RecutMap, RecutPlan, RecutRef, RecutStarted } from "./types";
import type { LiveAssets } from "./live";
import { getGeminiKey } from "./geminiKey";
import { getApiToken, withMediaToken } from "./session";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Adds the sign-in token, and the tester's Gemini key when ``withKey`` (create/resume/check). */
async function authed(init?: RequestInit, withKey = false): Promise<RequestInit> {
  const headers = new Headers(init?.headers);
  const token = await getApiToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const key = withKey ? getGeminiKey() : null;
  if (key) headers.set("x-gemini-key", key);
  return { ...init, headers };
}

async function send(path: string, init?: RequestInit, withKey = false): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, await authed(init, withKey));
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }
}

async function req<T>(path: string, init?: RequestInit, withKey = false): Promise<T> {
  const res = await send(path, init, withKey);
  if (!res.ok) {
    let detail: string = res.statusText;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") detail = body.detail;
      else if (body?.detail && typeof body.detail.message === "string") {
        detail = body.detail.message;
        code = body.detail.code;
      }
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, detail, code);
  }
  return (await res.json()) as T;
}

export const api = {
  createStoryboard: (
    prompt: string,
    duration: 30 | 60,
    turnstileToken?: string | null,
    style?: StoryStyle,
    language?: Language,
  ) =>
    req<JobCreatedResponse>(
      "/storyboard",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          duration,
          style,
          language,
          turnstile_token: turnstileToken ?? null,
        }),
      },
      true,
    ),

  me: () => req<Me>("/me"),
  checkKey: (key: string) =>
    req<KeyCheck>("/keys/check", { method: "POST", headers: { "x-gemini-key": key } }),
  listJobs: () => req<JobListItem[]>("/storyboard"),

  getPublishKit: (id: string) => req<PublishKit>(`/storyboard/${id}/publish`),
  getBudget: () => req<BudgetStatus>("/budget"),
  getUsageSummary: (range: UsageRange, scope: UsageScope = "me") =>
    req<UsageSummary>(`/usage/summary?range=${range}&scope=${scope}`),
  getUsageRuns: (limit = 50) => req<RunRow[]>(`/usage/runs?limit=${limit}`),

  getJob: (id: string) => req<JobStatusResponse>(`/storyboard/${id}`),

  getLogs: (
    id: string,
    opts?: { after?: number; stage?: string; limit?: number },
  ) => {
    const p = new URLSearchParams();
    if (opts?.after != null) p.set("after", String(opts.after));
    if (opts?.stage) p.set("stage", opts.stage);
    if (opts?.limit != null) p.set("limit", String(opts.limit));
    const qs = p.toString();
    return req<LogsResponse>(`/storyboard/${id}/logs${qs ? `?${qs}` : ""}`);
  },

  /** Assets produced so far by a running (or finished) job. 404 on servers
   *  that predate live assets. */
  getLive: (id: string) => req<LiveAssets>(`/storyboard/${id}/live`),

  getStoryboard: (id: string) =>
    req<StoryboardContent>(`/storyboard/${id}/storyboard`),

  // Returns the raw Response so callers can branch on 202 / 409 / 404 / 410.
  resumeJob: (id: string, opts?: { allowStills?: boolean }) =>
    send(
      `/storyboard/${id}/resume`,
      {
        method: "POST",
        ...(opts?.allowStills
          ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ allow_stills: true }) }
          : {}),
      },
      true,
    ),

  videoUrl: (id: string) => withMediaToken(`${API_BASE}/storyboard/${id}/video`),
  eventsUrl: (id: string) => withMediaToken(`${API_BASE}/storyboard/${id}/events`),

  // Resolve a relative artifact URL (e.g. /storyboard/x/artifacts/y) to absolute, signed for media.
  asset: (relativeUrl: string) =>
    relativeUrl.startsWith("http") ? relativeUrl : withMediaToken(`${API_BASE}${relativeUrl}`),

  // --- Run controls -------------------------------------------------------- //
  /** Stop starting paid work; in-flight units finish, then the job parks. */
  pauseJob: (id: string) =>
    req<{ job_id: string; status: string }>(`/storyboard/${id}/pause`, { method: "POST" }),

  /** Replace the stages the run pauses BEFORE. */
  setBreakpoints: (id: string, stages: string[]) =>
    req<{ job_id: string; breakpoints: string[] }>(`/storyboard/${id}/breakpoints`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stages }),
    }),

  /** Per-unit progress + the cost to finish. 404 on servers without run controls. */
  getCheckpoint: (id: string) => req<Checkpoint>(`/storyboard/${id}/checkpoint`),
};

// --- Film library: publish a finished film (with a generated poster) to the homepage --- //
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const library = {
  /** Form defaults for a finished film + its library entry. 404 on servers without the library. */
  draft: (jobId: string) => req<LibraryDraft>(`/library/draft/${jobId}`),
  get: (id: string) => req<LibraryEntry>(`/library/${id}`),
  /** Copies the film into the library and starts its poster (an image call on the creator's key). */
  create: (jobId: string, details: LibraryDetails, look: PosterLook, frame: number) =>
    req<LibraryEntry>("/library", json("POST", { job_id: jobId, ...details, look, frame }), true),
  edit: (id: string, patch: Partial<LibraryDetails>) => req<LibraryEntry>(`/library/${id}`, json("PATCH", patch)),
  poster: (id: string, look: PosterLook, frame: number, tagline?: string | null) =>
    req<LibraryEntry>(
      `/library/${id}/poster`,
      json("POST", tagline === undefined ? { look, frame } : { look, frame, tagline }),
      true,
    ),
  publish: (id: string) => req<LibraryEntry>(`/library/${id}/publish`, json("POST")),
  unpublish: (id: string) => req<LibraryEntry>(`/library/${id}/unpublish`, json("POST")),
  remove: async (id: string) => {
    const res = await send(`/library/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new ApiError(res.status, "Couldn't remove the film from the library.");
  },
  /** A library file the creator owns (drafts included), signed for <img>/<video>. */
  media: (relativeUrl: string) => withMediaToken(`${API_BASE}${relativeUrl}`),
};

// --- Recut: redo picked parts of a film (frames, clips, scenes, look, score, story) --- //
export const recut = {
  /** Everything that can be redone, with takes and cuts. 404 on servers without recut. */
  map: (jobId: string) => req<RecutMap>(`/storyboard/${jobId}/recut`),
  /** The director's edits + what rebuilds + cost. Spends only a text call, and only with a note. */
  plan: (jobId: string, targets: RecutRef[], note: string) =>
    req<RecutPlan>(`/storyboard/${jobId}/recut/plan`, json("POST", { targets, note }), true),
  start: (
    jobId: string,
    body: { plan_id?: string | null; targets?: RecutRef[]; accept_extra?: RecutRef[]; review_frames?: boolean },
  ) => req<RecutStarted>(`/storyboard/${jobId}/recut`, json("POST", body), true),
  restore: (jobId: string, takeId: string) =>
    req<RecutStarted>(`/storyboard/${jobId}/takes/${encodeURIComponent(takeId)}/restore`, json("POST"), true),
  media: (relativeUrl: string) => withMediaToken(`${API_BASE}${relativeUrl}`),
};
