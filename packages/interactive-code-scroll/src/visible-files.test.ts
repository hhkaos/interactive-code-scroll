import { describe, expect, it } from "vitest";
import { globToRegExp, isBinary, selectVisible } from "./visible-files.ts";

describe("globToRegExp", () => {
  it.each([
    ["*.js", "main.js", true],
    ["*.js", "src/main.js", false],
    ["src/*.kt", "src/Main.kt", true],
    ["src/**/*.kt", "src/Main.kt", true],
    ["src/**/*.kt", "src/a/b/Main.kt", true],
    ["app/**", "app/src/main/Main.kt", true],
    ["file?.txt", "file1.txt", true],
    ["file?.txt", "file10.txt", false],
    ["build.gradle.kts", "build.gradle.kts", true],
    ["build.gradle.kts", "buildxgradlexkts", false],
  ])("%s ~ %s → %s", (pattern, path, expected) => {
    expect(globToRegExp(pattern).test(path)).toBe(expected);
  });
});

describe("selectVisible", () => {
  const paths = ["style.css", "index.html", "src/b.js", "src/a.js", "README.md"];

  it("shows every text file in path order without patterns", () => {
    expect(selectVisible(paths, undefined)).toEqual({
      visible: ["README.md", "index.html", "src/a.js", "src/b.js", "style.css"],
      unmatched: [],
    });
  });

  it("orders tabs by pattern, then path, without duplicates", () => {
    expect(selectVisible(paths, ["index.html", "src/*.js", "*.html", "style.css"])).toEqual({
      visible: ["index.html", "src/a.js", "src/b.js", "style.css"],
      unmatched: [],
    });
  });

  it("reports patterns that match nothing", () => {
    expect(selectVisible(paths, ["index.html", "*.py"]).unmatched).toEqual(["*.py"]);
  });
});

describe("isBinary", () => {
  it("detects binaries by extension or NUL byte", () => {
    expect(isBinary("gradle/wrapper/gradle-wrapper.jar", new Uint8Array([80, 75]))).toBe(true);
    expect(isBinary("data.bin.txt", new Uint8Array([104, 0, 105]))).toBe(true);
    expect(isBinary("main.kt", new TextEncoder().encode("fun main() {}"))).toBe(false);
  });
});
