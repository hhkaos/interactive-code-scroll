import { describe, expect, it } from "vitest";
import { credentialWarnings, isTextOutput, outputKind, resolveOutput } from "./output.ts";

describe("outputKind", () => {
  it.each([
    ["result.json", "json"],
    ["run.TXT", "text"],
    ["logs/run.log", "text"],
    ["map.png", "image"],
    ["map.svg", "image"],
    ["data.csv", undefined],
    ["README", undefined],
  ])("%s → %s", (path, kind) => {
    expect(outputKind(path)).toBe(kind);
  });

  it("reads JSON, text and SVG as text", () => {
    expect(["a.json", "a.log", "a.svg"].every(isTextOutput)).toBe(true);
    expect(isTextOutput("a.png")).toBe(false);
  });
});

describe("resolveOutput", () => {
  const outputs = ["geocode.json", "python/geocode.json", "python/only.txt"];

  it("looks up output/<variant>/<name> before output/<name>", () => {
    expect(resolveOutput("geocode.json", outputs, "python")).toBe("python/geocode.json");
    expect(resolveOutput("geocode.json", outputs, "curl")).toBe("geocode.json");
    expect(resolveOutput("only.txt", outputs, "python")).toBe("python/only.txt");
  });

  it("is undefined when neither exists", () => {
    expect(resolveOutput("only.txt", outputs, "curl")).toBeUndefined();
    expect(resolveOutput("missing.json", outputs)).toBeUndefined();
  });
});

describe("credentialWarnings", () => {
  const warn = (text: string, defaults: string[] = []) => credentialWarnings([{ path: "run.json", text }], new Set(defaults));

  it.each([
    ["https://x.test/find?f=json&token=AAPK123abc", "token"],
    ['{\n  "token": "AAPK123abc"\n}', "token"],
    ['{ "apiKey": "AAPK123abc" }', "apiKey"],
    ["apiKey=AAPK123abc", "apiKey"],
    ["Authorization: Bearer eyJhbGciOi", "Authorization:Bearer"],
  ])("warns about %j", (text, key) => {
    const [warning] = warn(text);
    expect(warning).toMatch(/^output\/run\.json:\d+ looks like it contains a credential/);
    expect(warning).toContain(`(${key})`);
    expect(warning).not.toContain("AAPK123abc");
  });

  it("reports the line of each match", () => {
    expect(warn('{\n  "token": "AAPK123abc"\n}')[0]).toMatch(/^output\/run\.json:2 /);
  });

  it("accepts var defaults, .http placeholders and text without credentials", () => {
    expect(warn("https://x.test/find?token=YOUR_TOKEN", ["YOUR_TOKEN"])).toEqual([]);
    expect(warn('{ "apiKey": "{{apiKey}}" }')).toEqual([]);
    expect(warn('{ "tokens": 3, "candidates": [] }')).toEqual([]);
  });
});
