import { describe, expect, it } from "vitest";
import { extensionOf } from "./file-types.ts";
import { highlight, isKnownLanguage, langFor } from "./highlight.ts";
import { parseSource } from "./markers.ts";

describe("highlight", () => {
  it("tags region lines and puts data-var on the literal token", async () => {
    const parsed = parseSource('// #region config\nconst id = "ID"; // @var clientId\n// #endregion\nrun();');
    const html = await highlight(parsed, "main.js");
    const lines = html.split('<span class="line"');
    expect(lines[1]).toContain('data-line="1"');
    expect(lines[2]).toContain('data-line="2"');
    expect(lines[1]).toContain('data-regions="config"');
    expect(lines[2]).not.toContain("data-regions");
    expect(html).toMatch(/<span[^>]*data-var="clientId"[^>]*>ID<\/span>/);
    expect(html).toContain("--shiki-light:");
    expect(html).toContain("--shiki-dark:");
  });

  it("lists overlapping marker and JSON pointer regions on the same line", async () => {
    const parsed = parseSource('{\n  // #region compiler\n  "compilerOptions": {\n    "strict": true\n  }\n  // #endregion\n}', "code/tsconfig.json", [], ["/compilerOptions/strict"]);
    const lines = (await highlight(parsed, "tsconfig.json")).split('<span class="line"');
    expect(lines[2]).toContain('data-regions="compiler"');
    expect(lines[3]).toContain('data-regions="compiler /compilerOptions/strict"');
    expect(lines[5]).not.toContain("data-regions");
  });

  it.each([
    ["main.js", 'const referrers = ""; // @var referrers'],
    ["geocode.py", "REFERRERS = ''  # @var referrers"],
  ])("gives an empty literal in %s an empty data-var token with the string's colors", async (path, source) => {
    const html = await highlight(parseSource(source, `code/${path}`), path);
    const quote = /<span style="([^"]*)">\s?["']<\/span>/.exec(html);
    expect(quote).not.toBeNull();
    expect(html).toContain(`<span data-var="referrers" style="${quote![1]}"></span>`);
  });

  it("maps extensions to Shiki languages", () => {
    expect(langFor("a/b.MJS")).toBe("javascript");
    expect(langFor("index.html")).toBe("html");
    expect(langFor("setup.sh")).toBe("bash");
    expect(langFor("tutorial.mdx")).toBe("markdown");
    expect(langFor("README")).toBe("text");
  });

  it.each([
    ["geocode.py", "python"],
    ["MainActivity.kt", "kotlin"],
    ["app/build.gradle.kts", "kotlin"],
    ["build.gradle", "groovy"],
    ["ContentView.swift", "swift"],
    ["MainPage.xaml.cs", "csharp"],
    ["MainPage.xaml", "xml"],
    ["Main.java", "java"],
    ["main.cpp", "cpp"],
    ["Main.qml", "qml"],
    ["main.dart", "dart"],
    ["pyproject.toml", "toml"],
    ["query.sql", "sql"],
    ["geocode.http", "http"],
    ["data.geojson", "json"],
    ["setup.ps1", "powershell"],
  ])("highlights %s as %s", (path, lang) => {
    expect(langFor(path)).toBe(lang);
    expect(isKnownLanguage(lang)).toBe(true);
  });

  it("lets frontmatter overrides win over the built-in map", () => {
    expect(langFor("notes.qmd", { qmd: "markdown" })).toBe("markdown");
    expect(langFor("main.js", { js: "text" })).toBe("text");
  });

  it("reads extensions without the dot, ignoring dotfiles", () => {
    expect(extensionOf("a/b/Main.KT")).toBe("kt");
    expect(extensionOf(".env")).toBe("");
    expect(extensionOf("Makefile")).toBe("");
  });

  it("rejects unknown languages", () => {
    expect(isKnownLanguage("snake")).toBe(false);
  });
});
