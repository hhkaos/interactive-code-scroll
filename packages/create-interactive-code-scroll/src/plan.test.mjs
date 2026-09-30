import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nextSteps } from "./next-steps.mjs";
import { complete, defaults } from "./options.mjs";
import { detectPackageManager } from "./package-manager.mjs";
import { pagesWorkflow, planProject } from "./plan.mjs";
import { ASTRO_VERSION, VERSION } from "./versions.mjs";

const versions = { version: "1.2.3", astro: "^7.3.5", pnpm: "11.13.1" };
/** @param {Partial<import("./options.mjs").Answers>} answers */
const plan = (answers) => planProject(complete({ dir: "my-docs", ...answers }, defaults("npm")), versions);
const paths = (/** @type {Map<string, string>} */ files) => [...files.keys()].filter((path) => !/^(package\.json|\.gitignore|README\.md)$/.test(path)).sort();

describe("planProject", () => {
  it("writes a single web tutorial with a Preview and the Pages workflow", () => {
    const files = plan({ layout: "single", type: "web", pages: true });
    expect(paths(files)).toEqual([
      ".github/workflows/pages.yml",
      "tutorial/code/index.html",
      "tutorial/code/main.js",
      "tutorial/code/style.css",
      "tutorial/tutorial.mdx",
    ]);
    const mdx = files.get("tutorial/tutorial.mdx");
    expect(mdx).toMatch(/^---\ntitle: My docs\n.*\npreview: both\n---\n/s);
    expect(mdx).toContain('<Step id="config" file="main.js" region="config">');
    expect(mdx).not.toContain("tags:");
    expect(files.get(".github/workflows/pages.yml")).toBe(pagesWorkflow("npm"));
    expect(JSON.parse(files.get("package.json") ?? "")).toEqual({
      name: "my-docs",
      private: true,
      type: "module",
      scripts: { dev: "interactive-code-scroll dev", build: "interactive-code-scroll build", serve: "interactive-code-scroll serve" },
      devDependencies: { astro: "^7.3.5", "interactive-code-scroll": "^1.2.3" },
    });
  });

  it("puts several languages of one tutorial in variants, sharing requests and outputs", () => {
    const files = plan({ layout: "single", type: "rest", langs: ["curl", "python"], pages: false });
    expect(paths(files)).toEqual([
      "tutorial/code/curl/list-items.sh",
      "tutorial/code/python/list_items.py",
      "tutorial/output/items.json",
      "tutorial/requests/items.http",
      "tutorial/tutorial.mdx",
    ]);
    const mdx = files.get("tutorial/tutorial.mdx");
    expect(mdx).toContain("variants:\n  - { id: curl, label: cURL, dir: curl, entry: list-items.sh }\n  - { id: python, label: Python, dir: python, entry: list_items.py }\n");
    expect(mdx).toContain('<Step id="request" region="request" output="items.json" request="list-items">');
    expect(mdx).toContain("preview: off");
  });

  it("writes one tutorial per name and language for sibling tutorials, with series metadata", () => {
    const files = plan({ layout: "series", tutorials: ["intro", "next"], type: "native", langs: ["kotlin", "csharp"], languagesAs: "siblings", pages: false });
    expect(paths(files).filter((path) => path.endsWith(".mdx"))).toEqual([
      "tutorials/intro-csharp/tutorial.mdx",
      "tutorials/intro-kotlin/tutorial.mdx",
      "tutorials/next-csharp/tutorial.mdx",
      "tutorials/next-kotlin/tutorial.mdx",
    ]);
    expect(files.get("tutorials/next-csharp/tutorial.mdx")).toContain(
      '---\ntitle: "Next (C#)"\ndescription: An app that prints a greeting.\ntags: [Native app, "C#"]\nlevel: Beginner\nduration: 10 min\norder: 2\nfamily: next\nfamilyLabel: "C#"\npreview: off\n---',
    );
    expect(files.get("tutorials/intro-csharp/code/Program.cs")).toContain("#region config");
  });

  it("adds the chosen index page and wires a custom one into the scripts", () => {
    expect(plan({ layout: "series", index: "mdx" }).get("tutorials/index.mdx")).toContain("<TutorialList />");
    const custom = plan({ layout: "series", index: "custom" });
    expect(custom.get("site/index.astro")).toContain('from "interactive-code-scroll/series"');
    expect(JSON.parse(custom.get("package.json") ?? "").scripts).toEqual({
      dev: "interactive-code-scroll dev --index site/index.astro",
      build: "interactive-code-scroll build --index site/index.astro",
      serve: "interactive-code-scroll serve",
    });
    expect(plan({ layout: "series", index: "default" }).has("tutorials/index.mdx")).toBe(false);
  });

  it("sets up pnpm with packageManager, esbuild builds and the pnpm workflow", () => {
    const files = plan({ pm: "pnpm", pages: true });
    expect(JSON.parse(files.get("package.json") ?? "").packageManager).toBe("pnpm@11.13.1");
    expect(files.get("pnpm-workspace.yaml")).toBe("allowBuilds:\n  esbuild: true\n");
    expect(files.get(".github/workflows/pages.yml")).toBe(pagesWorkflow("pnpm"));
    expect(plan({ pm: "npm" }).has("pnpm-workspace.yaml")).toBe(false);
  });
});

describe("nextSteps", () => {
  it("lists the commands, the install when skipped and the Pages setup", () => {
    const answers = complete({ dir: "docs", layout: "series", tutorials: ["intro"], pm: "pnpm", pages: true }, defaults("npm"));
    expect(nextSteps(answers, { installed: false, gitInitialized: true })).toEqual([
      "cd docs",
      "pnpm install",
      "pnpm dev   # open the printed URL; edits reload live",
      "pnpm exec interactive-code-scroll doctor   # if something does not start",
      "",
      "Edit tutorials/<name>/tutorial.mdx and its code/ folder (1 tutorial).",
      "",
      "Publish on GitHub Pages:",
      "  1. Create a GitHub repository and push this folder to main.",
      "  2. Settings -> Pages -> Source: GitHub Actions.",
      "  3. Every push to main publishes https://<owner>.github.io/<repo>/",
      "     (the index; each tutorial below it, e.g. /<repo>/intro/)",
    ]);
    const single = complete({ dir: "docs", pages: false }, defaults("npm"));
    expect(nextSteps(single, { installed: true, gitInitialized: false })).toEqual([
      "cd docs",
      "npm run dev   # open the printed URL; edits reload live",
      "npx interactive-code-scroll doctor   # if something does not start",
      "",
      "Edit tutorial/tutorial.mdx and the files in tutorial/code/.",
    ]);
  });
});

it("detects the launching package manager", () => {
  expect(detectPackageManager({ npm_config_user_agent: "pnpm/11.13.1 npm/? node/v24.1.0 darwin arm64" })).toEqual({ pm: "pnpm", pnpm: "11.13.1" });
  expect(detectPackageManager({ npm_config_user_agent: "npm/11.0.0 node/v24.1.0" })).toEqual({ pm: "npm" });
  expect(detectPackageManager({})).toEqual({ pm: "npm" });
});

it("moves in lockstep with the core package and its Astro peer range", () => {
  const core = JSON.parse(readFileSync(new URL("../../interactive-code-scroll/package.json", import.meta.url), "utf8"));
  expect(VERSION).toBe(core.version);
  expect(ASTRO_VERSION).toBe(core.peerDependencies.astro);
});
