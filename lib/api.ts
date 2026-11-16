// Typed client over the storyboard_agent FastAPI backend.

import type {
  BudgetStatus,
  JobCreatedResponse,
  Language,
  PublishKit,
  RunRow,
  StoryStyle,
  UsageRange,
  UsageSummary,
  JobStatusResponse,
  LogsResponse,
  StoryboardContent,
} from "./types";
import type { LiveAssets } from "./live";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let detail: string = res.statusText;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, detail);
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
    req<JobCreatedResponse>("/storyboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        duration,
        style,
        language,
        turnstile_token: turnstileToken ?? null,
      }),
    }),

  getPublishKit: (id: string) => req<PublishKit>(`/storyboard/${id}/publish`),
  getBudget: () => req<BudgetStatus>("/budget"),
  getUsageSummary: (range: UsageRange) => req<UsageSummary>(`/usage/summary?range=${range}`),
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
    fetch(`${API_BASE}/storyboard/${id}/resume`, {
      method: "POST",
      ...(opts?.allowStills
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ allow_stills: true }) }
        : {}),
    }),

  videoUrl: (id: string) => `${API_BASE}/storyboard/${id}/video`,
  eventsUrl: (id: string) => `${API_BASE}/storyboard/${id}/events`,

  // Resolve a relative artifact URL (e.g. /storyboard/x/artifacts/y) to absolute.
  asset: (relativeUrl: string) =>
    relativeUrl.startsWith("http") ? relativeUrl : `${API_BASE}${relativeUrl}`,
};
