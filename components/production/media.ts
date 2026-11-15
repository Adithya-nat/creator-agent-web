"use client";

import { useEffect, useState } from "react";
import { mulberry32 } from "@/lib/rand";

// --------------------------------------------------------------------------- //
// Waveform peaks: decoded from the real audio when it exists, else a seeded,
// speech-like envelope so the track never looks empty or random per render.
// --------------------------------------------------------------------------- //

const peakCache = new Map<string, Promise<number[]>>();

export function syntheticPeaks(seed: number, bars: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  let phrase = 0;
  for (let i = 0; i < bars; i++) {
    if (phrase <= 0) phrase = 6 + Math.floor(rnd() * 10); // a "phrase" of syllables
    const gap = phrase === 1 && rnd() < 0.5; // breath between phrases
    phrase -= 1;
    out.push(gap ? 0.06 : 0.25 + rnd() * 0.75 * (0.6 + 0.4 * Math.sin(i * 0.35)));
  }
  return out;
}

async function decodePeaks(url: string, bars: number): Promise<number[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const buf = await res.arrayBuffer();
  const Ctx = window.OfflineAudioContext;
  const ctx = new Ctx(1, 2, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let b = 0; b < bars; b++) {
    let sum = 0;
    for (let i = b * size; i < Math.min(data.length, (b + 1) * size); i += 16) sum += data[i] * data[i];
    peaks.push(Math.sqrt(sum / (size / 16)));
  }
  const max = Math.max(...peaks, 1e-6);
  return peaks.map((p) => Math.max(0.04, p / max));
}

/** Peaks for `url` (decoded once and cached), falling back to a seeded envelope
 *  while loading, on a CORS/decode failure, or when there's no audio yet. */
export function useWaveform(url: string | null, seed: number, bars = 72): { peaks: number[]; real: boolean } {
  const [state, setState] = useState<{ url: string | null; peaks: number[] | null }>({ url: null, peaks: null });

  useEffect(() => {
    if (!url || typeof window === "undefined" || !("OfflineAudioContext" in window)) return;
    const key = `${url}#${bars}`;
    let p = peakCache.get(key);
    if (!p) {
      p = decodePeaks(url, bars);
      peakCache.set(key, p);
      p.catch(() => peakCache.delete(key));
    }
    let live = true;
    p.then(
      (peaks) => live && setState({ url, peaks }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [url, bars]);

  if (url && state.url === url && state.peaks) return { peaks: state.peaks, real: true };
  return { peaks: syntheticPeaks(seed, bars), real: false };
}

// --------------------------------------------------------------------------- //
// Palette: dominant colors sampled from the real style reference image.
// --------------------------------------------------------------------------- //

export const FALLBACK_SWATCHES = ["#2a1f3d", "#6b3f5a", "#c9744a", "#f2b544", "#efe8da"];
const paletteCache = new Map<string, Promise<string[]>>();

function samplePalette(url: string, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needs CORS; a tainted canvas rejects below
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 32;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return reject(new Error("no 2d"));
        g.drawImage(img, 0, 0, 32, 32);
        const px = g.getImageData(0, 0, 32, 32).data;
        // Bucket by coarse color (4 bits/channel), weight by count, then keep
        // the most common buckets that are visibly distinct, sorted dark->light.
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < px.length; i += 4) {
          const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
          const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          e.n += 1;
          e.r += px[i];
          e.g += px[i + 1];
          e.b += px[i + 2];
          buckets.set(key, e);
        }
        const ranked = [...buckets.values()]
          .sort((a, b) => b.n - a.n)
          .map((e) => [e.r / e.n, e.g / e.n, e.b / e.n]);
        const picked: number[][] = [];
        for (const c3 of ranked) {
          if (picked.every((p) => Math.hypot(p[0] - c3[0], p[1] - c3[1], p[2] - c3[2]) > 48)) picked.push(c3);
          if (picked.length === count) break;
        }
        const lum = (c3: number[]) => 0.2126 * c3[0] + 0.7152 * c3[1] + 0.0722 * c3[2];
        resolve(
          picked
            .sort((a, b) => lum(a) - lum(b))
            .map((c3) => `#${c3.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`),
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("load"));
    img.src = url;
  });
}

/** Swatches from the style reference, or the house fallback until it lands. */
export function usePalette(url: string | null, count = 5): { swatches: string[]; real: boolean } {
  const [state, setState] = useState<{ url: string | null; swatches: string[] | null }>({
    url: null,
    swatches: null,
  });

  useEffect(() => {
    if (!url) return;
    let p = paletteCache.get(url);
    if (!p) {
      p = samplePalette(url, count);
      paletteCache.set(url, p);
      p.catch(() => paletteCache.delete(url));
    }
    let live = true;
    p.then(
      (swatches) => live && swatches.length >= 3 && setState({ url, swatches }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [url, count]);

  if (url && state.url === url && state.swatches) return { swatches: state.swatches, real: true };
  return { swatches: FALLBACK_SWATCHES, real: false };
}

/** A clock in seconds for decorative loops; frozen at 0 under reduced motion. */
export function useTicker(intervalMs: number, enabled: boolean): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return tick;
}
