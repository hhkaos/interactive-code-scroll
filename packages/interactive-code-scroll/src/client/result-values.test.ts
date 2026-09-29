import { describe, expect, it } from "vitest";
import { lastResult, stepOutput, stepRequests, type StepResult } from "./result-values.ts";

describe("lastResult", () => {
  const single: StepResult[] = [{}, { output: "a.json" }, {}, { requests: ["list"] }, {}];

  it("picks the active step when it has a result, else the nearest earlier one", () => {
    expect(lastResult(single, 1)).toBe(1);
    expect(lastResult(single, 2)).toBe(1);
    expect(lastResult(single, 3)).toBe(3);
    expect(lastResult(single, 4)).toBe(3);
  });

  it("has none before the first result, and none without an active step", () => {
    expect(lastResult(single, 0)).toBe(-1);
    expect(lastResult(single, -1)).toBe(-1);
  });

  it("resolves per variant, skipping steps without an output or request for it", () => {
    const steps: StepResult[] = [
      { outputs: { python: "python/a.json", curl: "a.json" } },
      { outputs: { curl: "b.txt" } },
      { requests: ["list"], requestVariants: ["node"] },
      {},
    ];
    expect(lastResult(steps, 3, "python")).toBe(0);
    expect(lastResult(steps, 3, "curl")).toBe(1);
    expect(lastResult(steps, 3, "node")).toBe(2);
    expect(lastResult(steps, 3, "web")).toBe(-1);
  });
});

describe("stepOutput and stepRequests", () => {
  it("read a step's output and requests for a variant", () => {
    const step: StepResult = { outputs: { curl: "a.json" }, requests: ["get", "post"], requestVariants: ["curl"] };
    expect(stepOutput(step, "curl")).toBe("a.json");
    expect(stepOutput({ output: "b.json" })).toBe("b.json");
    expect(stepRequests(step, "curl")).toEqual(["get", "post"]);
    expect(stepRequests(step, "python")).toEqual([]);
    expect(stepRequests({ requests: ["get"] })).toEqual(["get"]);
  });
});
