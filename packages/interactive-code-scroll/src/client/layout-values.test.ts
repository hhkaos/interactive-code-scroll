import { describe, expect, it } from "vitest";
import { clampSplit, parseStoredSplit, resolveMode, splitFromPointer, SPLIT_DEFAULT, SPLIT_MAX, SPLIT_MIN } from "./layout-values.ts";

describe("resolveMode", () => {
  it("prefers a stored manual choice", () => {
    expect(resolveMode("dark", false)).toBe("dark");
    expect(resolveMode("light", true)).toBe("light");
  });

  it("then the tutorial's default", () => {
    expect(resolveMode(null, true, "light")).toBe("light");
    expect(resolveMode("dark", false, "light")).toBe("dark");
  });

  it("falls back to the OS preference", () => {
    expect(resolveMode(null, true, "auto")).toBe("dark");
    expect(resolveMode(null, true)).toBe("dark");
    expect(resolveMode("bogus", false)).toBe("light");
  });
});

describe("split", () => {
  it("clamps to keep both panels usable", () => {
    expect(clampSplit(5)).toBe(SPLIT_MIN);
    expect(clampSplit(95)).toBe(SPLIT_MAX);
    expect(clampSplit(33.333)).toBe(33.3);
    expect(clampSplit(Number.NaN)).toBe(SPLIT_DEFAULT);
  });

  it("converts pointer position to a percentage of the layout", () => {
    expect(splitFromPointer(600, 100, 1000)).toBe(50);
    expect(splitFromPointer(0, 0, 1000)).toBe(SPLIT_MIN);
  });

  it("parses stored values", () => {
    expect(parseStoredSplit(null)).toBe(SPLIT_DEFAULT);
    expect(parseStoredSplit("55")).toBe(55);
    expect(parseStoredSplit("junk")).toBe(SPLIT_DEFAULT);
  });
});
