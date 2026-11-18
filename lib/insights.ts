import type { FilmPoint, InsightDay, StageCost, StudioStats, SweetSpot } from "@/lib/types";

// --- Formatting -------------------------------------------------------------------- //

/** 75 -> "1m 15s", 3900 -> "1h 5m", 42 -> "42s". */
export function fmtRuntime(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60}m`;
  const m = Math.round(s / 60);
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
}

/** 1234 -> "1.2k", 1_250_000 -> "1.3M". */
export function fmtCompact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** Local calendar date as YYYY-MM-DD (not toISOString, which is UTC). */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ago(iso: string | null, now = new Date()): string | null {
  if (!iso) return null;
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// --- Activity calendar ------------------------------------------------------------- //

export interface CalendarCell extends InsightDay {
  future: boolean;
}

/** `weeks` columns of Monday..Sunday ending with the week that holds `today`. */
export function calendarWeeks(activity: InsightDay[], today = new Date(), weeks = 53): CalendarCell[][] {
  const byDate = new Map(activity.map((d) => [d.date, d]));
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7);
  const todayKey = localISO(today);
  const out: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = localISO(day);
      const hit = byDate.get(key);
      col.push({ date: key, runs: hit?.runs ?? 0, films: hit?.films ?? 0, cost_usd: hit?.cost_usd ?? 0, future: key > todayKey });
    }
    out.push(col);
  }
  return out;
}

/** 0 (none) to 4 (busiest), relative to the busiest day shown. */
export function intensity(runs: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (runs <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((runs / max) * 4))) as 1 | 2 | 3 | 4;
}

// --- When you create --------------------------------------------------------------- //

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "mornings";
  if (hour >= 12 && hour < 17) return "afternoons";
  if (hour >= 17 && hour < 22) return "evenings";
  return "late nights";
}

/** The busiest weekday and the busiest part of the day, or null with no runs. */
export function rhythm(punch: number[][]): { day: string; part: string; dayShare: number; peakHour: number } | null {
  const total = punch.flat().reduce((a, b) => a + b, 0);
  if (!total) return null;
  const perDay = punch.map((row) => row.reduce((a, b) => a + b, 0));
  const day = perDay.indexOf(Math.max(...perDay));
  const parts = new Map<string, number>();
  const perHour = Array.from({ length: 24 }, (_, h) => punch.reduce((a, row) => a + (row[h] ?? 0), 0));
  perHour.forEach((n, h) => parts.set(partOfDay(h), (parts.get(partOfDay(h)) ?? 0) + n));
  const part = [...parts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { day: WEEKDAYS[day], part, dayShare: perDay[day] / total, peakHour: perHour.indexOf(Math.max(...perHour)) };
}

export function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

// --- Craft --------------------------------------------------------------------------- //

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Recent films vs the ones before them, by film score. Needs four scored films. */
export function scoreTrend(timeline: FilmPoint[]): { recent: number; earlier: number; delta: number; window: number } | null {
  const scored = timeline.map((f) => f.film_score).filter((s): s is number => s != null);
  if (scored.length < 4) return null;
  const window = Math.min(5, Math.floor(scored.length / 2));
  const recent = avg(scored.slice(-window))!;
  const earlier = avg(scored.slice(0, -window))!;
  return { recent, earlier, delta: recent - earlier, window };
}

/** How many points a film loses between the page (script judge) and the screen (film review). */
export function pageToScreen(timeline: FilmPoint[]): number | null {
  const gaps = timeline.filter((f) => f.film_score != null && f.judge_score != null).map((f) => f.judge_score! - f.film_score!);
  const g = avg(gaps);
  return g == null ? null : Math.round(g);
}

/** Highest film score; a tie goes to the cheaper film. */
export function bestFilm(timeline: FilmPoint[]): FilmPoint | null {
  return timeline
    .filter((f) => f.film_score != null)
    .reduce<FilmPoint | null>((best, f) => {
      if (!best || f.film_score! > best.film_score! || (f.film_score === best.film_score && f.cost_usd < best.cost_usd)) return f;
      return best;
    }, null);
}

export const STYLE_LABEL: Record<string, string> = { dialogue: "Dialogue", narrated: "Narrated", mixed: "Mixed" };

export function spotLabel(key: string): { style: string; duration: string } {
  const [style, duration] = key.split("_");
  return { style: STYLE_LABEL[style] ?? style, duration: `${duration}s` };
}

/** The format with the most film-score points per dollar, and the top-scoring one. */
export function spotPicks(spots: SweetSpot[]): { value: string | null; top: string | null } {
  const scored = spots.filter((s) => s.avg_film_score != null && s.avg_cost_usd > 0);
  const by = (f: (s: SweetSpot) => number) => (scored.length ? scored.reduce((a, b) => (f(b) > f(a) ? b : a)).key : null);
  return { value: by((s) => s.avg_film_score! / s.avg_cost_usd), top: by((s) => s.avg_film_score!) };
}

/** Each stage's share of the spend, biggest first in `top`. */
export function stageShares(stages: StageCost[]): { rows: (StageCost & { share: number })[]; top: (StageCost & { share: number }) | null } {
  const total = stages.reduce((a, s) => a + s.cost_usd, 0);
  const rows = stages.map((s) => ({ ...s, share: total > 0 ? s.cost_usd / total : 0 }));
  const top = rows.length ? rows.reduce((a, b) => (b.share > a.share ? b : a)) : null;
  return { rows, top: top && top.share > 0 ? top : null };
}

// --- Milestones ---------------------------------------------------------------------- //

export interface Milestone {
  id: string;
  title: string;
  goal: string;
  target: number;
  family: string;
}

type Metric = (s: StudioStats) => number;
const FAMILIES: { family: string; metric: Metric; steps: [number, string, string][] }[] = [
  {
    family: "films",
    metric: (s) => s.films,
    steps: [
      [1, "Premiere", "Finish your first film"],
      [5, "Short-film slate", "Finish 5 films"],
      [10, "Double digits", "Finish 10 films"],
      [25, "Festival circuit", "Finish 25 films"],
      [50, "Repertory", "Finish 50 films"],
      [100, "Century", "Finish 100 films"],
    ],
  },
  {
    family: "screen",
    metric: (s) => s.screen_seconds,
    steps: [
      [60, "First reel", "1 minute of finished film"],
      [300, "Five on screen", "5 minutes of finished film"],
      [900, "An episode", "15 minutes of finished film"],
      [3600, "Feature length", "1 hour of finished film"],
    ],
  },
  {
    family: "score",
    metric: (s) => Math.max(0, ...s.timeline.map((f) => f.film_score ?? 0)),
    steps: [
      [60, "Crowd pleaser", "A film that reviews 60+"],
      [75, "Critics' pick", "A film that reviews 75+"],
      [90, "Standing ovation", "A film that reviews 90+"],
    ],
  },
  {
    family: "streak",
    metric: (s) => s.longest_streak,
    steps: [
      [3, "Three-day shoot", "Make films 3 days in a row"],
      [7, "Week-long shoot", "Make films 7 days in a row"],
      [30, "Principal photography", "Make films 30 days in a row"],
    ],
  },
  {
    family: "library",
    metric: (s) => s.published,
    steps: [
      [1, "On the marquee", "Publish a film to the library"],
      [5, "Box set", "Publish 5 films"],
    ],
  },
  {
    family: "languages",
    metric: (s) => Object.keys(s.languages).length,
    steps: [[2, "Bilingual", "Finish films in two languages"]],
  },
];

export interface MilestoneProgress {
  earned: Milestone[];
  /** The next step in each family, closest to done first. */
  next: (Milestone & { value: number; progress: number })[];
}

export function milestones(s: StudioStats): MilestoneProgress {
  const earned: Milestone[] = [];
  const next: MilestoneProgress["next"] = [];
  for (const f of FAMILIES) {
    const value = f.metric(s);
    let pending = false;
    for (const [target, title, goal] of f.steps) {
      const m = { id: `${f.family}-${target}`, title, goal, target, family: f.family };
      if (value >= target) earned.push(m);
      else if (!pending) {
        pending = true;
        next.push({ ...m, value, progress: Math.min(1, value / target) });
      }
    }
  }
  next.sort((a, b) => b.progress - a.progress);
  return { earned, next };
}

// --- Budget forecast ----------------------------------------------------------------- //

/** Month-end spend at the current daily pace (null in the first day: too little to go on). */
export function monthEndForecast(spent: number, now = new Date()): { projected: number; days: number } | null {
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = now.getDate() - 1 + now.getHours() / 24;
  if (elapsed < 1) return null;
  return { projected: (spent / elapsed) * days, days };
}
