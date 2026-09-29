import { describe, expect, it } from "vitest";
import { FrontmatterError, frontmatterKeyLines, readTutorialConfig } from "./frontmatter.ts";

describe("readTutorialConfig", () => {
  it("applies defaults", () => {
    expect(readTutorialConfig({})).toEqual({ title: "Tutorial", preview: "both", theme: "auto", codeWrap: false, languages: {} });
  });

  it("accepts valid values", () => {
    expect(readTutorialConfig({ title: "OAuth", preview: "iframe", theme: "dark", codeWrap: true })).toEqual({
      title: "OAuth",
      preview: "iframe",
      theme: "dark",
      codeWrap: true,
      languages: {},
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

  it("accepts language overrides by extension", () => {
    expect(readTutorialConfig({ languages: { qmd: "markdown", conf: "text" } })).toMatchObject({
      languages: { qmd: "markdown", conf: "text" },
    });
  });

  it("rejects invalid language overrides", () => {
    expect(() => readTutorialConfig({ languages: ["py"] })).toThrow(/"languages" must map file extensions/);
    expect(() => readTutorialConfig({ languages: { ".py": "python" } })).toThrow(/key "\.py" must be a lowercase file extension/);
    expect(() => readTutorialConfig({ languages: { py: "snake" } })).toThrow(/"languages\.py" must be a Shiki language id/);
  });

  it("names the invalid key", () => {
    const error = (() => {
      try {
        readTutorialConfig({ theme: "blue" });
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(FrontmatterError);
    expect(error).toMatchObject({ key: "theme", detail: '"theme" must be one of auto, light, dark (got "blue")' });
  });
});

describe("frontmatterKeyLines", () => {
  it("maps top-level keys to their 1-based lines", () => {
    expect(frontmatterKeyLines("---\ntitle: T\n  nested: x\npreview: off\n---\n\nlogo: not-frontmatter\n")).toEqual({
      title: 2,
      preview: 4,
    });
  });

  it("is empty without a leading frontmatter block", () => {
    expect(frontmatterKeyLines("# Title\ntitle: x\n")).toEqual({});
  });
});
