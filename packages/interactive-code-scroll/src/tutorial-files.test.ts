import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inGeneratedDir, listCode, listFiles } from "./tutorial-files.ts";

let dir: string;
const write = (path: string) => {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), "x");
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ics-files-"));
  for (const path of [
    "main.js",
    "src/app.js",
    ".env",
    "src/.eslintrc",
    ".github/workflows/deploy.yml",
    ".github/dependabot.yml",
    ".vscode/settings.json",
    "src/.hidden/nested/leak.js",
    "node_modules/pkg/index.js",
    "src/__pycache__/app.pyc",
    ".git/HEAD",
    ".venv/pyvenv.cfg",
    ".venv/lib/site.py",
    "env/pyvenv.cfg",
    "env/lib/site.py",
  ]) {
    write(path);
  }
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("listFiles", () => {
  it("leaves out every path with a segment starting with \".\" and generated folders", () => {
    expect(listFiles(dir)).toEqual(["main.js", "src/app.js"]);
  });

  it("returns nothing for a missing folder", () => {
    expect(listFiles(join(dir, "missing"))).toEqual([]);
  });
});

describe("listCode", () => {
  it("opts in hidden paths matched by include and reports dot folders with nothing included", () => {
    const { paths, hidden, skippedDirs } = listCode(dir, [".github/workflows/*.yml", ".env"]);
    expect(paths).toEqual([".env", ".github/workflows/deploy.yml", "main.js", "src/app.js"]);
    expect(hidden).toEqual([".env", ".github/dependabot.yml", ".github/workflows/deploy.yml", ".vscode/settings.json", "src/.eslintrc", "src/.hidden/nested/leak.js"]);
    // .github has an included file; dotfiles are not reported; generated folders are never read.
    expect(skippedDirs).toEqual([".vscode", "src/.hidden"]);
  });

  it("cannot opt in generated folders", () => {
    expect(listCode(dir, ["node_modules/**", ".git/**", "env/**", ".venv/**"]).paths).toEqual(["main.js", "src/app.js"]);
  });
});

describe("inGeneratedDir", () => {
  it.each([
    ["node_modules/pkg/index.js", true],
    ["src/__pycache__/app.pyc", true],
    ["env/lib/site.py", true],
    [".git/HEAD", true],
    [".github/workflows/deploy.yml", false],
    ["src/app.js", false],
  ])("%s → %s", (path, expected) => {
    expect(inGeneratedDir(dir, path)).toBe(expected);
  });
});
