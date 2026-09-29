import { describe, expect, it } from "vitest";
import { stepMaximize, toggleMaximize } from "./maximize-values.ts";

describe("stepMaximize", () => {
  it("maximizes the step's pane, replacing another", () => {
    expect(stepMaximize(undefined, "code")).toBe("code");
    expect(stepMaximize("code", "preview")).toBe("preview");
  });

  it("restores the layout with none", () => {
    expect(stepMaximize("preview", "none")).toBeUndefined();
    expect(stepMaximize(undefined, "none")).toBeUndefined();
  });

  it("keeps the current state when omitted", () => {
    expect(stepMaximize("code", undefined)).toBe("code");
    expect(stepMaximize(undefined, undefined)).toBeUndefined();
  });
});

describe("toggleMaximize", () => {
  it("maximizes a pane, or restores when it is already maximized", () => {
    expect(toggleMaximize(undefined, "code")).toBe("code");
    expect(toggleMaximize("code", "code")).toBeUndefined();
  });

  it("switches to the other pane (one at a time)", () => {
    expect(toggleMaximize("code", "preview")).toBe("preview");
  });
});
