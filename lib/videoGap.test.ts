import { describe, expect, it } from "vitest";
import { gapCopy } from "@/lib/videoGap";

describe("gapCopy", () => {
  it("explains a content block for one scene", () => {
    const c = gapCopy({ ready: 11, total: 12, missing: [4], reason: "blocked" });
    expect(c.title).toBe("11 of 12 scenes are filmed");
    expect(c.why).toContain("blocked scene 4");
    expect(c.finish).toBe("Finish with 1 still");
    expect(c.choice).toContain("its still image");
  });

  it("lists several scenes and pluralises", () => {
    const c = gapCopy({ ready: 9, total: 12, missing: [2, 7, 11], reason: "unavailable" });
    expect(c.why).toContain("scenes 2, 7 and 11");
    expect(c.finish).toBe("Finish with 3 stills");
    expect(c.retry).toBe("Try again later");
  });
});
