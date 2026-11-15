"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import type { Poster } from "@/lib/posters";

// Refcounted texture cache shared by every scene on the page. A texture is
// uploaded once however many tiles show it, and dispose() frees its GPU memory
// as soon as the last scene using it unmounts (three never does this itself).
const cache = new Map<string, { tex: THREE.Texture; refs: number; ready: Promise<THREE.Texture> }>();
const loader = typeof document === "undefined" ? null : new THREE.TextureLoader();

function acquire(src: string): Promise<THREE.Texture> | null {
  if (!loader || !src) return null; // headless tests / SSR / stub poster: keep the placeholder
  const hit = cache.get(src);
  if (hit) {
    hit.refs += 1;
    return hit.ready;
  }
  const tex = new THREE.Texture();
  const ready = loader.loadAsync(src).then((loaded) => {
    tex.image = loaded.image;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    loaded.dispose();
    return tex;
  });
  cache.set(src, { tex, refs: 1, ready });
  return ready;
}

function release(src: string) {
  const hit = cache.get(src);
  if (!hit) return;
  hit.refs -= 1;
  if (hit.refs <= 0) {
    hit.tex.dispose();
    cache.delete(src);
  }
}

/** Textures for `posters`, index-aligned. Entries stay null until that image
 *  has loaded, so tiles render a placeholder first and swap in their poster
 *  without waiting for the whole set (and a 404 never blanks the scene). */
export function usePosterTextures(posters: Poster[]): (THREE.Texture | null)[] {
  const key = posters.map((p) => p.src).join("|");
  const [state, setState] = useState<{ key: string; tex: (THREE.Texture | null)[] }>({
    key,
    tex: [],
  });

  useEffect(() => {
    const srcs = key ? key.split("|") : [];
    let live = true;
    srcs.forEach((src, i) => {
      acquire(src)?.then(
        (tex) => {
          if (!live) return;
          setState((s) => {
            const next = s.key === key ? [...s.tex] : [];
            next[i] = tex;
            return { key, tex: next };
          });
        },
        () => {}, // missing file: that tile keeps its placeholder
      );
    });
    return () => {
      live = false;
      srcs.forEach(release);
    };
  }, [key]);

  return posters.map((_, i) => (state.key === key ? (state.tex[i] ?? null) : null));
}
