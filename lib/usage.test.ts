import { describe, expect, it } from "vitest";
import type { UsageSummary } from "@/lib/types";
import { CATEGORY_COLOR, orderedCategories, share, toPair, viewOf, withYou } from "@/lib/usage";

describe("usage helpers", () => {
  it("keeps a fixed category order (color follows the entity, not rank)", () => {
    expect(orderedCategories(["music", "video", "foo", "text"])).toEqual(["video", "text", "music", "foo"]);
    expect(CATEGORY_COLOR.video).toBe("#3987e5");
  });

  it("share is safe on a zero total", () => {
    expect(share(1, 0)).toBe(0);
    expect(share(1, 4)).toBe(0.25);
  });
});

describe("everyone vs you", () => {
  const base: UsageSummary = { range: "30d", runs: 1, completed_runs: 1, success_rate: 1, total_cost_usd: 2, avg_cost_per_run: 2,
    avg_cost_per_second: 0.1, avg_runtime_seconds: 60, avg_judge_score: null, omni_share: 1, by_category: {},
    by_model: {}, by_provider: {}, by_day: [], avg_cost_by_style_duration: {}, by_language: {} };
  const me = { ...base, scope: "me" as const };
  const all = { ...base, scope: "all" as const, total_cost_usd: 10, creators: 3 };

  it("treats an old server's answer as 'no project view' instead of mislabelling it", () => {
    expect(toPair(me, { ...base }).all).toBeNull();
    expect(toPair(me, all).all?.total_cost_usd).toBe(10);
  });

  it("picks the scope and compares against the other side", () => {
    const pair = toPair(me, all);
    expect(viewOf(pair, "all")).toMatchObject({ view: { total_cost_usd: 10 }, other: { total_cost_usd: 2 }, otherScope: "me" });
    expect(viewOf(pair, "me")).toMatchObject({ view: { total_cost_usd: 2 }, other: { total_cost_usd: 10 }, otherScope: "all" });
    expect(viewOf({ me, all: null }, "all")).toMatchObject({ view: { total_cost_usd: 2 }, other: null });
  });

  it("lines your daily total up with the project's days", () => {
    const rows = withYou([{ date: "2026-11-01", total: 5 }, { date: "2026-11-02", total: 3 }], [{ date: "2026-11-02", total: 1 }]);
    expect(rows.map((r) => r.you_total)).toEqual([0, 1]);
  });
});
