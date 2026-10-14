import { describe, expect, it } from "vitest";
import { normalizeOptions, parseStaticLiteral, resolveOptions } from "./field-options.ts";

describe("parseStaticLiteral", () => {
  it("reads arrays, objects, strings, numbers and booleans", () => {
    expect(parseStaticLiteral(`[{ value: "https://www.arcgis.com", label: 'ArcGIS Online' }, "b", 3, true,]`)).toEqual([
      { value: "https://www.arcgis.com", label: "ArcGIS Online" },
      "b",
      3,
      true,
    ]);
    expect(parseStaticLiteral(`{ "quoted key": "a\\"b" }`)).toEqual({ "quoted key": 'a"b' });
  });

  it.each(["[portals]", "[`a`]", "[f()]", '["a"] + x', '["a"'])("rejects %s", (expression) => {
    expect(parseStaticLiteral(expression)).toBeUndefined();
  });
});

describe("normalizeOptions", () => {
  it("turns strings, numbers and { value, label } into options", () => {
    expect(normalizeOptions(["a", 2, { value: "c", label: "C" }, { value: 4 }])).toEqual([
      { value: "a", label: "a" },
      { value: "2", label: "2" },
      { value: "c", label: "C" },
      { value: "4", label: "4" },
    ]);
  });

  it.each([
    [[], "must be a non-empty array"],
    ["a", "must be a non-empty array"],
    [["a", true], "item 1 must be a string, a number or { value, label }"],
    [[{ value: "a", extra: 1 }], "item 0 must be a string, a number or { value, label }"],
    [["a", { value: "a" }], 'value "a" is listed twice'],
  ])("rejects %j", (raw, message) => {
    expect(normalizeOptions(raw)).toBe(message);
  });
});

describe("resolveOptions", () => {
  const files = [
    { path: "portals.json", source: '[{ "value": "https://www.arcgis.com", "label": "ArcGIS Online" }]' },
    { path: "broken.json", source: "[1," },
  ];

  it("reads a file from field-options/", () => {
    expect(resolveOptions("portals.json", files)).toEqual([{ value: "https://www.arcgis.com", label: "ArcGIS Online" }]);
    expect(resolveOptions(["a"], files)).toEqual([{ value: "a", label: "a" }]);
  });

  it("explains file problems", () => {
    expect(resolveOptions("nope.json", files)).toBe('options file "nope.json" not found in field-options/');
    expect(resolveOptions("portals.yaml", files)).toBe('options file "portals.yaml" must be a .json file in field-options/');
    expect(resolveOptions("broken.json", files)).toMatch(/^options file field-options\/broken\.json is not valid JSON/);
  });
});
