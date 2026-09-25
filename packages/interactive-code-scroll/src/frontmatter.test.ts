import { describe, expect, it } from "vitest";
import { readTutorialConfig } from "./frontmatter.ts";

describe("readTutorialConfig", () => {
  it("applies defaults", () => {
    expect(readTutorialConfig({})).toEqual({ title: "Tutorial", preview: "both", codeTheme: "dark" });
  });

  it("accepts valid values", () => {
    expect(readTutorialConfig({ title: "OAuth", preview: "iframe", codeTheme: "auto" })).toEqual({
      title: "OAuth",
      preview: "iframe",
      codeTheme: "auto",
    });
  });

  it("rejects invalid values", () => {
    expect(() => readTutorialConfig({ preview: "popup" })).toThrow(/"preview" must be one of off, iframe, tab, both/);
    expect(() => readTutorialConfig({ codeTheme: "blue" })).toThrow(/"codeTheme" must be one of dark, light, auto/);
    expect(() => readTutorialConfig({ title: 3 })).toThrow(/"title" must be a string/);
  });
});
