"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

function detect(): boolean {
  if (cached === null) {
    try {
      const c = document.createElement("canvas");
      cached = !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      cached = false;
    }
  }
  return cached;
}

const noop = () => () => {};

/** Whether the browser can render WebGL (static per page load; SSR assumes yes). */
export function useWebGLSupported(): boolean {
  return useSyncExternalStore(noop, detect, () => true);
}
