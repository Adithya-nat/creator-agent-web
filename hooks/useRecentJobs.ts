"use client";

import { useCallback, useEffect, useState } from "react";

export interface RecentJob {
  id: string;
  prompt: string;
  createdAt: number; // epoch ms (client clock)
}

const KEY = "storyboard.recentJobs";
const MAX = 12;
const TTL_MS = 60 * 60 * 1000; // mirror the backend's 1-hour retention

function read(): RecentJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
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

/**
 * Client-side "recent jobs" (no login = no server identity). Prunes entries
 * older than the backend's 1-hour TTL so we never link to an expired job.
 */
export function useRecentJobs() {
  const [jobs, setJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    setJobs(read());
  }, []);

  const add = useCallback((id: string, prompt: string) => {
    setJobs((prev) => {
      const next = [
        { id, prompt, createdAt: Date.now() },
        ...prev.filter((j) => j.id !== id),
      ].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { jobs, add, remove };
}
