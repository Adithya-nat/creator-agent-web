// Short-lived API tokens (15 min JWT from Better Auth) and the media token for <video>/SSE links.
import { AUTH_ENABLED } from "./authConfig";

type Cached = { token: string; exp: number };
let cached: Cached | null = null;
let inflight: Promise<string | null> | null = null;
let mediaToken: string | null = null;
let generation = 0; // bumped on sign-out so a late token response is dropped

const REFRESH_EARLY_MS = 60_000;

function expiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function fetchToken(): Promise<string | null> {
  const gen = generation;
  const { authClient } = await import("./authClient");
  const { data } = await authClient.token();
  const token = data?.token ?? null;
  if (gen !== generation) return null;
  cached = token ? { token, exp: expiry(token) } : null;
  return token;
}

/** Bearer token for the API, refreshed a minute before it expires. null when signed out. */
export async function getApiToken(now = Date.now()): Promise<string | null> {
  if (!AUTH_ENABLED) return null;
  if (cached && cached.exp - REFRESH_EARLY_MS > now) return cached.token;
  if (!inflight) {
    const p = fetchToken().finally(() => {
      if (inflight === p) inflight = null;
    });
    inflight = p;
  }
  return inflight;
}

export function clearSession() {
  generation += 1;
  inflight = null;
  cached = null;
  mediaToken = null;
}

export function setMediaToken(token: string | null) {
  mediaToken = token;
}

export function getMediaToken(): string | null {
  return mediaToken;
}

/** Appends ?t=<media token> so <video>, <img> and EventSource can authenticate. */
export function withMediaToken(url: string): string {
  if (!mediaToken) return url;
  return `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(mediaToken)}`;
}

// test hook
export function _setCachedToken(token: string | null, exp = 0) {
  cached = token ? { token, exp } : null;
}
