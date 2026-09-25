import { describe, expect, it } from "vitest";
import { clampSplit, DOCS_SPLIT, parseStoredSplit, PREVIEW_SPLIT, resolveMode, splitFromPointer } from "./layout-values.ts";

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
    expect(clampSplit(5, DOCS_SPLIT)).toBe(DOCS_SPLIT.min);
    expect(clampSplit(95, DOCS_SPLIT)).toBe(DOCS_SPLIT.max);
    expect(clampSplit(33.333, DOCS_SPLIT)).toBe(33.3);
    expect(clampSplit(Number.NaN, DOCS_SPLIT)).toBe(DOCS_SPLIT.fallback);
    expect(clampSplit(95, PREVIEW_SPLIT)).toBe(PREVIEW_SPLIT.max);
  });

  it("converts pointer position to a percentage of the container", () => {
    expect(splitFromPointer(600, 100, 1000, DOCS_SPLIT)).toBe(50);
    expect(splitFromPointer(0, 0, 1000, DOCS_SPLIT)).toBe(DOCS_SPLIT.min);
  });

  it("parses stored values", () => {
    expect(parseStoredSplit(null, DOCS_SPLIT)).toBe(DOCS_SPLIT.fallback);
    expect(parseStoredSplit("55", DOCS_SPLIT)).toBe(55);
    expect(parseStoredSplit("junk", PREVIEW_SPLIT)).toBe(PREVIEW_SPLIT.fallback);
  });
});
