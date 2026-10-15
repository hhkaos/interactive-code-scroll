import { describe, expect, it } from "vitest";
import { fileChanges } from "./file-change-values.ts";

describe("fileChanges", () => {
  it("marks the steps that show a file other than the one before them", () => {
    expect(fileChanges(["a.js", "a.js", "b.js", "a.js"], "a.js")).toEqual([undefined, undefined, "b.js", "a.js"]);
  });

  it("marks the first step when it leaves the starting file", () => {
    expect(fileChanges(["b.js"], "a.js")).toEqual(["b.js"]);
    expect(fileChanges(["b.js"], undefined)).toEqual(["b.js"]);
  });

  it("carries the shown file across steps that keep it (text-only, media, other variants)", () => {
    expect(fileChanges(["a.js", undefined, "a.js", undefined, "b.js"], "a.js")).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      "b.js",
    ]);
  });
});
