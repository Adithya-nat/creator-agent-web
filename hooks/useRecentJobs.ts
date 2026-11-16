"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface RecentJob {
  id: string;
  prompt: string;
  createdAt: number; // epoch ms (client clock)
}

const KEY = "creator.recentJobs";
const OLD_KEY = "storyboard.recentJobs"; // pre-rebrand
const MAX = 12;
const TTL_MS = 24 * 60 * 60 * 1000; // mirror the backend's 24-hour retention (JOB_TTL_SECONDS)

function read(): RecentJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(OLD_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentJob[];
    const now = Date.now();
    return list.filter((j) => now - j.createdAt < TTL_MS);
  } catch {
    return [];
  }
}

function write(list: RecentJob[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage full / disabled — non-fatal
  }
}

// localStorage-backed store; listeners re-read on writes from this tab or others.
const listeners = new Set<() => void>();
let cache: { raw: string | null; jobs: RecentJob[] } = { raw: null, jobs: [] };
const EMPTY: RecentJob[] = [];

function snapshot(): RecentJob[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) cache = { raw, jobs: read() };
  return cache.jobs;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function update(fn: (prev: RecentJob[]) => RecentJob[]) {
  write(fn(read()));
  listeners.forEach((l) => l());
}

/**
 * Client-side "recent jobs" (no login = no server identity). Prunes entries
 * older than the backend's 24-hour TTL so we never link to an expired job.
 */
export function useRecentJobs() {
  const jobs = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  const add = useCallback((id: string, prompt: string) => {
    update((prev) =>
      [{ id, prompt, createdAt: Date.now() }, ...prev.filter((j) => j.id !== id)].slice(0, MAX),
    );
  }, []);

  const remove = useCallback((id: string) => {
    update((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return { jobs, add, remove };
}
