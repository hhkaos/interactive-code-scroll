import { describe, expect, it } from "vitest";
import { readTutorialConfig } from "./frontmatter.ts";

describe("readTutorialConfig", () => {
  it("applies defaults", () => {
    expect(readTutorialConfig({})).toEqual({ title: "Tutorial", preview: "both", theme: "auto", codeWrap: false });
  });

  it("accepts valid values", () => {
    expect(readTutorialConfig({ title: "OAuth", preview: "iframe", theme: "dark", codeWrap: true })).toEqual({
      title: "OAuth",
      preview: "iframe",
      theme: "dark",
      codeWrap: true,
    });
  });

  it("accepts an optional logo from images/", () => {
    expect(readTutorialConfig({ logo: "logo.png" })).toMatchObject({ logo: "logo.png" });
  });

  it("rejects invalid values", () => {
    expect(() => readTutorialConfig({ preview: "popup" })).toThrow(/"preview" must be one of off, iframe, tab, both/);
    expect(() => readTutorialConfig({ theme: "blue" })).toThrow(/"theme" must be one of auto, light, dark/);
    expect(() => readTutorialConfig({ title: 3 })).toThrow(/"title" must be a string/);
    expect(() => readTutorialConfig({ codeWrap: "yes" })).toThrow(/"codeWrap" must be a boolean/);
    expect(() => readTutorialConfig({ logo: true })).toThrow(/"logo" must be a string/);
  });
});
