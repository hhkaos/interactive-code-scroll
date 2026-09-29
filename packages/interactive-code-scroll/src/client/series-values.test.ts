import { describe, expect, it } from "vitest";
import { countLabel, matchesTags } from "./series-values.ts";

describe("series tag filter", () => {
  it("keeps every card without a selection, else cards with any selected tag", () => {
    expect(matchesTags([], [])).toBe(true);
    expect(matchesTags(["Web", "Python"], ["Python", "REST"])).toBe(true);
    expect(matchesTags(["Web"], ["Python"])).toBe(false);
  });

  it("counts tutorials", () => {
    expect(countLabel(3, 3)).toBe("3 tutorials");
    expect(countLabel(1, 1)).toBe("1 tutorial");
    expect(countLabel(1, 3)).toBe("1 of 3 tutorials");
  });
});
