import { mulberry32 } from "@/lib/rand";
import manifest from "@/lib/posterManifest.json";

/** One poster from the curated pool (see scripts/sample_posters.py). Every
 *  image is a 320x480 (2:3) WebP under /public/posters. */
export interface Poster {
  id: number;
  title: string;
  year: number;
  lang: string;
  src: string;
}

export const POSTERS: readonly Poster[] = manifest as Poster[];

/** Width / height of every poster image; tiles use this so nothing stretches. */
export const POSTER_ASPECT = 2 / 3;

// One random seed per page load: posters reshuffle on every visit but stay
// stable across re-renders and stage changes within it. Module scope keeps
// Math.random out of render.
const SESSION_SEED = (Math.random() * 2 ** 32) >>> 0;

/** `n` posters in a random-per-visit order. `salt` gives each scene its own
 *  draw, so the script cards and the frame carousel don't show the same set.
 *  Repeats only when n exceeds the pool. */
export function pickPosters(n: number, salt = 0, pool: readonly Poster[] = POSTERS): Poster[] {
  if (n <= 0) return [];
  // Empty pool: imageless stubs, so every scene still draws its colored tiles.
  if (pool.length === 0)
    return Array.from({ length: n }, (_, i) => ({ id: -1 - i, title: "", year: 0, lang: "", src: "" }));
  const rnd = mulberry32(SESSION_SEED ^ Math.imul(salt + 1, 0x9e3779b1));
  const deck = [...pool];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Array.from({ length: n }, (_, i) => deck[i % deck.length]);
}
