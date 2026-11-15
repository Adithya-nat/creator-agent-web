import { describe, expect, it } from "vitest";
import atlas from "./posterAtlas.json";
import { pickPosters, POSTERS, type Poster } from "./posters";

const pool: Poster[] = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  title: `Film ${i}`,
  year: 2000 + i,
  lang: "en",
  src: `/posters/${i}.webp`,
}));

describe("pickPosters", () => {
  it("draws n distinct posters while the pool lasts", () => {
    const got = pickPosters(8, 0, pool);
    expect(got).toHaveLength(8);
    expect(new Set(got.map((p) => p.id)).size).toBe(8);
  });

  it("repeats only after exhausting the pool", () => {
    const got = pickPosters(15, 0, pool);
    expect(new Set(got.slice(0, 10).map((p) => p.id)).size).toBe(10);
    expect(got[10]).toEqual(got[0]);
  });

  it("is stable per salt within a visit and differs across salts", () => {
    expect(pickPosters(10, 3, pool)).toEqual(pickPosters(10, 3, pool));
    expect(pickPosters(10, 3, pool)).not.toEqual(pickPosters(10, 4, pool));
  });

  it("falls back to imageless stubs on an empty pool", () => {
    const got = pickPosters(4, 0, []);
    expect(got).toHaveLength(4);
    expect(got.every((p) => p.src === "")).toBe(true);
  });

  it("ships a manifest of 2:3 WebP posters under /posters", () => {
    for (const p of POSTERS) expect(p.src).toMatch(/^\/posters\/\d+\.webp$/);
  });

  it("keeps the hero atlas in sync with the poster pool", () => {
    // Regenerate both with scripts/sample_posters.py if this fails.
    expect(atlas.count).toBe(POSTERS.length);
    expect(atlas.width).toBe(atlas.cols * (atlas.cellW + 2 * atlas.pad));
    expect(atlas.height).toBe(Math.ceil(atlas.count / atlas.cols) * (atlas.cellH + 2 * atlas.pad));
    expect(atlas.cellW / atlas.cellH).toBeCloseTo(2 / 3, 5);
  });
});
