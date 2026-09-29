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
