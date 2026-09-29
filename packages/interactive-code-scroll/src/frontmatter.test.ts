import { describe, expect, it } from "vitest";
import { FrontmatterError, frontmatterKeyLines, readTutorialConfig } from "./frontmatter.ts";

describe("readTutorialConfig", () => {
  it("applies defaults", () => {
    expect(readTutorialConfig({})).toEqual({
      title: "Tutorial",
      preview: "both",
      theme: "auto",
      codeWrap: false,
      languages: {},
      otherVariantSteps: "notice",
    });
  });

  it("accepts valid values", () => {
    expect(readTutorialConfig({ title: "OAuth", preview: "iframe", theme: "dark", codeWrap: true })).toEqual({
      title: "OAuth",
      preview: "iframe",
      theme: "dark",
      codeWrap: true,
      languages: {},
      otherVariantSteps: "notice",
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

  it("accepts a files list and rejects other shapes", () => {
    expect(readTutorialConfig({ files: ["index.html", "src/*.js"] })).toMatchObject({ files: ["index.html", "src/*.js"] });
    expect(readTutorialConfig({})).not.toHaveProperty("files");
    for (const files of ["main.js", [], [""], [3]]) {
      expect(() => readTutorialConfig({ files })).toThrow(/"files" must be a non-empty list/);
    }
  });

  describe("variants", () => {
    const python = { id: "python", label: "Python", dir: "./python/", entry: "geocode.py", files: ["*.py"] };
    const curl = { id: "curl", label: "cURL", dir: "curl", entry: "geocode.sh" };

    it("accepts variants and normalizes folders", () => {
      expect(readTutorialConfig({ variants: [python, curl], otherVariantSteps: "hide" })).toMatchObject({
        variants: [
          { id: "python", label: "Python", dir: "python", entry: "geocode.py", files: ["*.py"] },
          { id: "curl", label: "cURL", dir: "curl", entry: "geocode.sh" },
        ],
        otherVariantSteps: "hide",
      });
      expect(readTutorialConfig({ variants: [curl] }).variants![0]).not.toHaveProperty("files");
    });

    it.each([
      ["python", /"variants" must be a non-empty list/],
      [[], /"variants" must be a non-empty list/],
      [["python"], /"variants\[0\]" must be an object/],
      [[{ ...curl, id: "Py" }], /"variants\[0\]"\.id must be lowercase/],
      [[{ ...curl, label: " " }], /"variants\[0\]"\.label must be a non-empty string/],
      [[{ ...curl, dir: "../curl" }], /"variants\[0\]"\.dir must be a folder relative to code/],
      [[{ ...curl, dir: "/curl" }], /"variants\[0\]"\.dir must be a folder relative to code/],
      [[{ ...curl, entry: 3 }], /"variants\[0\]"\.entry must be a file path/],
      [[{ ...curl, files: [] }], /"variants\[0\]"\.files must be a non-empty list of paths or globs relative to code\/curl\//],
      [[curl, { ...python, id: "curl" }], /id "curl" is used twice/],
      [[curl, { ...python, dir: "curl/py" }], /folders must not overlap: "curl" \(curl\) and "curl\/py" \(python\)/],
    ])("rejects %j", (variants, message) => {
      expect(() => readTutorialConfig({ variants })).toThrow(message);
    });

    it("reports variant errors under the variants key", () => {
      expect(() => readTutorialConfig({ variants: [] })).toThrow(expect.objectContaining({ key: "variants" }));
    });

    it("rejects top-level files with variants", () => {
      expect(() => readTutorialConfig({ variants: [curl], files: ["*.sh"] })).toThrow(
        expect.objectContaining({ key: "files", detail: '"files" cannot be used with "variants"; set "files" on each variant instead' }),
      );
    });

    it("rejects an unknown otherVariantSteps", () => {
      expect(() => readTutorialConfig({ otherVariantSteps: "skip" })).toThrow(/"otherVariantSteps" must be one of notice, hide/);
    });
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
