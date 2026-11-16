"use client";

import { useSyncExternalStore } from "react";
import { getGeminiKey, subscribeGeminiKey } from "@/lib/geminiKey";

export function useGeminiKey(): string | null {
  return useSyncExternalStore(subscribeGeminiKey, getGeminiKey, () => null);
}
