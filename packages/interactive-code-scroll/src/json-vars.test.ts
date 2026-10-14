import { describe, expect, it } from "vitest";
import { locateJsonValue, parseJsonTarget } from "./json-vars.ts";
import { applyVars, parseSource } from "./markers.ts";

const config = `{
  "title": "My \\"key\\"",
  "key": {
    "expiration": { "days": 30 },
    "a/b": true,
    "referrers": ["https://a.com", "https://b.com"],
    "note": null
  }
}`;

const at = (pointer: string) => {
  const span = locateJsonValue(config, pointer);
  return typeof span === "string" ? span : { kind: span.kind, text: config.slice(span.start, span.end) };
};

describe("locateJsonValue", () => {
  it("finds nested values, array items and escaped keys", () => {
    expect(at("/title")).toEqual({ kind: "string", text: 'My \\"key\\"' });
    expect(at("/key/expiration/days")).toEqual({ kind: "number", text: "30" });
    expect(at("/key/a~1b")).toEqual({ kind: "boolean", text: "true" });
    expect(at("/key/referrers/1")).toEqual({ kind: "string", text: "https://b.com" });
    expect(at("/key/referrers")).toMatchObject({ kind: "array" });
    expect(at("/key/note")).toMatchObject({ kind: "null" });
  });

  it("explains missing pointers and invalid JSON", () => {
    expect(at("/key/missing")).toBe('pointer "/key/missing" not found');
    expect(at("/key/referrers/2")).toBe('pointer "/key/referrers/2" not found');
    expect(locateJsonValue('{\n  "a": 1, // @var a\n}', "/a")).toBe("invalid JSON: comments are not allowed (use <VarField json> instead of @var) at line 2");
    expect(locateJsonValue('{"a": 1,}', "/a")).toMatch(/^invalid JSON: expected """/);
    expect(locateJsonValue('{"a": // @var a\n 1}', "/a")).toMatch(/comments are not allowed/);
    expect(locateJsonValue('{"a": tru}', "/a")).toBe("invalid JSON: unexpected token at line 1");
  });
});

describe("parseJsonTarget", () => {
  it("splits the file and the pointer", () => {
    expect(parseJsonTarget("config/key.json#/key/days")).toEqual({ file: "config/key.json", pointer: "/key/days" });
    expect(parseJsonTarget("key.json")).toMatch(/must be <file>#<pointer>/);
    expect(parseJsonTarget("key.yaml#/a")).toBe('"key.yaml" is not a .json file');
    expect(parseJsonTarget("key.json#a")).toBe('pointer "a" must start with "/"');
  });
});

describe("JSON vars in parseSource", () => {
  const vars = [
    { name: "title", pointer: "/title" },
    { name: "days", pointer: "/key/expiration/days" },
    { name: "token1", pointer: "/key/a~1b" },
  ];

  it("marks the values with their types, keeping the code unchanged", () => {
    const parsed = parseSource(config, "code/key.json", vars);
    expect(parsed.code).toBe(config);
    expect(parsed.vars).toEqual([
      { name: "title", line: 2, fromColumn: 12, toColumn: 22, defaultValue: 'My \\"key\\"', quote: '"', escape: "backslash" },
      { name: "days", line: 4, fromColumn: 28, toColumn: 30, defaultValue: "30", quote: "", escape: "number" },
      { name: "token1", line: 5, fromColumn: 11, toColumn: 15, defaultValue: "true", quote: "", escape: "boolean" },
    ]);
  });

  it("writes values that keep the JSON valid", () => {
    const parsed = parseSource(config, "code/key.json", vars);
    const json = JSON.parse(applyVars(parsed, { title: 'a"b\nc', days: "45", token1: "false" }));
    expect(json.title).toBe('a"b\nc');
    expect(json.key.expiration.days).toBe(45);
    expect(json.key["a/b"]).toBe(false);
    expect(JSON.parse(applyVars(parsed, { days: "soon" })).key.expiration.days).toBe(30);
  });

  it("rejects values that cannot be vars", () => {
    expect(() => parseSource(config, "code/key.json", [{ name: "r", pointer: "/key/referrers" }])).toThrow(/is an array; only strings, numbers and booleans/);
    expect(() => parseSource(config, "code/key.json", [{ name: "r", pointer: "/nope" }])).toThrow(/code\/key\.json:1: <VarField json> r: pointer "\/nope" not found/);
  });
});
