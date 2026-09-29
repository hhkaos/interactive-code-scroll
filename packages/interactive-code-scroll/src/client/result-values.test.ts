import { describe, expect, it } from "vitest";
import { lastOutput, type StepOutput } from "./result-values.ts";

describe("lastOutput", () => {
  const single = [{}, { output: "a.json" }, {}, { output: "b.txt" }, {}];

  it("shows the active step's output, else the nearest earlier one", () => {
    expect(lastOutput(single, 1)).toBe("a.json");
    expect(lastOutput(single, 2)).toBe("a.json");
    expect(lastOutput(single, 4)).toBe("b.txt");
  });

  it("has none before the first output, and none without an active step", () => {
    expect(lastOutput(single, 0)).toBeUndefined();
    expect(lastOutput(single, -1)).toBeUndefined();
  });

  it("resolves per variant, skipping steps without an output for it", () => {
    const steps: StepOutput[] = [
      { outputs: { python: "python/a.json", curl: "a.json" } },
      { outputs: { curl: "b.txt" } },
      {},
    ];
    expect(lastOutput(steps, 2, "python")).toBe("python/a.json");
    expect(lastOutput(steps, 2, "curl")).toBe("b.txt");
    expect(lastOutput(steps, 2, "web")).toBeUndefined();
  });
});
