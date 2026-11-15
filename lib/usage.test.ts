import { describe, expect, it } from "vitest";
import { CATEGORY_COLOR, orderedCategories, share, styleDurationRows } from "@/lib/usage";

describe("usage helpers", () => {
  it("keeps a fixed category order (color follows the entity, not rank)", () => {
    expect(orderedCategories(["music", "video", "foo", "text"])).toEqual(["video", "text", "music", "foo"]);
    expect(CATEGORY_COLOR.video).toBe("#3987e5");
  });

  it("reshapes style x duration averages and drops empty styles", () => {
    expect(styleDurationRows({ dialogue_30: 4.5, dialogue_60: 9.1, narrated_30: 3 })).toEqual([
      { storyStyle: "dialogue", "30": 4.5, "60": 9.1 },
      { storyStyle: "narrated", "30": 3, "60": null },
    ]);
  });

  it("chart rows never use keys Recharts would pass to the SVG as props", () => {
    const keys = Object.keys(styleDurationRows({ mixed_30: 5 })[0]);
    for (const reserved of ["style", "className", "children", "key", "ref"]) expect(keys).not.toContain(reserved);
  });

  it("share is safe on a zero total", () => {
    expect(share(1, 0)).toBe(0);
    expect(share(1, 4)).toBe(0.25);
  });
});
