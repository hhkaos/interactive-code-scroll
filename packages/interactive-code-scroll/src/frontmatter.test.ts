import { describe, expect, it } from "vitest";
import { FrontmatterError, frontmatterKeyLines, isRemoteLogo, logoUrl, readIndexConfig, readTagGroups, readTutorialConfig } from "./frontmatter.ts";

describe("readTutorialConfig", () => {
  it("applies defaults", () => {
    expect(readTutorialConfig({})).toEqual({
      title: "Tutorial",
      preview: "both",
      theme: "auto",
      codeWrap: false,
      languages: {},
      otherVariantSteps: "notice",
      tags: [],
      completion: true,
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
      tags: [],
      completion: true,
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

  it("accepts an include list (also with variants) and rejects other shapes", () => {
    expect(readTutorialConfig({ include: [".github/**"] })).toMatchObject({ include: [".github/**"] });
    expect(readTutorialConfig({})).not.toHaveProperty("include");
    for (const include of [".github/**", [], [""], [3]]) {
      expect(() => readTutorialConfig({ include })).toThrow(/"include" must be a non-empty list of paths or globs relative to code\//);
    }
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

    it("accepts an optional logo per variant, local or remote", () => {
      const variants = [
        { ...curl, logo: "curl.svg" },
        { ...python, logo: "https://example.com/python.png" },
      ];
      expect(readTutorialConfig({ variants }).variants!.map((v) => v.logo)).toEqual(["curl.svg", "https://example.com/python.png"]);
      expect(readTutorialConfig({ variants: [curl] }).variants![0]).not.toHaveProperty("logo");
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
      [[{ ...curl, logo: true }], /"variants\[0\]"\.logo must be a string/],
      [[curl, { ...python, logo: ["a.svg"] }], /"variants\[1\]"\.logo must be a string/],
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

describe("series metadata", () => {
  it("reads description, tags, level, duration and order", () => {
    expect(
      readTutorialConfig({ description: "Geocode an address.", tags: ["REST", " Python", "REST"], level: "Beginner", duration: "20 min", order: 2 }),
    ).toMatchObject({ description: "Geocode an address.", tags: ["REST", "Python"], level: "Beginner", duration: "20 min", order: 2 });
  });

  it("rejects invalid metadata with the key", () => {
    const keyOf = (frontmatter: Record<string, unknown>) => {
      try {
        readTutorialConfig(frontmatter);
      } catch (error) {
        return (error as FrontmatterError).key;
      }
    };
    expect(keyOf({ description: "" })).toBe("description");
    expect(keyOf({ tags: "REST" })).toBe("tags");
    expect(keyOf({ tags: ["a, b"] })).toBe("tags");
    expect(keyOf({ level: 1 })).toBe("level");
    expect(keyOf({ duration: [] })).toBe("duration");
    expect(keyOf({ order: "1" })).toBe("order");
  });

  it("reads family and familyLabel together", () => {
    expect(readTutorialConfig({ family: "display-map", familyLabel: "Python" }).family).toEqual({ id: "display-map", label: "Python" });
    expect(readTutorialConfig({}).family).toBeUndefined();
    const keyOf = (frontmatter: Record<string, unknown>) => {
      try {
        readTutorialConfig(frontmatter);
      } catch (error) {
        return (error as FrontmatterError).key;
      }
    };
    expect(keyOf({ family: "display-map" })).toBe("family");
    expect(keyOf({ familyLabel: "Python" })).toBe("familyLabel");
    expect(keyOf({ family: "", familyLabel: "Python" })).toBe("family");
    expect(keyOf({ family: "display-map", familyLabel: 3 })).toBe("familyLabel");
  });
});

describe("completion panel", () => {
  const keyOf = (frontmatter: Record<string, unknown>) => {
    try {
      readTutorialConfig(frontmatter);
    } catch (error) {
      return (error as FrontmatterError).key;
    }
  };

  it("reads completion, next and feedbackUrl", () => {
    expect(readTutorialConfig({ completion: false, next: "display-map-js", feedbackUrl: "https://github.com/o/r/issues/new?title={title}" })).toMatchObject({
      completion: false,
      next: "display-map-js",
      feedbackUrl: "https://github.com/o/r/issues/new?title={title}",
    });
    expect(readTutorialConfig({ next: false }).next).toBe(false);
    expect(readTutorialConfig({ feedbackUrl: "mailto:docs@example.com" }).feedbackUrl).toBe("mailto:docs@example.com");
    expect(readTutorialConfig({})).not.toHaveProperty("next");
  });

  it("rejects invalid values with the key", () => {
    expect(keyOf({ completion: "no" })).toBe("completion");
    expect(keyOf({ next: true })).toBe("next");
    expect(keyOf({ next: "Display Map" })).toBe("next");
    expect(keyOf({ feedbackUrl: "http://example.com" })).toBe("feedbackUrl");
    expect(keyOf({ feedbackUrl: "javascript:alert(1)" })).toBe("feedbackUrl");
    expect(keyOf({ presentationUrl: "mailto:a@b.c" })).toBe("presentationUrl");
  });

  it("reads presentationUrl (http or https), also as the index.mdx default", () => {
    expect(readTutorialConfig({ presentationUrl: "https://owner.github.io/t/{slug}/" }).presentationUrl).toBe("https://owner.github.io/t/{slug}/");
    expect(readTutorialConfig({ presentationUrl: "http://192.168.1.20:4321/" }).presentationUrl).toBe("http://192.168.1.20:4321/");
    expect(readIndexConfig({ presentationUrl: "https://example.com/{slug}/" }).presentationUrl).toBe("https://example.com/{slug}/");
  });

  it("reads the series default feedbackUrl in index.mdx", () => {
    expect(readIndexConfig({ feedbackUrl: "https://example.com/feedback?t={slug}" }).feedbackUrl).toBe("https://example.com/feedback?t={slug}");
    expect(() => readIndexConfig({ feedbackUrl: "ftp://x" })).toThrow(/"feedbackUrl" must be an https:\/\/ or mailto: URL/);
  });
});

describe("readIndexConfig", () => {
  it("applies defaults and reads the index fields", () => {
    expect(readIndexConfig({})).toEqual({ title: "Tutorials", theme: "auto" });
    expect(readIndexConfig({ title: "ArcGIS", description: "All SDKs.", logo: "logo.svg", theme: "dark" })).toEqual({
      title: "ArcGIS",
      description: "All SDKs.",
      logo: "logo.svg",
      theme: "dark",
    });
  });

  it("rejects tutorial-only and invalid fields", () => {
    expect(() => readIndexConfig({ preview: "off" })).toThrow(/"preview" is not an index\.mdx field/);
    expect(() => readIndexConfig({ title: "" })).toThrow(/"title" must be a non-empty string/);
    expect(() => readIndexConfig({ theme: "blue" })).toThrow(/"theme" must be one of/);
  });

  it("reads tagGroups in order and rejects bad shapes and shared tags", () => {
    expect(readIndexConfig({ tagGroups: { Language: ["Python", " JavaScript", "Python"], Auth: ["OAuth"] } }).tagGroups).toEqual([
      { name: "Language", tags: ["Python", "JavaScript"] },
      { name: "Auth", tags: ["OAuth"] },
    ]);
    expect(() => readIndexConfig({ tagGroups: ["Python"] })).toThrow(/"tagGroups" must map each family name to a list of tags/);
    expect(() => readIndexConfig({ tagGroups: { Language: "Python" } })).toThrow(/family "Language" must be a list of non-empty tags \(or \{ name, logo \}\) without commas/);
    expect(() => readIndexConfig({ tagGroups: { Language: ["a, b"] } })).toThrow(/without commas/);
    expect(() => readIndexConfig({ tagGroups: { Language: [] } })).toThrow(/family "Language" has no tags/);
    expect(() => readIndexConfig({ tagGroups: { " ": ["Python"] } })).toThrow(/family names must be non-empty/);
    expect(() => readIndexConfig({ tagGroups: { Language: ["Python"], Data: ["Python"] } })).toThrow(
      /tag "Python" is in two families \("Language" and "Data"\)/,
    );
    try {
      readIndexConfig({ tagGroups: { Language: [] } });
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      expect((error as FrontmatterError).key).toBe("tagGroups");
    }
  });

  it("reads tagGroups entries with a logo and rejects bad ones", () => {
    const tagGroups = { Language: [{ name: " Python", logo: "python.svg" }, "Go", { name: "cURL" }] };
    expect(readIndexConfig({ tagGroups }).tagGroups).toEqual([{ name: "Language", tags: ["Python", "Go", "cURL"], logos: { Python: "python.svg" } }]);
    expect(() => readIndexConfig({ tagGroups: { Language: [{ logo: "x.svg" }] } })).toThrow(/family "Language": a tag object needs a "name"/);
    expect(() => readIndexConfig({ tagGroups: { Language: [{ name: "Go", icon: "x" }] } })).toThrow(/unknown tag field "icon" \(use name, logo\)/);
    expect(() => readIndexConfig({ tagGroups: { Language: [{ name: "Go", logo: 3 }] } })).toThrow(/tag "Go": "logo" must be a non-empty string/);
  });

  it("refuses tagGroups logos when told to (custom index pages)", () => {
    expect(readTagGroups({ Language: ["Go"] }, { withLogos: false })).toEqual([{ name: "Language", tags: ["Go"] }]);
    expect(() => readTagGroups({ Language: [{ name: "Go", logo: "go.svg" }] }, { withLogos: false })).toThrow(
      /family "Language": tag logos are set in index.mdx only/,
    );
  });
});

describe("logo", () => {
  it("uses https URLs as is and resolves other values in images/", () => {
    expect(isRemoteLogo("https://example.com/logo.png")).toBe(true);
    expect(isRemoteLogo("http://example.com/logo.png")).toBe(false);
    expect(isRemoteLogo("logo.png")).toBe(false);
    expect(logoUrl("https://example.com/logo.png", {})).toBe("https://example.com/logo.png");
    expect(logoUrl("logo.png", { "logo.png": "/_astro/logo.123.png" })).toBe("/_astro/logo.123.png");
    expect(logoUrl(undefined, {})).toBeUndefined();
  });
});
