import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planCli, preflightMessage, resolveAstroBin, validateProject, writeAstroConfig } from "./interactive-code-scroll.mjs";

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
    expect(() => validateProject(planCli(["build"], { cwd: root }))).toThrow(/pnpm exec interactive-code-scroll build --tutorial \./);
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
});
