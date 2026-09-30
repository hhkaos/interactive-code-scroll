import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  doctor,
  findTutorialCandidates,
  initScripts,
  packageManager,
  planCli,
  preflightMessage,
  resolveAstroBin,
  seriesTutorials,
  validateProject,
  writeAstroConfig,
} from "./interactive-code-scroll.mjs";

describe("interactive-code-scroll CLI", () => {
  it("builds a generic Astro dev command for the current tutorial project", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const plan = planCli(["dev", "--port", "4322"], { cwd: root, configPath: join(root, "config.mjs") });

    expect(plan).toMatchObject({ command: "dev", root, tutorial: "tutorial" });
    expect(plan.astroArgs).toEqual(["dev", "--root", root, "--config", "config.mjs", "--port", "4322"]);
  });

  it("auto-detects a root-level tutorial when the default tutorial folder is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    writeFileSync(join(root, "tutorial.mdx"), "");
    const plan = planCli(["dev"], { cwd: root });

    expect(plan.tutorial).toBe(".");
    expect(plan.tutorialAutoDetected).toBe(true);
  });

  it("auto-detects a series site when tutorials/ holds tutorials and there is no single tutorial", () => {
    const root = seriesRoot(["intro", "_drafts"]);
    const plan = planCli(["dev"], { cwd: root });

    expect(plan).toMatchObject({ tutorials: "tutorials", tutorialsAutoDetected: true, tutorialAutoDetected: false });
    expect(preflightMessage(plan)).toContain("Tutorials: tutorials (1: intro)");
    expect(preflightMessage(plan)).toContain('Detected tutorials/<name>/tutorial.mdx; using --tutorials "tutorials".');
    expect(() => validateProject(plan)).not.toThrow();
  });

  it("prefers a single tutorial over tutorials/ when both exist", () => {
    const withDefault = seriesRoot(["intro"]);
    mkdirSync(join(withDefault, "tutorial"));
    writeFileSync(join(withDefault, "tutorial", "tutorial.mdx"), "");
    expect(planCli(["dev"], { cwd: withDefault })).toMatchObject({ tutorial: "tutorial", tutorials: undefined });

    const withRoot = seriesRoot(["intro"]);
    writeFileSync(join(withRoot, "tutorial.mdx"), "");
    expect(planCli(["dev"], { cwd: withRoot })).toMatchObject({ tutorial: ".", tutorials: undefined });
  });

  it("does not auto-detect a series from ignored or empty folders", () => {
    const root = seriesRoot(["_drafts"]);
    mkdirSync(join(root, "tutorials", "notes"));
    expect(planCli(["dev"], { cwd: root })).toMatchObject({ tutorials: undefined, tutorialsAutoDetected: false });
  });

  it("uses --tutorials for any folder and serves one series tutorial with --tutorial", () => {
    const root = seriesRoot([]);
    mkdirSync(join(root, "guides", "auth"), { recursive: true });
    writeFileSync(join(root, "guides", "auth", "tutorial.mdx"), "");

    const series = planCli(["build", "--tutorials", "guides"], { cwd: root, configPath: join(root, "config.mjs") });
    expect(series).toMatchObject({ tutorials: "guides", tutorialsAutoDetected: false });
    expect(series.astroArgs).toEqual(["build", "--root", root, "--config", "config.mjs"]);
    writeAstroConfig(series);
    expect(readFileSync(join(root, "config.mjs"), "utf8")).toContain('interactiveCodeScroll({ tutorials: "guides" })');

    expect(planCli(["dev", "--tutorial", "guides/auth"], { cwd: root })).toMatchObject({ tutorial: "guides/auth", tutorials: undefined });
  });

  it("rejects --tutorial together with --tutorials", () => {
    expect(() => planCli(["dev", "--tutorial", ".", "--tutorials", "tutorials"])).toThrow(/either --tutorial .* or --tutorials/);
  });

  it("explains an empty series folder", () => {
    const root = seriesRoot(["_drafts"]);
    expect(() => validateProject(planCli(["build", "--tutorials", "tutorials"], { cwd: root }))).toThrow(/tutorials\/<name>\/tutorial\.mdx/);
    expect(seriesTutorials(root, "missing")).toEqual([]);
  });

  it("recommends --tutorials in doctor for a series site", () => {
    const root = seriesRoot(["intro"]);
    expect(doctor(planCli(["doctor"], { cwd: root }))).toMatch(/run dev -- --tutorials tutorials|dev --tutorials tutorials/);
  });

  it("maps serve to Astro preview and keeps generic Astro flags", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const plan = planCli(["serve", "--root", root, "--tutorial", "tutorials/intro", "--base", "/intro/", "--host", "127.0.0.1"]);

    expect(plan.tutorial).toBe("tutorials/intro");
    expect(plan.astroArgs).toEqual([
      "preview",
      "--root",
      root,
      "--config",
      ".interactive-code-scroll/astro.config.mjs",
      "--base",
      "/intro/",
      "--host",
      "127.0.0.1",
    ]);
  });

  it("rejects command-specific flags on the wrong command", () => {
    expect(() => planCli(["dev", "--outDir", "public"])).toThrow("--outDir is only supported with build");
  });

  it("rejects unexpected positional arguments before Astro passthrough", () => {
    expect(() => planCli(["dev", "--tutorial", ".", "intro"])).toThrow(/Unexpected argument: intro/);
  });

  it("writes a topic-agnostic Astro config for the selected tutorial folder", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const configPath = join(root, "generated", "astro.config.mjs");
    writeAstroConfig(planCli(["build", "--tutorial", "tutorials/basics"], { cwd: root, configPath }));

    const config = readFileSync(configPath, "utf8");
    expect(config).toContain('interactiveCodeScroll({ tutorial: "tutorials/basics" })');
    expect(config).not.toMatch(/oauth|arcgis/i);
  });

  it("resolves Astro from the nearest consuming project when installed from a package", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const nested = join(root, "tutorials", "intro");
    const astroBin = join(root, "node_modules", "astro", "bin", "astro.mjs");
    mkdirSync(nested, { recursive: true });
    mkdirSync(join(root, "node_modules", "astro", "bin"), { recursive: true });
    writeFileSync(astroBin, "");

    expect(resolveAstroBin(nested)).toBe(astroBin);
  });

  it("explains how to fix a missing tutorial folder", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    expect(() => validateProject(planCli(["build"], { cwd: root }))).toThrow(/interactive-code-scroll build --tutorial \./);
  });

  it("prints a preflight banner with root and tutorial paths", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    writeFileSync(join(root, "tutorial.mdx"), "");
    const message = preflightMessage(planCli(["dev"], { cwd: root }));

    expect(message).toContain("InteractiveCodeScroll dev server starting...");
    expect(message).toContain(`Root: ${root}`);
    expect(message).toContain("Tutorial: .");
    expect(message).toContain('Detected root-level tutorial.mdx; using --tutorial ".".');
  });

  it("detects tutorial candidates for diagnostics", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    mkdirSync(join(root, "arcgis-js-sdk-user-auth"), { recursive: true });
    writeFileSync(join(root, "arcgis-js-sdk-user-auth", "tutorial.mdx"), "");

    expect(findTutorialCandidates(root)).toEqual(["arcgis-js-sdk-user-auth/tutorial.mdx"]);
    expect(() => validateProject(planCli(["dev"], { cwd: root }))).toThrow(/Detected:\n  arcgis-js-sdk-user-auth\/tutorial\.mdx/);
  });

  it("detects package managers from npm user agent", () => {
    expect(packageManager({ npm_config_user_agent: "pnpm/11.13.1 npm/? node/?" }).name).toBe("pnpm");
    expect(packageManager({ npm_config_user_agent: "yarn/4.0.0 npm/? node/?" }).name).toBe("yarn");
    expect(packageManager({ npm_config_user_agent: "npm/11.0.0 node/?" }).name).toBe("npm");
  });

  it("prints doctor output with tutorial candidates", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    mkdirSync(join(root, "demo"), { recursive: true });
    writeFileSync(join(root, "package.json"), "{}");
    writeFileSync(join(root, "demo", "tutorial.mdx"), "");

    const report = doctor(planCli(["doctor"], { cwd: root }));
    expect(report).toContain("InteractiveCodeScroll doctor");
    expect(report).toContain("package.json: found");
    expect(report).toContain("✓ demo/tutorial.mdx");
  });

  it("suggests package scripts without writing by default", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));

    const report = initScripts(planCli(["init-scripts"], { cwd: root }));
    expect(report).toContain('"ics:dev": "interactive-code-scroll dev"');
    expect(readFileSync(join(root, "package.json"), "utf8")).toContain('"dev":"vite"');
  });

  it("writes non-conflicting package scripts with --write", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    writeFileSync(join(root, "package.json"), "{}");

    initScripts(planCli(["init-scripts", "--write"], { cwd: root }));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts.dev).toBe("interactive-code-scroll dev");
    expect(pkg.scripts.build).toBe("interactive-code-scroll build");
  });

  it("writes prefixed scripts when standard script names already exist", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));

    initScripts(planCli(["init-scripts", "--write"], { cwd: root }));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts["ics:dev"]).toBe("interactive-code-scroll dev");
    expect(pkg.scripts["ics:build"]).toBe("interactive-code-scroll build");
  });
});

/** Temporary project with `tutorials/<name>/tutorial.mdx` for each name. */
function seriesRoot(names) {
  const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
  mkdirSync(join(root, "tutorials"));
  for (const name of names) {
    mkdirSync(join(root, "tutorials", name));
    writeFileSync(join(root, "tutorials", name, "tutorial.mdx"), "");
  }
  return root;
}
