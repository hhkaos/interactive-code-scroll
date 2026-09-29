import { describe, expect, it } from "vitest";
import { headerLevel, lastResult, stepOutput, stepRequests, type StepResult } from "./result-values.ts";

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

describe("headerLevel", () => {
  // Keep and Show captured (level 1), Run request (level 2); icons are 32 px.
  const items = [
    { level: 1, full: 120, icon: 32 },
    { level: 1, full: 120, icon: 32 },
    { level: 2, full: 110, icon: 32 },
  ] as const;

  it("keeps every label while the header fits", () => {
    expect(headerLevel(600, 250, items)).toBe(0);
    expect(headerLevel(300, 250, [])).toBe(0);
  });

  it("turns Keep and Show captured into icons first", () => {
    expect(headerLevel(599, 250, items)).toBe(1);
    expect(headerLevel(424, 250, items)).toBe(1);
  });

  it("then Run request, however narrow the header is", () => {
    expect(headerLevel(423, 250, items)).toBe(2);
    expect(headerLevel(100, 250, items)).toBe(2);
  });

  it("only counts the controls that are shown", () => {
    expect(headerLevel(360, 250, [items[2]])).toBe(0);
    expect(headerLevel(359, 250, [items[2]])).toBe(2);
  });
});
