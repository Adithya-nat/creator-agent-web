import { describe, expect, it } from "vitest";
import {
  bestFilm, calendarWeeks, fmtCompact, fmtRuntime, intensity, milestones, monthEndForecast,
  pageToScreen, rhythm, scoreTrend, spotPicks, stageShares,
} from "@/lib/insights";
import type { FilmPoint, StudioStats } from "@/lib/types";

const film = (n: number, film_score: number | null, judge_score: number | null = 90, cost_usd = 10): FilmPoint => ({
  n, job_id: `j${n}`, started_at: null, film_score, judge_score, cost_usd, duration: 30, style: "dialogue", language: "en", ai_share: 1,
});

const stats = (over: Partial<StudioStats> = {}): StudioStats => ({
  creators: 1, runs: 0, films: 0, screen_seconds: 0, scenes: 0, ai_scenes: 0, images: 0, video_seconds: 0, tokens: 0,
  spend_usd: 0, published: 0, library: [], genres: {}, renders: 0, rendered_seconds: 0, shooting_ratio: null,
  songs: 0, languages: {}, styles: {}, outcomes: {}, first_at: null, last_at: null, active_days: 0,
  current_streak: 0, longest_streak: 0, activity: [], punchcard: Array.from({ length: 7 }, () => Array(24).fill(0)),
  stages: [], timeline: [], sweet_spots: [], ...over,
});

describe("formatting", () => {
  it("reads runtimes and big counts the way people say them", () => {
    expect([fmtRuntime(42), fmtRuntime(75), fmtRuntime(120), fmtRuntime(3900)]).toEqual(["42s", "1m 15s", "2m", "1h 5m"]);
    expect([fmtCompact(950), fmtCompact(1234), fmtCompact(25_000), fmtCompact(1_250_000)]).toEqual(["950", "1.2k", "25k", "1.3M"]);
  });
});

describe("activity calendar", () => {
  it("ends on the week holding today, Monday first, and marks future days", () => {
    const today = new Date(2026, 10, 18); // a Wednesday
    const weeks = calendarWeeks([{ date: "2026-11-17", runs: 2, films: 1, cost_usd: 9 }], today, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[1][0].date).toBe("2026-11-16"); // Monday of this week
    expect(weeks[1][1]).toMatchObject({ date: "2026-11-17", runs: 2, future: false });
    expect(weeks[1][3].future).toBe(true);
  });

  it("scales intensity to the busiest day", () => {
    expect([intensity(0, 4), intensity(1, 4), intensity(4, 4), intensity(9, 4)]).toEqual([0, 1, 4, 4]);
  });
});

describe("rhythm", () => {
  it("names the busiest weekday and part of the day", () => {
    const punch = Array.from({ length: 7 }, () => Array(24).fill(0));
    punch[1][19] = 3; // Tuesday 7pm
    punch[1][20] = 1;
    punch[5][9] = 1;
    expect(rhythm(punch)).toMatchObject({ day: "Tuesday", part: "evenings", peakHour: 19 });
    expect(rhythm(Array.from({ length: 7 }, () => Array(24).fill(0)))).toBeNull();
  });
});

describe("craft", () => {
  it("compares recent films with earlier ones once there are four scores", () => {
    expect(scoreTrend([film(1, 50), film(2, 60), film(3, null)])).toBeNull();
    expect(scoreTrend([film(1, 50), film(2, 52), film(3, 60), film(4, 64)])).toMatchObject({ window: 2, recent: 62, earlier: 51, delta: 11 });
  });

  it("measures points lost from page to screen", () => {
    expect(pageToScreen([film(1, 60, 90), film(2, 70, 90), film(3, null, 80)])).toBe(25);
    expect(pageToScreen([film(1, null)])).toBeNull();
  });

  it("picks the best film, cheaper on a tie", () => {
    expect(bestFilm([film(1, 70, 90, 12), film(2, 70, 90, 8), film(3, 60)])?.n).toBe(2);
    expect(bestFilm([film(1, null)])).toBeNull();
  });

  it("finds the best-value and top-scoring formats", () => {
    const picks = spotPicks([
      { key: "dialogue_30", films: 2, avg_cost_usd: 5, avg_film_score: 60, avg_judge_score: 90 },
      { key: "mixed_60", films: 3, avg_cost_usd: 12, avg_film_score: 66, avg_judge_score: 92 },
      { key: "narrated_30", films: 1, avg_cost_usd: 2, avg_film_score: null, avg_judge_score: 80 },
    ]);
    expect(picks).toEqual({ value: "dialogue_30", top: "mixed_60" });
  });

  it("splits spend across stages", () => {
    const { rows, top } = stageShares([{ stage: "brief", cost_usd: 1, avg_seconds: null, timed_runs: 0 }, { stage: "motion", cost_usd: 3, avg_seconds: 400, timed_runs: 2 }]);
    expect(rows.map((r) => r.share)).toEqual([0.25, 0.75]);
    expect(top?.stage).toBe("motion");
  });
});

describe("milestones", () => {
  it("earns every step passed and offers the next one per family, closest first", () => {
    const m = milestones(stats({ films: 7, screen_seconds: 240, longest_streak: 3, published: 0, languages: { en: 6, ta: 1 },
      timeline: [film(1, 66)] }));
    expect(m.earned.map((e) => e.id)).toEqual(["films-1", "films-5", "screen-60", "score-60", "streak-3", "languages-2"]);
    expect(m.next.slice(0, 2).map((n) => n.id)).toEqual(["score-75", "screen-300"]); // 66/75, then 240/300
    expect(m.next.map((n) => n.id)).toContain("films-10");
    expect(m.next.map((n) => n.id)).not.toContain("languages-2");
  });
});

describe("forecast", () => {
  it("projects month-end spend from the daily pace", () => {
    const f = monthEndForecast(30, new Date(2026, 10, 11, 0)); // 10 days into a 30-day month
    expect(f).toEqual({ projected: 90, days: 30 });
    expect(monthEndForecast(5, new Date(2026, 10, 1, 9))).toBeNull();
  });
});
