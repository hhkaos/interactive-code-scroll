import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gitignoreParents, inGeneratedDir, listCode, listFiles } from "./tutorial-files.ts";

let dir: string;
const write = (path: string, text = "x") => {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), text);
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

  it("ignores nothing without a .gitignore", () => {
    expect(listCode(dir, []).ignored).toEqual([]);
  });
});

describe("listCode with .gitignore", () => {
  // Tutorial layout: <dir>/tutorial/code, so `by` is relative to <dir>/tutorial.
  let code: string;
  const add = (path: string, text = "x") => write(`tutorial/code/${path}`, text);
  beforeEach(() => {
    code = join(dir, "tutorial", "code");
    for (const path of ["main.py", "state.json", "output.csv", "build/app.js", "build/keep.js", "data/sample.json", "data/real.json", "src/token.json", "src/app.py"]) add(path);
  });

  it("leaves out ignored files and folders, with the .gitignore that excludes them", () => {
    add(".gitignore", "# local state\n\nstate.json\n*.csv\nbuild/\n");
    const { paths, ignored } = listCode(code, []);
    expect(paths).toEqual(["data/real.json", "data/sample.json", "main.py", "src/app.py", "src/token.json"]);
    expect(ignored).toEqual([
      { path: "build/app.js", by: "code/.gitignore" },
      { path: "build/keep.js", by: "code/.gitignore" },
      { path: "output.csv", by: "code/.gitignore" },
      { path: "state.json", by: "code/.gitignore" },
    ]);
  });

  it("applies negation, anchored and ** patterns, but cannot re-include a file inside an ignored folder", () => {
    add(".gitignore", "*.json\n!sample.json\n/src/app.py\nbuild/\n!build/keep.js\n**/real.json\n");
    expect(listCode(code, []).paths).toEqual(["data/sample.json", "main.py", "output.csv"]);
  });

  it("anchors a pattern with a slash to its own folder", () => {
    add(".gitignore", "/state.json\n");
    add("src/state.json");
    expect(listCode(code, []).paths).toContain("src/state.json");
    expect(listCode(code, []).paths).not.toContain("state.json");
  });

  it("lets a nested .gitignore add rules and override its parents", () => {
    add(".gitignore", "*.json\n");
    add("data/.gitignore", "!sample.json\n");
    add("src/.gitignore", "app.py\n");
    const { paths, ignored } = listCode(code, []);
    expect(paths).toEqual(["build/app.js", "build/keep.js", "data/sample.json", "main.py", "output.csv"]);
    expect(ignored.find((p) => p.path === "src/app.py")).toEqual({ path: "src/app.py", by: "code/src/.gitignore" });
  });

  it("applies .gitignore files above code/, with paths relative to their folder", () => {
    write("tutorial/.gitignore", "code/state.json\n");
    write(".gitignore", "*.csv\n");
    const { paths, ignored } = listCode(code, [], [dir, join(dir, "tutorial")]);
    expect(paths).not.toContain("state.json");
    expect(paths).not.toContain("output.csv");
    expect(ignored).toEqual([
      { path: "output.csv", by: "../.gitignore" },
      { path: "state.json", by: ".gitignore" },
    ]);
  });

  it("skips a parent .gitignore that ignores the tutorial folder itself", () => {
    write(".gitignore", "tutorial/\n*.csv\n");
    expect(listCode(code, [], [dir, join(dir, "tutorial")]).ignored).toEqual([]);
  });

  it("publishes gitignored paths that include matches, and keeps reporting them as ignored", () => {
    add(".gitignore", "state.json\n.env\n");
    add(".env");
    add(".env.example");
    const { paths, ignored } = listCode(code, ["state.json", ".env.example"]);
    expect(paths).toEqual([".env.example", "build/app.js", "build/keep.js", "data/real.json", "data/sample.json", "main.py", "output.csv", "src/app.py", "src/token.json", "state.json"]);
    expect(ignored.map((p) => p.path)).toEqual([".env", "state.json"]);
  });

  it("does not report a dot folder that .gitignore excludes", () => {
    add(".gitignore", ".cache-tool/\n");
    add(".cache-tool/data.bin");
    add(".tool/config.json");
    expect(listCode(code, []).skippedDirs).toEqual([".tool"]);
  });

  it("is case-sensitive, like git on Linux", () => {
    add(".gitignore", "STATE.json\n");
    expect(listCode(code, []).paths).toContain("state.json");
  });
});

describe("gitignoreParents", () => {
  // `dir` itself holds `.git/HEAD` (a generated-folder case above): use a clean folder inside it.
  let root: string;
  beforeEach(() => {
    root = join(dir, "clean");
    mkdirSync(join(root, "tutorials", "alpha"), { recursive: true });
  });

  it("goes up to the git repository root", () => {
    mkdirSync(join(root, ".git"));
    expect(gitignoreParents(join(root, "tutorials", "alpha"))).toEqual([root, join(root, "tutorials"), join(root, "tutorials", "alpha")]);
  });

  it("stops at the tutorial folder outside a repository", () => {
    rmSync(join(dir, ".git"), { recursive: true });
    expect(gitignoreParents(join(root, "tutorials", "alpha"))).toEqual([join(root, "tutorials", "alpha")]);
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
