import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planCli, resolveAstroBin, writeAstroConfig } from "./interactive-code-scroll.mjs";

describe("interactive-code-scroll CLI", () => {
  it("builds a generic Astro dev command for the current tutorial project", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const plan = planCli(["dev", "--port", "4322"], { cwd: root, configPath: join(root, "config.mjs") });

    expect(plan).toMatchObject({ command: "dev", root, tutorial: "tutorial" });
    expect(plan.astroArgs).toEqual(["dev", "--root", root, "--config", "config.mjs", "--port", "4322"]);
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

  it("resolves Astro from the consuming project when installed from a package", () => {
    const root = mkdtempSync(join(tmpdir(), "ics-cli-"));
    const astroBin = join(root, "node_modules", "astro", "bin", "astro.mjs");
    mkdirSync(join(root, "node_modules", "astro", "bin"), { recursive: true });
    writeFileSync(astroBin, "");

    expect(resolveAstroBin(root)).toBe(astroBin);
  });
});
