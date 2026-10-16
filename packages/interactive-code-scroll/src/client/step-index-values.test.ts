import { describe, expect, it } from "vitest";
import { indexEntries, indexHeading } from "./step-index-values.ts";

describe("indexEntries", () => {
  const steps = [{ title: "Load the SDK" }, { title: " Build the UI " }, { title: "" }];

  it("numbers the steps and marks them seen, current or pending by position", () => {
    expect(indexEntries({ steps, current: 1 })).toEqual([
      { number: 1, title: "Load the SDK", state: "seen" },
      { number: 2, title: "Build the UI", state: "current" },
      { number: 3, title: "Step 3", state: "pending" },
    ]);
  });

  it("has every step seen on the closing panel and none at the intro", () => {
    expect(indexEntries({ steps, current: 2, completed: true }).map((e) => e.state)).toEqual(["seen", "seen", "seen"]);
    expect(indexEntries({ steps, current: -1 }).map((e) => e.state)).toEqual(["pending", "pending", "pending"]);
  });

  it("names the variants of a step limited to others", () => {
    const variant = { active: "js", labels: { js: "JavaScript", curl: "cURL", py: "Python" } };
    const entries = indexEntries({ steps: [{ title: "Install", only: "js" }, { title: "Flags", only: "curl py" }], current: 0, variant });
    expect(entries[0]!.otherVariants).toBeUndefined();
    expect(entries[1]!.otherVariants).toBe("cURL and Python");
  });
});

describe("indexHeading", () => {
  it("says where the reader is", () => {
    expect(indexHeading(-1, 9)).toBe("Introduction");
    expect(indexHeading(2, 9)).toBe("Step 3 of 9");
    expect(indexHeading(8, 9, true)).toBe("Done");
  });
});
