import { describe, expect, it, vi } from "vitest";
import { consoleCaptureScript, consoleSource, snapshotConsoleArgs } from "./console.ts";

const snapshot = (...args: unknown[]) => JSON.parse(snapshotConsoleArgs(args));

describe("console snapshots", () => {
  it("captures a detached snapshot with labels, nested JSON and primitive types", () => {
    const object = { user: { name: "demo" }, active: true, count: 2, empty: null };
    const result = snapshot("getSelf()", object);
    object.user.name = "changed";
    expect(result).toEqual(["getSelf()", { user: { name: "demo" }, active: true, count: 2, empty: null }]);
  });

  it("handles cycles, repeated references, special values, errors and throwing proxies", () => {
    const object: Record<string, unknown> = {};
    object.self = object;
    const shared = { x: 1 };
    expect(snapshot(object, [shared, shared], undefined, 2n, NaN, Symbol("x"), () => {})).toEqual([
      { self: "[Circular]" }, [{ x: 1 }, { x: 1 }], "[undefined]", "2n", "NaN", "Symbol(x)", "[Function]",
    ]);
    expect(snapshot(new Error("failed"))[0]).toMatchObject({ message: "failed" });
    expect(snapshot(new Proxy({}, { ownKeys() { throw new Error(); } }))).toEqual(["[Uninspectable]"]);
  });

  it("does not execute getters or toJSON, and preserves special object keys safely", () => {
    const getter = vi.fn(() => { throw new Error("getter ran"); });
    const toJSON = vi.fn();
    const object = Object.defineProperty({ toJSON }, "value", { enumerable: true, get: getter });
    expect(snapshot(object)).toEqual([{ toJSON: "[Function]", value: "[Getter/Setter]" }]);
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(snapshot(JSON.parse('{"__proto__":{"safe":true}}'))).toEqual([JSON.parse('{"__proto__":{"safe":true}}')]);
  });

  it("bounds deep, wide and large values", () => {
    expect(snapshot("x".repeat(10000))[0]).toHaveLength(4013);
    expect(snapshot(Array.from({ length: 1000 }, (_, i) => i))[0]).toHaveLength(101);
    let deep: unknown = null;
    for (let i = 0; i < 20; i++) deep = { child: deep };
    expect(snapshotConsoleArgs([deep])).toContain("[Max depth]");
    const manyArgs = snapshot(...Array(30).fill(1));
    expect(manyArgs).toHaveLength(20);
    expect(manyArgs.at(-1)).toBe("[Truncated arguments]");
    expect(snapshotConsoleArgs([Array(100).fill("x".repeat(10000))]).length).toBeLessThan(70000);
  });
});

it("the injected script runs without module closures, forwards all levels and preserves native console", () => {
  const parent = { postMessage: vi.fn() };
  const console = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const originalLog = console.log;
  const source = consoleCaptureScript().replace(/^<script>|<\/script>$/g, "");
  new Function("parent", "window", "location", "console", source)(parent, {}, { search: "?target=iframe", origin: "https://example.test" }, console);
  const object = { value: 1 };
  for (const level of ["log", "info", "warn", "error"] as const) console[level]("label", object);
  expect(parent.postMessage).toHaveBeenCalledTimes(5);
  expect(parent.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: "ics:console", level: "error", args: '["label",{"value":1}]' }), "https://example.test");
  expect(originalLog).toHaveBeenCalledWith("label", object);
});


describe("console source locations", () => {
  it("skips the wrapper in Chromium stacks", () => {
    expect(consoleSource("Error\n    at console.log (https://example.test/preview/:100:1)\n    at click (https://example.test/preview/main.js:27:9)")).toEqual({ url: "https://example.test/preview/main.js", line: 27, column: 9 });
  });
  it("supports Firefox and WebKit stacks with no heading", () => {
    expect(consoleSource("console[level]@https://example.test/preview/:100:1\nclick@https://example.test/preview/main.js:27:9")).toEqual({ url: "https://example.test/preview/main.js", line: 27, column: 9 });
  });
  it("does not invent source locations when the browser provides none", () => {
    expect(consoleSource(undefined)).toBeUndefined();
    expect(consoleSource("Error\n at hook (native)\n at anonymous")).toBeUndefined();
  });
});
